import express from 'express';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import { createModuleLogger } from '../../../kernel/logger.js';

export function createLegacyComfyGenerationRouter({
  workflowRegistry,
  comfyProcessController,
  comfyClient,
  saveMediaToFile,
  fetchImpl = fetch,
  logger = createModuleLogger('local-runtime'),
}) {
  const router = express.Router();

  // ComfyUI Generation Routes (Unified)
  router.post('/api/comfy/:workflowType', async (req, res) => {
    const { workflowType } = req.params;
    const config = workflowRegistry[workflowType];

    if (!config) {
      return res.status(404).json({ error: `Workflow type '${workflowType}' not found` });
    }

    try {
      const { imageUrl, projectId, ...params } = req.body;

      logger.info('ComfyUI workflow started', { workflowType, projectId });

      // 0. 兜底：本机 ComfyUI 未运行且用户已开启自动启动时先拉起。
      //    未开启自动启动会返回 disabled，保持既有行为不变。
      const launch = await comfyProcessController.ensureReady();
      if (launch.status === 'failed') {
        return res.status(409).json({
          error: launch.message || '本机 ComfyUI 未就绪。',
          code: launch.diagnosticCode,
          actions: launch.actions,
        });
      }

      // 1. Prepare workflow with registry handler
      const workflow = await config.handler(comfyClient, {
        imageUrl,
        ...params,
      });

      // 2. Queue prompt and wait for result
      let resultUrl = await comfyClient.queuePrompt(
        workflow,
        config.timeout || 600000,
        config.outputNodeId,
      );

      if (!resultUrl) {
        throw new PluginError(ERRORS.providerRequest, `ComfyUI failed to return a valid result for ${workflowType}`, { context: { moduleId: 'local-runtime', workflowType } });
      }

      // 3. If projectId is provided, save the result to project's media folder
      if (projectId && resultUrl.startsWith('http')) {
        try {
          logger.info('Downloading ComfyUI result', { workflowType, projectId });
          const response = await fetchImpl(resultUrl);
          if (!response.ok) throw new PluginError(ERRORS.providerRequest, 'Failed to download ComfyUI result', { status: response.status, context: { moduleId: 'local-runtime', workflowType, projectId } });

          const contentType = response.headers.get('content-type') || 'image/png';
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

          const saved = saveMediaToFile(dataUrl, projectId, `${config.title} Result`);
          if (saved) {
            resultUrl = saved.url;
          }
        } catch (saveErr) {
          logger.error('ComfyUI result save failed', { workflowType, projectId, code: saveErr.code });
        }
      }

      res.json({ url: resultUrl });
    } catch (error) {
      logger.error('ComfyUI workflow failed', { workflowType, code: error.code });
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  return router;
}

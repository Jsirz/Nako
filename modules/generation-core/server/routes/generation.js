/**
 * generation.js
 *
 * Routes for AI image and video generation.
 * Supports Gemini, Veo, Kling AI, Hailuo AI, and OpenAI GPT Image providers.
 */

import express from 'express';
import { getUrlPrefix } from '../../../project/api/server/workspace/workspacePaths.js';
import { PROVIDERS, resolveFinalExecutionContext } from '../generation/providerDispatch.js';
import { createGenerationService, createImageGenerationService } from '../generation/generationService.js';
export { createImageGenerationService } from '../generation/generationService.js';
import { classifyGenerationError } from '../generation/generationErrors.js';
import { createGenerationRecoveryRouter } from '../generation/generationRecoveryRouter.js';
import { createGenerationRecoveryService } from '../generation/generationRecoveryService.js';


/**
 * 读取构建时由模型插件贡献生成的 JSON 快照。
 * 开发与打包运行使用同一入口，解析细节见本模块 config/modelCatalog.js。
 */
function sendGenerationError(res, error, logLabel) {
  console.error(logLabel, error);
  if (res.headersSent) return;
  const details = error?.status && error?.code ? error : classifyGenerationError(error);
  res.status(details.status || 500).json({
    error: details.message || '生成失败，请重试。',
    code: details.code || 'GENERATION_FAILED',
    retryable: Boolean(details.retryable),
    ...(details.inFlight === undefined ? {} : { inFlight: details.inFlight }),
    ...(details.maxConcurrent === undefined ? {} : { maxConcurrent: details.maxConcurrent }),
  });
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

export function createGenerationRouter({
  applicationContext = {},
  mediaService,
  generationCoordinator,
  defaultModels,
  recoverTask = createGenerationRecoveryService({ generationCoordinator, mediaService }),
}) {
  if (!generationCoordinator) {
    throw new Error('Generation router requires the shared generation coordinator');
  }
  const router = express.Router();
  const {
    saveBuffer: saveMediaBufferToFile,
    createId: generateAssetId,
    download: downloadAndSaveAsset,
  } = mediaService;

  const generateImage = createImageGenerationService({
    applicationContext,
    mediaService,
    generationCoordinator,
    defaultModels,
  });
  router.post('/generate-image', async (req, res) => {
    try {
      const result = await generateImage(req.body);
      res.json(
        result.resultUrls ? { resultUrls: result.resultUrls } : { resultUrl: result.resultUrl },
      );
    } catch (error) {
      sendGenerationError(res, error, 'Server Image Gen Error:');
    }
  });

  // ============================================================================
  // VIDEO GENERATION
  // ============================================================================

  const generate = createGenerationService({ applicationContext, mediaService, generationCoordinator, defaultModels });
  for (const kind of ['video', 'audio', 'text']) {
    router.post('/generate-' + kind, async (req, res) => {
      try { res.json(await generate(kind, req.body)); }
      catch (error) { sendGenerationError(res, error, 'Generation service:'); }
    });
  }

  /**
   * 查询模型并发状态（前端用于禁用生成按钮）。
   */
  router.get('/generation-concurrency', (req, res) => {
    try {
      const modelName = String(req.query.modelName || '');
      const mode = String(req.query.mode || '');
      if (!modelName) {
        return res.status(400).json({ error: 'modelName is required' });
      }

      const concurrencyCtx = resolveFinalExecutionContext(modelName, mode);
      if (!concurrencyCtx) {
        return res
          .status(400)
          .json({ error: `Cannot resolve concurrency key for model: ${modelName}` });
      }

      const concurrency = generationCoordinator.getConcurrency(
        concurrencyCtx.modelIdKey,
        concurrencyCtx.maxConcurrent,
      );
      return res.json({
        modelName,
        mode,
        modelId: concurrencyCtx.finalModelId,
        url: concurrencyCtx.rawUrl,
        key: concurrencyCtx.modelIdKey,
        ...concurrency,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: error.message || 'generation concurrency check failed' });
    }
  });

  // ============================================================================
  // ASSET LOCALIZATION
  // ============================================================================

  router.post('/localize-asset', async (req, res) => {
    const { url, projectId, type } = req.body;
    try {
      const saved = await downloadAndSaveAsset(url, projectId || 'default', type || 'images');
      res.json(saved);
    } catch (error) {
      console.error('Localization Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // STATUS / RECOVERY
  // ============================================================================

  router.use(
    createGenerationRecoveryRouter({
      applicationContext,
      coordinator: generationCoordinator,
      findMediaResult: mediaService.findLatest,
      recoverTask,
    }),
  );

  return router;
}

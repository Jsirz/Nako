import { PluginError } from '../../../contracts/errors.js';
import { GENERATION_ERROR_CODES } from '../../../contracts/generationErrors.js';
import express from 'express';
import { buildSourceSettings } from './modelAvailability.js';
import { loadModelCatalog } from '../config/modelCatalog.js';
import { getGenerationProvider } from '../../providerRegistry.js';

const KINDS = ['text', 'image', 'video', 'audio'];
const KEY = 'generation.defaultModels.v1';
const empty = () => Object.fromEntries(KINDS.map((kind) => [kind, '']));
function invalid(message, code = GENERATION_ERROR_CODES.defaultModelUnavailable) {
  return new PluginError(code, message, {
    status: 400, context: { moduleId: 'generation-core', operation: 'defaultModels' },
  });
}

/** Storage and source credentials are injected; no credentials enter this document. */
export function createDefaultModelsService({
  repository,
  catalog = loadModelCatalog,
  readSecret,
  getProviderConfiguration = async () => ({}),
  provider = getGenerationProvider,
}) {
  async function read() {
    const document = await repository.read();
    const saved = JSON.parse(document.values[KEY] || '{}');
    const defaults = empty();
    for (const kind of KINDS) if (typeof saved[kind] === 'string') defaults[kind] = saved[kind];
    const models = typeof catalog === 'function' ? catalog() : catalog;
    const candidates = Object.fromEntries(KINDS.map((kind) => [kind, []]));
    const blocks = buildSourceSettings({
      catalog: models,
      readSecret,
      providerConfiguration: await getProviderConfiguration(),
    });
    for (const block of blocks)
      for (const media of block.media)
        for (const model of media.models) {
          const config = Object.values(models).find((entry) => entry.name === model.name);
          if (!provider(config?.provider)) continue;
          candidates[media.kind].push({ name: model.name, configured: model.configured });
        }
    return { defaults, candidates };
  }
  function assertAvailable(snapshot, kind, name) {
    if (!name)
      throw invalid(
        `请在设置中选择默认${{ text: '文本', image: '图像', video: '视频', audio: '音频' }[kind]}模型，或在当前操作中指定模型。`,
        GENERATION_ERROR_CODES.defaultModelRequired,
      );
    if (!snapshot.candidates[kind].some((item) => item.name === name && item.configured))
      throw invalid(`默认模型「${name}」未配置或已停用，请在设置中重新选择。`);
    return name;
  }
  let queue = Promise.resolve();
  return {
    read,
    update(values) {
      const action = queue
        .catch(() => {})
        .then(async () => {
          if (
            !values ||
            typeof values !== 'object' ||
            Array.isArray(values) ||
            Object.entries(values).some(
              ([key, value]) =>
                !KINDS.includes(key) || typeof value !== 'string' || value.length > 255,
            )
          )
            throw invalid('默认模型设置无效。', GENERATION_ERROR_CODES.invalidDefaultModels);
          const snapshot = await read();
          for (const [kind, raw] of Object.entries(values)) {
            const name = raw.trim();
            if (name) assertAvailable(snapshot, kind, name);
            snapshot.defaults[kind] = name;
          }
          await repository.update({ set: { [KEY]: JSON.stringify(snapshot.defaults) } });
          return snapshot;
        });
      queue = action;
      return action;
    },
    async resolve(kind, requested) {
      if (!KINDS.includes(kind)) throw invalid('未知模型类型。', GENERATION_ERROR_CODES.invalidModelKind);
      if (typeof requested === 'string' && requested.trim()) return requested.trim();
      const snapshot = await read();
      return assertAvailable(snapshot, kind, snapshot.defaults[kind]);
    },
  };
}

export function createDefaultModelsRouter(service) {
  const router = express.Router();
  const handle = (action) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      res.json(await action(req));
    } catch (error) {
      res
        .status(error.status || 500)
        .json({
          error: error.status ? error.message : '默认模型读取或保存失败。',
          code: error.code || 'DEFAULT_MODELS_FAILED',
        });
    }
  };
  router.get(
    '/generation/default-models',
    handle(() => service.read()),
  );
  router.put(
    '/generation/default-models',
    handle((req) => service.update(req.body)),
  );
  return router;
}

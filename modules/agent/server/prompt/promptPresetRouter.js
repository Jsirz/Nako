import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { createModuleLogger } from '../../../kernel/logger.js';
import express from 'express';

const EMPTY_PRESETS = Object.freeze({ text: [], image: [], video: [], audio: [] });
const PRESET_TYPES = new Set(Object.keys(EMPTY_PRESETS));
const PREVIEW_TYPES = Object.freeze({
  'image/png': { extension: 'png', maximumBytes: 5 * 1024 * 1024 },
  'image/jpeg': { extension: 'jpg', maximumBytes: 5 * 1024 * 1024 },
  'image/webp': { extension: 'webp', maximumBytes: 5 * 1024 * 1024 },
  'video/mp4': { extension: 'mp4', maximumBytes: 25 * 1024 * 1024 },
});

class PromptPresetError extends AgentOperationError {
  constructor(message, status = 400, code = 'INVALID_PROMPT_PRESET') {
    super(message, { operation: 'prompt-preset-request' }, code, status);
    this.name = 'PromptPresetError';
  }
}

function normalizeType(value) {
  const type = String(value || '').trim();
  if (!PRESET_TYPES.has(type)) throw new PromptPresetError('预设类型无效');
  return type;
}

function normalizeText(value, label, maximumLength) {
  const text = String(value || '').trim();
  if (!text || text.length > maximumLength) {
    throw new PromptPresetError(`${label}无效`);
  }
  return text;
}

function assertTagSafe(title, promptText) {
  if (
    title.includes('|') ||
    title.includes('[[') ||
    title.includes(']]') ||
    promptText.includes(']]')
  ) {
    throw new PromptPresetError('预设名称或内容包含标签保留字符', 400, 'INVALID_PROMPT_TAG');
  }
}

function hasExpectedSignature(mimeType, buffer) {
  if (mimeType === 'image/png')
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'video/mp4') return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  return false;
}

function normalizePreview(value) {
  if (value == null || value === '') return null;
  const match = String(value).match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  const config = match ? PREVIEW_TYPES[match[1].toLowerCase()] : null;
  if (!match || !config) {
    throw new PromptPresetError('预览文件格式无效');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (
    buffer.length === 0 ||
    buffer.length > config.maximumBytes ||
    !hasExpectedSignature(match[1].toLowerCase(), buffer)
  ) {
    throw new PromptPresetError('预览文件内容无效');
  }
  return { buffer, extension: config.extension };
}

function isPreviewReferenced(data, previewUrl) {
  if (!previewUrl) return false;
  return Object.values(data).some(
    (categories) =>
      Array.isArray(categories) &&
      categories.some(
        (category) =>
          Array.isArray(category?.items) &&
          category.items.some((item) => item?.preview === previewUrl),
      ),
  );
}

function sendError(response, error, logger) {
  const known = error instanceof PromptPresetError || error?.name === 'PromptPresetError';
  if (!known || error.status >= 500) logger.error('Prompt preset error:', error);
  response.status(known ? error.status : 500).json({
    error: known ? error.message : '提示词预设操作失败，请检查本地数据文件。',
    code: known ? error.code : 'PROMPT_PRESET_FAILED',
  });
}

export function createPromptPresetRouter({ store, logger = createModuleLogger('module.prompt') }) {
  const router = express.Router();
  const { mutate, readConfig, readCreativeLibrary } = store;
  async function sendConfig(response) {
    response.setHeader('Cache-Control', 'no-store');
    response.json(await readConfig());
  }

  router.get('/api/prompts/creative-library', async (_request, response) => {
    try {
      response.setHeader('Cache-Control', 'no-store');
      response.json(await readCreativeLibrary());
    } catch (error) {
      sendError(response, error, logger);
    }
  });
  router.post('/api/prompts/creative-library', async (request, response) => {
    try {
      const { favoriteChanges = [], customUpserts = [], customDeletes = [] } = request.body || {};
      const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);
      if (
        ![favoriteChanges, customUpserts, customDeletes].every(
          (v) => Array.isArray(v) && v.length <= 100,
        ) ||
        favoriteChanges.some((v) => !validId(v?.id) || typeof v.saved !== 'boolean') ||
        customDeletes.some((v) => !validId(v)) ||
        customUpserts.some(
          (v) =>
            !validId(v?.id) ||
            !['style', 'motion', 'filter'].includes(v.kind) ||
            typeof v.name !== 'string' ||
            !v.name.trim() ||
            v.name.length > 80 ||
            typeof v.prompt !== 'string' ||
            v.prompt.length > 12000 ||
            (v.prefix !== undefined && (typeof v.prefix !== 'string' || v.prefix.length > 12000)),
        )
      ) {
        throw new PromptPresetError('预设数据格式不正确或超过长度限制。');
      }
      const result = await mutate(async () => {
        const data = await readCreativeLibrary();
        const favorites = new Set(data.favorites);
        for (const change of favoriteChanges) {
          if (change.saved) favorites.add(change.id);
          else favorites.delete(change.id);
        }
        const custom = new Map(data.custom.map((p) => [p.id, p]));
        for (const id of customDeletes) custom.delete(id);
        for (const p of customUpserts)
          custom.set(p.id, {
            id: p.id,
            kind: p.kind,
            name: p.name.trim(),
            category: '自定义',
            description: '自定义前后缀',
            prefix: p.prefix || '',
            prompt: p.prompt,
          });
        if (favorites.size > 1000 || custom.size > 500)
          throw new PromptPresetError('收藏或自定义预设数量已达上限。');
        const next = { favorites: [...favorites], custom: [...custom.values()] };
        await store.saveCreativeLibrary(next);
        return next;
      });
      response.json(result);
    } catch (error) {
      sendError(response, error, logger);
    }
  });

  router.get('/library/prompts/prompt.json', async (_request, response) => {
    try {
      await sendConfig(response);
    } catch (error) {
      sendError(response, error, logger);
    }
  });

  router.get('/api/prompts', async (_request, response) => {
    try {
      await sendConfig(response);
    } catch (error) {
      sendError(response, error, logger);
    }
  });

  router.post('/api/prompts', async (request, response) => {
    try {
      const type = normalizeType(request.body?.type);
      const category = normalizeText(request.body?.category, '预设分类', 80);
      const title = normalizeText(request.body?.title, '预设名称', 120);
      const promptText = normalizeText(request.body?.prompt, '提示词内容', 20000);
      assertTagSafe(title, promptText);
      const preview = normalizePreview(request.body?.previewBase64);
      const preset = {
        title,
        prompt: promptText.includes('\n') ? promptText.split('\n') : promptText,
        preview: '',
      };
      await mutate(async () => {
        const data = await readConfig();
        if (data[type] != null && !Array.isArray(data[type])) {
          throw new PromptPresetError('预设类型数据格式无效', 500, 'INVALID_PROMPT_PRESET_CONFIG');
        }
        data[type] ||= [];
        const duplicate = data[type].some(
          (categoryItem) =>
            Array.isArray(categoryItem?.items) &&
            categoryItem.items.some(
              (item) =>
                String(item?.title || '')
                  .trim()
                  .toLocaleLowerCase() === title.toLocaleLowerCase(),
            ),
        );
        if (duplicate) {
          throw new PromptPresetError('同类型下已存在相同名称的预设', 409, 'PROMPT_PRESET_EXISTS');
        }
        let categoryItem = data[type].find((item) => item?.name === category);
        if (!categoryItem) {
          categoryItem = { name: category, items: [] };
          data[type].push(categoryItem);
        }
        if (!Array.isArray(categoryItem.items)) {
          throw new PromptPresetError('预设分类数据格式无效', 500, 'INVALID_PROMPT_PRESET_CONFIG');
        }
        let previewPath = null;
        try {
          if (preview) {
            previewPath = await store.savePreview(preview);
            preset.preview = previewPath;
          }
          categoryItem.items.push(preset);
          await store.saveConfig(data);
        } catch (error) {
          if (previewPath) await store.removePreview(previewPath);
          throw error;
        }
      });
      response.json({ success: true, preset });
    } catch (error) {
      sendError(response, error, logger);
    }
  });

  router.delete('/api/prompts/:type/:category/:title', async (request, response) => {
    try {
      const type = normalizeType(request.params.type);
      const category = normalizeText(request.params.category, '预设分类', 80);
      const title = normalizeText(request.params.title, '预设名称', 120);
      let removedPreview = '';
      let shouldRemovePreview = false;
      await mutate(async () => {
        const data = await readConfig();
        if (!Array.isArray(data[type])) {
          throw new PromptPresetError('预设类型不存在', 404, 'PROMPT_PRESET_NOT_FOUND');
        }
        const categoryItem = data[type].find((item) => item?.name === category);
        if (!categoryItem || !Array.isArray(categoryItem.items)) {
          throw new PromptPresetError('预设分类不存在', 404, 'PROMPT_PRESET_NOT_FOUND');
        }
        const itemIndex = categoryItem.items.findIndex((item) => item?.title === title);
        if (itemIndex < 0) {
          throw new PromptPresetError('预设不存在', 404, 'PROMPT_PRESET_NOT_FOUND');
        }
        const [removed] = categoryItem.items.splice(itemIndex, 1);
        removedPreview = removed?.preview || '';
        shouldRemovePreview = !isPreviewReferenced(data, removedPreview);
        await store.saveConfig(data);
      });
      if (shouldRemovePreview) {
        const previewPath = removedPreview;
        if (previewPath) {
          try {
            await store.removePreview(previewPath);
          } catch (error) {
            logger.warn('Prompt preset preview cleanup failed:', error);
          }
        }
      }
      response.json({ success: true });
    } catch (error) {
      sendError(response, error, logger);
    }
  });

  return router;
}

export { PromptPresetError };

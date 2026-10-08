import { providerErrorsFor } from '../../../modules/contracts/providerErrors.js';
import { ECLOUD_TEXT_MODELS, ECLOUD_GLM_MODEL } from './protocol.js';
import { ecloudInputError as invalid, inputAssets, inlineMedia, publicMediaUrl } from './media.js';
import { connection, bool, integer, requirePrompt } from './settings.js';
const { responseError } = providerErrorsFor('ecloud');

export function createEcloudTextProvider(submitChat) {
  return {
    async generateText(params, config) {
      const ctx = connection('text', params, config);
      const assets = inputAssets(params);
      const vision = ECLOUD_TEXT_MODELS.find(([id]) => id === ctx.modelId)?.[1];
      const glm = ctx.modelId === ECLOUD_GLM_MODEL;
      if (assets.audios.length || (!vision && (assets.images.length || assets.videos.length))
        || assets.images.length > 10 || assets.videos.length > 1)
        throw invalid('当前移动云文本模型不支持这些参考素材。');
      const content = [{ type: 'text', text: requirePrompt(params.prompt) }];
      const images = await Promise.all(assets.images.map((value) => inlineMedia(value, 'image', params, config, 10)));
      for (const url of images) content.push({ type: 'image_url', image_url: { url } });
      for (const value of assets.videos) content.push({
        type: 'video_url',
        video_url: {
          url: glm ? publicMediaUrl(value) : await inlineMedia(value, 'video', params, config, 100),
        },
      });
      const body = {
        model: ctx.modelId,
        messages: [{ role: 'user', content: content.length === 1 ? params.prompt : content }],
        ...(glm ? {
          thinking: { type: 'enabled', clear_thinking: false },
          reasoning_effort: params.reasoning_effort ?? 'max',
          tool_stream: true,
          stream_options: { include_usage: true },
        } : { enable_thinking: bool(params.enable_thinking, false) }),
      };
      if (glm && !bool(params.enable_thinking, true))
        throw invalid('GLM-5.3-Flash 不支持关闭思考模式。');
      if (glm && !['low', 'high', 'max'].includes(body.reasoning_effort))
        throw invalid('GLM-5.3-Flash 不支持所选思考强度。');
      if (params.temperature != null) {
        const t = Number(params.temperature);
        if (!Number.isFinite(t) || t < 0 || t >= 2) throw invalid('温度须在 [0, 2) 内。');
        body.temperature = t;
      }
      if (params.top_p != null) {
        const p = Number(params.top_p);
        if (!Number.isFinite(p) || p <= 0 || p > 1) throw invalid('top_p 须在 (0, 1] 内。');
        body.top_p = p;
      }
      if (params.max_tokens != null) body.max_tokens = integer(
        params.max_tokens, 4096, 1,
        glm ? 131072 : ctx.modelId === 'qwen/qwen3-vl-plus' ? 32768 : 65536,
        '输出 Token 数',
      );
      const result = await submitChat({
        url: ctx.submitUrl,
        headers: { Authorization: `Bearer ${ctx.apiKey}` },
        body,
        signal: params.signal,
        onToken: params.onToken,
        modelId: ctx.modelId,
        useProxy: params.useProxy,
      });
      if (!result.text) throw responseError('移动云未返回文本内容。');
      return result;
    },
  };
}

import { setTimeout as delay } from 'node:timers/promises';
import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { submitOpenAiChatWithLogs } from '../../../modules/generation-providers/api/server/providers/providerKit.js';
import { matchesRemoteTask, remoteTaskReference } from '../../../modules/generation-core/api/server/generation/generationTaskRecovery.js';
import { PROVIDER_ERRORS, providerErrorsFor } from '../../../modules/contracts/providerErrors.js';
import { ECLOUD_SEEDANCE, isEcloudMiniMaxModel, IMAGE_SIZES, VIDEO_RATIOS } from './protocol.js';
import { ecloudInputError as invalid, inputAssets, inlineMedia, publicMediaUrl } from './media.js';
import { createSeedanceVideoProvider } from './seedance.js';
import { createMiniMaxVideoProvider } from './minimax.js';
import { connection, integer, bool, seed, requirePrompt } from './settings.js';
import { createEcloudTransport } from './transport.js';
import { createEcloudTextProvider } from './text.js';
const { responseError, submitError, taskError, unknownError, timeoutError, wrapError } = providerErrorsFor('ecloud');
const images = (values, params, config, maxMb) =>
  Promise.all(values.map((value) => inlineMedia(value, 'image', params, config, maxMb)));

function createImageProvider({ request, download }) {
  return {
    async generateImage(params, config) {
      const ctx = connection('image', params, config);
      const assets = inputAssets(params);
      const mode = params.imageMode || 'text-to-image';
      if (!['text-to-image', 'image-to-image'].includes(mode) || assets.videos.length
        || assets.audios.length || (mode === 'text-to-image'
          ? assets.images.length !== 0 : assets.images.length < 1 || assets.images.length > 3))
        throw invalid('文生图不接受图片；图片编辑需要 1–3 张参考图片。');
      const count = integer(params.generateCount, 1, 1, 6, '图片数量');
      const dimensions = IMAGE_SIZES[params.aspectRatio || '1:1'];
      if (!dimensions || !['1K', '2K'].includes(params.resolution || '2K'))
        throw invalid('移动云图片比例或分辨率不支持。');
      const size = dimensions.map((n) => (params.resolution === '1K' ? n / 2 : n)).join('*');
      const content = (await images(assets.images, params, config, 10)).map((image) => ({ image }));
      content.push({ text: requirePrompt(params.prompt) });
      const parameters = {
        size, n: count, prompt_extend: bool(params.prompt_extend, true), watermark: false, ...seed(params),
      };
      if (params.negative_prompt) parameters.negative_prompt = String(params.negative_prompt).slice(0, 500);
      const payload = await request(ctx.submitUrl, {
        ...ctx, signal: params.signal, useProxy: params.useProxy,
        body: { model: ctx.modelId, input: { messages: [{ role: 'user', content }] }, parameters },
      });
      const urls = payload.output?.choices?.flatMap((choice) =>
        choice.message?.content?.flatMap((item) => (item.image ? [item.image] : [])) || []) || [];
      if (urls.length !== count) throw responseError(
        '移动云返回图片数量与请求不一致，请核对服务商记录；不会重新提交。', { submissionUncertain: true },
      );
      try {
        return await Promise.all(urls.map((url) => download(url, 'png', params)));
      } catch (error) {
        const failure = wrapError(error, 'download');
        failure.submissionUncertain = true;
        throw failure;
      }
    },
  };
}

function createVideoProvider({ request, download, wait, now }) {
  async function query(reference, params, config, signal) {
    const ctx = connection('video', params, config);
    if (!matchesRemoteTask(reference, ctx)) return { status: 'unknown' };
    const payload = await request(ctx.queryUrl + encodeURIComponent(reference.taskId), {
      ...ctx, signal, useProxy: params.useProxy,
    });
    const output = payload.output;
    if (output?.task_id && output.task_id !== reference.taskId) return { status: 'unknown' };
    if (['FAILED', 'CANCELED'].includes(output?.task_status)) return { status: 'failed' };
    if (['PENDING', 'RUNNING'].includes(output?.task_status)) return { status: 'pending' };
    if (output?.task_status !== 'SUCCEEDED' || !output.video_url) return { status: 'unknown' };
    const result = await download(output.video_url, 'mp4', { ...params, signal });
    return matchesRemoteTask(reference, connection('video', params, config))
      ? { status: 'success', ...result } : { status: 'unknown' };
  }
  const seedance = createSeedanceVideoProvider({ request, download, wait, now });
  const minimax = createMiniMaxVideoProvider({ request, download, wait, now });
  return {
    async generateVideo(params, config) {
      if (isEcloudMiniMaxModel(params.videoModel)) return minimax.generateVideo(params, config);
      if (params.videoModel === ECLOUD_SEEDANCE.model) return seedance.generateVideo(params, config);
      const ctx = connection('video', params, config);
      const assets = inputAssets(params);
      const mode = params.videoMode || 'text-to-video';
      const count = assets.images.length;
      if (assets.audios.length || (mode === 'text-to-video' && count)
        || (mode === 'first-frame' && count !== 1)
        || (mode === 'reference-video' && (count < 1 || count > 9))
        || (mode === 'video-edit' && count > 5)
        || (mode === 'video-edit' ? assets.videos.length !== 1 : assets.videos.length !== 0))
        throw invalid('移动云视频模式与参考素材数量不匹配。');
      const input = {
        prompt: mode === 'first-frame' ? String(params.prompt || '') : requirePrompt(params.prompt),
      };
      const urls = await images(assets.images, params, config, 20);
      if (urls.some((url) => url.startsWith('data:') && !/^data:image\/(?:jpeg|png|webp);/.test(url)))
        throw invalid('移动云视频参考图片仅支持 JPEG、PNG 和 WebP。');
      if (mode !== 'text-to-video') input.media = urls.map((url) => ({
        type: mode === 'first-frame' ? 'first_frame' : 'reference_image', url,
      }));
      if (mode === 'video-edit') input.media.unshift({ type: 'video', url: publicMediaUrl(assets.videos[0]) });
      const resolution = String(params.resolution || '1080p').toUpperCase();
      if (!['720P', '1080P'].includes(resolution)) throw invalid('移动云视频支持 720p 或 1080p。');
      const parameters = { resolution, watermark: false, ...seed(params) };
      if (mode !== 'video-edit') parameters.duration = integer(params.duration, 5, 3, 15, '视频时长');
      if (['text-to-video', 'reference-video'].includes(mode)) {
        const ratio = params.aspectRatio || '16:9';
        if (!VIDEO_RATIOS.includes(ratio)) throw invalid('移动云视频比例不支持。');
        parameters.ratio = ratio;
      }
      if (mode === 'video-edit') {
        if (!['auto', 'origin'].includes(params.audio_setting || 'auto')) throw invalid('声音参数无效。');
        parameters.audio_setting = params.audio_setting || 'auto';
      }
      params.signal?.throwIfAborted();
      config.generationTaskSubmitting?.();
      const payload = await request(ctx.submitUrl, {
        ...ctx, signal: params.signal, useProxy: params.useProxy, async: true,
        body: { model: ctx.modelId, input, parameters },
      });
      const reference = remoteTaskReference({ taskId: payload.output?.task_id, ...ctx });
      if (!reference) throw submitError('移动云未返回有效任务编号；请核对原任务，不会重新提交。', {
        submissionUncertain: true,
      });
      config.generationTaskSubmitted?.(reference);
      const deadline = now() + 600_000;
      while (now() < deadline) {
        const result = await query(reference, params, config, params.signal);
        if (result.status === 'success') return { buffer: result.buffer, format: result.format };
        if (result.status === 'failed') throw taskError('移动云确认视频任务失败或已取消，请核对服务商任务记录。', {
          code: PROVIDER_ERRORS.ecloudTask, status: 502, retryable: false, expose: true, providerTaskFailed: true,
        });
        if (result.status === 'unknown') throw unknownError('移动云任务状态未知，请保留任务编号并查询原任务。');
        await wait(5000, params.signal);
      }
      throw timeoutError('等待移动云视频结果超时，可稍后查询原任务。');
    },
    canRecoverVideo(reference, params, config) {
      if (isEcloudMiniMaxModel(params.videoModel)) return minimax.canRecoverVideo(reference, params, config);
      if (params.videoModel === ECLOUD_SEEDANCE.model) return seedance.canRecoverVideo(reference, params, config);
      try { return Boolean(matchesRemoteTask(reference, connection('video', params, config))); }
      catch { return false; }
    },
    recoverVideo(reference, params, config, signal) {
      if (isEcloudMiniMaxModel(params.videoModel)) return minimax.recoverVideo(reference, params, config, signal);
      if (params.videoModel === ECLOUD_SEEDANCE.model) return seedance.recoverVideo(reference, params, config, signal);
      return query(reference, params, config, signal);
    },
  };
}

function createAudioProvider({ request, download }) {
  return {
    async generateAudio(params, config) {
      const ctx = connection('audio', params, config);
      const assets = inputAssets(params);
      if (assets.images.length || assets.videos.length || assets.audios.length)
        throw invalid('移动云 TTS 仅接受文本，不支持参考音频或声音克隆。');
      const language = params.language_type || 'Auto';
      if (!['Auto', 'Chinese', 'English', 'German', 'Italian', 'Portuguese', 'Spanish',
        'Japanese', 'Korean', 'French', 'Russian'].includes(language))
        throw invalid('移动云 TTS 语种不支持。');
      const payload = await request(ctx.submitUrl, {
        ...ctx, signal: params.signal, useProxy: params.useProxy,
        body: {
          model: ctx.modelId,
          input: { text: requirePrompt(params.prompt), voice: 'Cherry', language_type: language },
        },
      });
      try {
        if (!payload.output?.audio?.url) throw responseError('移动云未返回完整语音文件 URL。');
        return await download(payload.output.audio.url, 'wav', params);
      } catch (error) {
        const failure = wrapError(error, 'download');
        failure.submissionUncertain = true;
        throw failure;
      }
    },
  };
}

export function createEcloudHandlers({
  fetcher = (...args) => BaseProvider.fetch(...args),
  submitChat = submitOpenAiChatWithLogs,
  wait = (ms, signal) => delay(ms, undefined, { signal }),
  now = Date.now,
} = {}) {
  const transport = createEcloudTransport(fetcher);
  return {
    EcloudTextProvider: createEcloudTextProvider(submitChat),
    EcloudImageProvider: createImageProvider(transport),
    EcloudVideoProvider: createVideoProvider({ ...transport, wait, now }),
    EcloudAudioProvider: createAudioProvider(transport),
  };
}
export const { EcloudTextProvider, EcloudImageProvider, EcloudVideoProvider, EcloudAudioProvider } =
  createEcloudHandlers();

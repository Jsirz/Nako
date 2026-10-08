import {
  matchesRemoteTask,
  remoteTaskReference,
} from '../../../modules/generation-core/api/server/generation/generationTaskRecovery.js';
import { ECLOUD_SEEDANCE as protocol } from './protocol.js';
import { ecloudInputError as invalid, inputAssets, publicMediaUrl } from './media.js';
import { PROVIDER_ERRORS, providerErrorsFor } from '../../../modules/contracts/providerErrors.js';
const { credentialError, submitError, taskError, unknownError, timeoutError, wrapError } = providerErrorsFor('ecloud');

function connection(params, config) {
  if (params.videoModel !== protocol.model || (params.url && params.url !== protocol.endpoint))
    throw invalid('移动云 Seedance 2.0 须使用官方模型别名和呼和浩特任务端点。');
  const apiKey = String(config.ECLOUD_API_KEY || '').trim();
  if (!apiKey)
    throw credentialError('请在移动云 MoMA 设置中保存 API Key。', { status: 400 });
  return {
    apiKey,
    modelId: protocol.model,
    submitUrl: protocol.endpoint,
    queryUrl: protocol.endpoint + '/',
    providerName: 'EcloudVideoProvider',
  };
}

function mediaUrl(value) {
  if (typeof value !== 'string') throw invalid('Seedance 参考素材地址无效。');
  const url = value.trim();
  if (/^asset:\/\/asset-[A-Za-z0-9_-]{1,180}$/.test(url)) return url;
  if (!/^https?:\/\//i.test(url))
    throw invalid(
      '移动云 Seedance REST 接口使用公网素材 URL 或已审核的 asset://asset-…；请在高级设置填入地址，本机文件和 Base64 不会自动上传。',
    );
  return publicMediaUrl(url);
}
function boolean(value, fallback, label) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw invalid(`${label}须为 true 或 false。`);
}

export function seedanceRequest(params) {
  const assets = inputAssets(params),
    mode = params.videoMode || 'text-to-video';
  const { images, videos, audios } = assets;
  if (!protocol.modes.includes(mode)) throw invalid('Seedance 2.0 不支持当前视频模式。');
  if (images.length > 9 || videos.length > 3 || audios.length > 3)
    throw invalid('Seedance 最多支持 9 张图片、3 个视频和 3 段音频。');
  if (
    (mode === 'text-to-video' && images.length + videos.length + audios.length) ||
    (mode === 'first-frame' && (images.length !== 1 || videos.length || audios.length)) ||
    (mode === 'i2v-first-last-frame' && (images.length !== 2 || videos.length || audios.length)) ||
    (mode === 'multimodal' && !images.length && !videos.length)
  )
    throw invalid(
      'Seedance 模式与素材不匹配：首帧需 1 张图、首尾帧需 2 张图；多模态至少有图片或视频，音频不能单独使用。',
    );
  const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
  if (!prompt && mode === 'text-to-video') throw invalid('文生视频需要提示词。');
  const content = prompt ? [{ type: 'text', text: prompt }] : [];
  images.forEach((url, index) =>
    content.push({
      type: 'image_url',
      image_url: { url: mediaUrl(url) },
      role:
        mode === 'first-frame'
          ? 'first_frame'
          : mode === 'i2v-first-last-frame'
            ? index === 0
              ? 'first_frame'
              : 'last_frame'
            : 'reference_image',
    }),
  );
  videos.forEach((url) =>
    content.push({ type: 'video_url', video_url: { url: mediaUrl(url) }, role: 'reference_video' }),
  );
  audios.forEach((url) =>
    content.push({ type: 'audio_url', audio_url: { url: mediaUrl(url) }, role: 'reference_audio' }),
  );
  const duration = Number(params.duration ?? 5);
  if (!Number.isInteger(duration) || (duration !== -1 && (duration < 4 || duration > 15)))
    throw invalid('Seedance 视频时长须为 4–15 秒整数，或 -1（智能选择）。');
  const resolution = String(params.resolution || '720p').toLowerCase();
  if (!protocol.resolutions.includes(resolution))
    throw invalid('Seedance 支持 480p、720p、1080p。');
  const ratio = params.aspectRatio || '16:9';
  if (!protocol.ratios.includes(ratio))
    throw invalid('移动云 Seedance REST 接口提供 16:9、9:16、1:1 比例。');
  const body = {
    model: protocol.model,
    content,
    resolution,
    ratio,
    duration,
    generate_audio: boolean(params.generate_audio, true, '生成音频'),
    watermark: boolean(params.watermark, false, '水印'),
  };
  if (params.seed !== undefined) {
    const seed = Number(params.seed);
    if (!Number.isInteger(seed) || seed < -1 || seed > 4294967295)
      throw invalid('Seedance 随机种子须为 -1 至 4294967295 的整数。');
    body.seed = seed;
  }
  if (Buffer.byteLength(JSON.stringify(body)) > 64 * 1024 * 1024)
    throw invalid('Seedance 请求体不能超过 64 MB。');
  return body;
}

export function createSeedanceVideoProvider({ request, download, wait, now }) {
  async function query(reference, params, config, signal) {
    const ctx = connection(params, config);
    if (!matchesRemoteTask(reference, ctx)) return { status: 'unknown' };
    let task;
    try {
      task = await request(ctx.queryUrl + encodeURIComponent(reference.taskId), {
        ...ctx,
        signal,
        useProxy: params.useProxy,
        taskResponse: true,
      });
    } catch (error) {
      if (error.upstreamStatus === 404) return { status: 'unknown' };
      throw wrapError(error, 'poll');
    }
    if (
      task.id !== reference.taskId ||
      (task.model && ![protocol.model, protocol.resolvedModel].includes(task.model))
    )
      return { status: 'unknown' };
    if (['queued', 'running'].includes(task.status)) return { status: 'pending' };
    if (['failed', 'cancelled', 'expired'].includes(task.status)) return { status: 'failed' };
    if (task.status !== 'succeeded' || !task.content?.video_url) return { status: 'unknown' };
    const result = await download(task.content.video_url, 'mp4', { ...params, signal });
    return matchesRemoteTask(reference, connection(params, config))
      ? { status: 'success', ...result }
      : { status: 'unknown' };
  }
  return {
    async generateVideo(params, config) {
      const ctx = connection(params, config),
        body = seedanceRequest(params);
      params.signal?.throwIfAborted();
      config.generationTaskSubmitting?.();
      // Single paid POST. REST gateway detects video inputs; no SDK or DashScope headers.
      const result = await request(ctx.submitUrl, {
        ...ctx,
        body,
        signal: params.signal,
        useProxy: params.useProxy,
      });
      const reference = remoteTaskReference({ ...ctx, taskId: result.id });
      if (!reference)
        throw Object.assign(submitError('移动云 Seedance 未返回任务 ID，请先核对原任务。'), {
          submissionUncertain: true,
        });
      config.generationTaskSubmitted?.(reference);
      const deadline = now() + 1200000;
      while (now() < deadline) {
        const state = await query(reference, params, config, params.signal);
        if (state.status === 'success') return { buffer: state.buffer, format: state.format };
        if (state.status === 'failed')
          throw Object.assign(
            taskError('移动云 Seedance 已确认任务失败、取消或过期，请核对任务记录。'),
            {
              code: PROVIDER_ERRORS.ecloudTask,
              status: 502,
              retryable: false,
              expose: true,
              providerTaskFailed: true,
            },
          );
        if (state.status === 'unknown')
          throw unknownError('移动云 Seedance 任务状态未知，请保留任务编号并查询原任务。');
        await wait(10000, params.signal);
      }
      throw timeoutError('等待移动云 Seedance 结果超时，可稍后查询原任务。');
    },
    canRecoverVideo(reference, params, config) {
      try {
        return Boolean(matchesRemoteTask(reference, connection(params, config)));
      } catch {
        return false;
      }
    },
    recoverVideo: query,
  };
}

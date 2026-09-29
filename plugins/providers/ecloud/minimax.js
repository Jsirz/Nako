import {
  matchesRemoteTask,
  remoteTaskReference,
} from '../../../modules/generation-core/api/server/generation/generationTaskRecovery.js';
import { ECLOUD_MINIMAX as protocol, isEcloudMiniMaxModel } from './protocol.js';
import { ecloudInputError as invalid, inputAssets, inlineMedia } from './media.js';

function profileFor(params) {
  const resolution = String(params.resolution || '768p')
    .trim()
    .toLowerCase();
  if (!Object.hasOwn(protocol.profiles, resolution))
    throw invalid('移动云 MiniMax-H3 支持 768P 或 2K 分辨率。');
  return protocol.profiles[resolution];
}

function connection(params, config) {
  if (!isEcloudMiniMaxModel(params.videoModel) || (params.url && params.url !== protocol.endpoint))
    throw invalid('移动云 MiniMax-H3 须使用官方 /v1/videos 接口及 minimax/minimax-h3 模型 ID。');
  const apiKey = String(config.ECLOUD_API_KEY || '').trim();
  if (!apiKey)
    throw Object.assign(new Error('请在移动云 MoMA 设置中保存 API Key。'), {
      code: 'PROVIDER_CREDENTIAL_MISSING',
      status: 400,
    });
  return {
    apiKey,
    modelId: profileFor(params).model,
    // The live MoMA gateway requires the namespaced routing header even though
    // article 100738's GET example omits it (otherwise it returns an empty 404).
    queryModel: protocol.model,
    submitUrl: protocol.endpoint,
    queryUrl: protocol.endpoint + '/',
    providerName: 'EcloudVideoProvider',
  };
}

function recoveryConnection(reference, params, config) {
  const ctx = connection(params, config);
  return matchesRemoteTask(reference, ctx) ? ctx : null;
}

export async function minimaxRequest(params, config) {
  const { images, videos, audios } = inputAssets(params);
  const mode = params.videoMode || 'text-to-video';
  const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
  if (!prompt) throw invalid('MiniMax-H3 所有生成模式均需要提示词。');
  if (!protocol.modes.includes(mode)) throw invalid('MiniMax-H3 不支持当前视频模式。');
  // Conservative application limits; the public API article does not specify item counts.
  if (images.length > 9 || videos.length > 3 || audios.length > 3)
    throw invalid('本项目 MiniMax-H3 单次最多支持 9 张图片、3 个视频和 3 段音频。');
  if (
    (mode === 'text-to-video' && images.length + videos.length + audios.length) ||
    (['first-frame', 'last-frame'].includes(mode) &&
      (images.length !== 1 || videos.length || audios.length)) ||
    (mode === 'i2v-first-last-frame' && (images.length !== 2 || videos.length || audios.length)) ||
    (mode === 'multimodal' && !images.length && !videos.length)
  )
    throw invalid('MiniMax-H3 模式与参考素材不匹配；首尾帧需两张图，多模态参考不可仅输入音频。');
  const duration = Number(params.duration ?? 5);
  const profile = profileFor(params);
  if (!Number.isInteger(duration) || duration < profile.minDuration || duration > 15)
    throw invalid(
      `MiniMax-H3 ${profile.resolution} 视频时长须为 ${profile.minDuration}–15 秒整数。`,
    );
  const frameMode = ['first-frame', 'last-frame', 'i2v-first-last-frame'].includes(mode);
  const requestedRatio = params.aspectRatio || (mode === 'multimodal' ? 'adaptive' : '16:9');
  if (!protocol.ratios.includes(requestedRatio) && requestedRatio !== 'adaptive')
    throw invalid('MiniMax-H3 视频比例不支持。');
  if (mode === 'text-to-video' && requestedRatio === 'adaptive')
    throw invalid('MiniMax-H3 文生视频须指定具体宽高比。');
  const content = [{ type: 'text', text: prompt }];
  for (const [kind, values, limit] of [
    ['image', images, 20],
    ['video', videos, 40],
    ['audio', audios, 20],
  ]) {
    for (const [index, value] of values.entries()) {
      params.signal?.throwIfAborted();
      const url = await inlineMedia(value, kind, params, config, limit);
      if (
        url.startsWith('data:') &&
        kind === 'image' &&
        !/^data:image\/(?:jpeg|png|webp);/.test(url)
      )
        throw invalid('MiniMax-H3 本地参考图片支持 JPEG、PNG 和 WebP。');
      if (url.startsWith('data:') && kind === 'video' && !url.startsWith('data:video/mp4;'))
        throw invalid('MiniMax-H3 本地参考视频须为 MP4。');
      const role =
        kind !== 'image' || mode === 'multimodal'
          ? `reference_${kind}`
          : mode === 'last-frame' || (mode === 'i2v-first-last-frame' && index === 1)
            ? 'last_frame'
            : 'first_frame';
      content.push({ type: `${kind}_url`, [`${kind}_url`]: { url }, role });
    }
  }
  const body = {
    model: profile.model,
    content,
    resolution: profile.resolution,
    duration,
    ratio: frameMode ? 'adaptive' : requestedRatio,
    aigc_watermark: false,
  };
  if (Buffer.byteLength(JSON.stringify(body)) > 64 * 1024 * 1024)
    throw invalid('MiniMax-H3 请求体不能超过 64 MB；较大的素材请使用公网 URL。');
  return body;
}

export function createMiniMaxVideoProvider({ request, download, wait, now }) {
  async function query(reference, params, config, signal) {
    const ctx = recoveryConnection(reference, params, config);
    if (!ctx) return { status: 'unknown' };
    let payload;
    try {
      payload = await request(ctx.queryUrl + encodeURIComponent(reference.taskId), {
        ...ctx,
        signal,
        useProxy: params.useProxy,
      });
    } catch (error) {
      if (error.upstreamStatus === 404) return { status: 'unknown' };
      throw error;
    }
    const task = payload?.task;
    // The official response example uses the unprefixed product name.
    if (!task || task.id !== reference.taskId || (task.model && !isEcloudMiniMaxModel(task.model)))
      return { status: 'unknown' };
    if (['failed', 'cancelled', 'expired'].includes(task.status)) return { status: 'failed' };
    if (task.error) return { status: 'unknown' };
    if (['queued', 'running'].includes(task.status)) return { status: 'pending' };
    if (task.status !== 'succeeded' || !task.content?.url) return { status: 'unknown' };
    const result = await download(task.content.url, 'mp4', { ...params, signal });
    return recoveryConnection(reference, params, config)
      ? { status: 'success', ...result }
      : { status: 'unknown' };
  }
  return {
    async generateVideo(params, config) {
      const ctx = connection(params, config);
      const body = await minimaxRequest(params, config);
      params.signal?.throwIfAborted();
      config.generationTaskSubmitting?.();
      const payload = await request(ctx.submitUrl, {
        ...ctx,
        body,
        signal: params.signal,
        useProxy: params.useProxy,
      });
      const reference = remoteTaskReference({ ...ctx, taskId: payload.task_id });
      if (!reference)
        throw Object.assign(new Error('移动云 MiniMax-H3 未返回任务 ID，请先核对原任务。'), {
          submissionUncertain: true,
        });
      config.generationTaskSubmitted?.(reference);
      const deadline = now() + 1200000;
      while (now() < deadline) {
        const state = await query(reference, params, config, params.signal);
        if (state.status === 'success') return { buffer: state.buffer, format: state.format };
        if (state.status === 'failed')
          throw Object.assign(
            new Error('移动云 MiniMax-H3 已确认任务失败、取消或过期，请核对任务记录。'),
            {
              code: 'ECLOUD_TASK_FAILED',
              status: 502,
              retryable: false,
              expose: true,
              providerTaskFailed: true,
            },
          );
        if (state.status === 'unknown')
          throw new Error('移动云 MiniMax-H3 任务状态未知，请保留任务编号并查询原任务。');
        await wait(10000, params.signal);
      }
      throw new Error('等待移动云 MiniMax-H3 结果超时，可稍后查询原任务。');
    },
    canRecoverVideo(reference, params, config) {
      try {
        return Boolean(recoveryConnection(reference, params, config));
      } catch {
        return false;
      }
    },
    recoverVideo: query,
  };
}

import { setTimeout as delay } from 'node:timers/promises';
import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { submitOpenAiChatWithLogs } from '../../../modules/generation-providers/api/server/providers/providerKit.js';
import {
  matchesRemoteTask,
  remoteTaskReference,
} from '../../../modules/generation-core/api/server/generation/generationTaskRecovery.js';
import {
  ECLOUD_ENDPOINTS,
  ECLOUD_TEXT_MODELS,
  ECLOUD_VIDEO_MODELS,
  ECLOUD_SEEDANCE,
  ECLOUD_GLM_MODEL,
  isEcloudMiniMaxModel,
  IMAGE_SIZES,
  VIDEO_RATIOS,
} from './protocol.js';
import { ecloudInputError as invalid, inputAssets, inlineMedia, publicMediaUrl } from './media.js';
import { createSeedanceVideoProvider } from './seedance.js';
import { createMiniMaxVideoProvider } from './minimax.js';

function connection(kind, params, config) {
  const apiKey = String(config.ECLOUD_API_KEY || '').trim();
  if (!apiKey)
    throw Object.assign(new Error('请在设置 → 闭源服务 → 移动云 MoMA 保存 API Key。'), {
      code: 'PROVIDER_CREDENTIAL_MISSING',
      status: 400,
    });
  const submitUrl = ECLOUD_ENDPOINTS[kind];
  if (params.url && params.url !== submitUrl)
    throw invalid('移动云模型端点与官方 MoMA 接口不匹配。');
  const modelId = params[`${kind}Model`];
  const valid =
    kind === 'text'
      ? ECLOUD_TEXT_MODELS.some(([id]) => id === modelId)
      : kind === 'image'
        ? modelId === 'qwen/qwen-image-2.0-pro'
        : kind === 'audio'
          ? modelId === 'qwen/qwen3-tts-flash'
          : ECLOUD_VIDEO_MODELS[params.videoMode || 'text-to-video'] === modelId;
  if (!valid) throw invalid('移动云模型 ID 或生成模式不受支持，请重新选择模型。');
  return {
    apiKey,
    modelId,
    submitUrl,
    providerName: `Ecloud${kind[0].toUpperCase() + kind.slice(1)}Provider`,
    queryUrl: 'https://moma.cmecloud.cn/api/v1/tasks/',
  };
}
function upstreamError(status, payload) {
  // Inspect upstream evidence without exposing prompts, credentials or raw response bodies.
  const reason = [
    payload?.code,
    payload?.errorCode,
    payload?.error?.code,
    payload?.error?.type,
    payload?.message,
    payload?.errorMessage,
    payload?.error?.message,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  const subscription = /未订购|未开通|not.subscribed|subscription.required|model.not.open/.test(
    reason,
  );
  const quota = /额度|配额|quota|resource.pack|资源包/.test(reason);
  const balance = /余额|欠费|insufficient.balance|insufficient.funds|arrears/.test(reason);
  const paymentMessage = subscription
    ? '移动云拒绝调用：当前账号尚未订购该模型或可用资源包。请在 MoMA 控制台核对模型订购及这把 API Key 的授权。'
    : balance
      ? '移动云拒绝调用：账号余额不足或处于欠费状态。请在移动云控制台核对账户状态，处理后再手动生成。'
      : quota
        ? '移动云拒绝调用：当前模型或 API Key 可用额度不足。请在 MoMA 控制台核对模型资源包、额度和密钥限额。'
        : '移动云拒绝调用（HTTP 402：支付或额度限制）。请在 MoMA 控制台核对 MiniMax 等所选模型的订购、资源包、账户余额及 API Key 额度；本机无法确认具体计费原因。';
  const code =
    status === 402
      ? 'ECLOUD_PAYMENT_REQUIRED'
      : status === 401 || status === 403
        ? 'ECLOUD_AUTH_FAILED'
        : status === 429
          ? 'ECLOUD_RATE_LIMIT'
          : 'ECLOUD_API_ERROR';
  return Object.assign(
    new Error(
      status === 402
        ? paymentMessage
        : status === 401 || status === 403
          ? '移动云未接受当前 API Key 或模型订购权限，请检查 MoMA 控制台。'
          : `移动云请求失败（HTTP ${status || 502}），请核对模型订购、额度及请求参数。`,
    ),
    {
      code,
      status: status === 401 || status === 403 ? 502 : status || 502,
      upstreamStatus: status || 502,
      upstreamCode: [
        payload?.code,
        payload?.errorCode,
        payload?.error?.code,
        payload?.error?.type,
      ].find((value) => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(value)),
      retryable: false,
      expose: true,
    },
  );
}
function integer(value, fallback, min, max, label) {
  const n = value == null ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw invalid(`${label}须为 ${min}–${max} 的整数。`);
  return n;
}
function bool(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw invalid('开关参数必须为 true 或 false。');
}
function seed(params) {
  return params.seed == null ? {} : { seed: integer(params.seed, 0, 0, 2147483647, '随机种子') };
}
function requirePrompt(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw invalid('请输入提示词。');
  return prompt;
}

export function createEcloudHandlers({
  fetcher = (...args) => BaseProvider.fetch(...args),
  submitChat = submitOpenAiChatWithLogs,
  wait = (ms, signal) => delay(ms, undefined, { signal }),
  now = Date.now,
} = {}) {
  async function request(
    url,
    { apiKey, body, signal, async = false, useProxy = false, taskResponse = false, queryModel },
  ) {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(body ? 300_000 : 30_000);
    const options = {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(async ? { 'X-DashScope-Async': 'enable' } : {}),
        ...(queryModel ? { 'X-Model-Name': queryModel } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    BaseProvider.injectProxy(options, useProxy);
    let response;
    try {
      response = await fetcher(url, options);
    } catch (error) {
      if (body) error.submissionUncertain = true;
      throw error;
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw Object.assign(upstreamError(response.status), {
        submissionUncertain: Boolean(body) && (response.ok || response.status >= 500),
      });
    }
    const terminalTask =
      taskResponse && payload?.id && ['failed', 'cancelled', 'expired'].includes(payload.status);
    if (
      !response.ok ||
      payload?.code ||
      (payload?.error && !terminalTask) ||
      Number(payload?.status_code) >= 400
    ) {
      const error = upstreamError(
        !response.ok ? response.status : Number(payload?.status_code) || 502,
        payload,
      );
      if (body && response.status >= 500) error.submissionUncertain = true;
      throw error;
    }
    return payload;
  }
  async function download(url, format, params) {
    const target = publicMediaUrl(url);
    const timeout = AbortSignal.timeout(120_000);
    const options = {
      signal: params.signal ? AbortSignal.any([params.signal, timeout]) : timeout,
      redirect: 'error',
    };
    BaseProvider.injectProxy(options, params.useProxy);
    const response = await fetcher(target, options); // Never send the model credential to a media host.
    if (!response.ok)
      throw new Error(`移动云结果下载失败（HTTP ${response.status}），请保留原任务。`);
    const max = (format === 'mp4' ? 512 : 100) * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > max) {
      await response.body?.cancel();
      throw new Error('移动云结果超过本机下载大小限制。');
    }
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > max) throw new Error('移动云结果超过本机下载大小限制。');
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const valid =
      format === 'png'
        ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : format === 'wav'
          ? buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE'
          : buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
    if (!valid) throw new Error('移动云结果不是预期的媒体文件，未保存无效内容。');
    return { buffer, format };
  }
  async function images(values, params, config, maxMb) {
    return Promise.all(values.map((value) => inlineMedia(value, 'image', params, config, maxMb)));
  }
  async function query(reference, params, config, signal) {
    const ctx = connection('video', params, config);
    if (!matchesRemoteTask(reference, ctx)) return { status: 'unknown' };
    const payload = await request(ctx.queryUrl + encodeURIComponent(reference.taskId), {
      ...ctx,
      signal,
      useProxy: params.useProxy,
    });
    const output = payload.output;
    if (output?.task_id && output.task_id !== reference.taskId) return { status: 'unknown' };
    if (['FAILED', 'CANCELED'].includes(output?.task_status)) return { status: 'failed' };
    if (['PENDING', 'RUNNING'].includes(output?.task_status)) return { status: 'pending' };
    if (output?.task_status !== 'SUCCEEDED' || !output.video_url) return { status: 'unknown' };
    const result = await download(output.video_url, 'mp4', { ...params, signal });
    return matchesRemoteTask(reference, connection('video', params, config))
      ? { status: 'success', ...result }
      : { status: 'unknown' };
  }
  const seedance = createSeedanceVideoProvider({ request, download, wait, now });
  const minimax = createMiniMaxVideoProvider({ request, download, wait, now });
  return {
    EcloudTextProvider: {
      async generateText(params, config) {
        const ctx = connection('text', params, config),
          assets = inputAssets(params);
        const vision = ECLOUD_TEXT_MODELS.find(([id]) => id === ctx.modelId)?.[1];
        const glm = ctx.modelId === ECLOUD_GLM_MODEL;
        if (
          assets.audios.length ||
          (!vision && (assets.images.length || assets.videos.length)) ||
          assets.images.length > 10 ||
          assets.videos.length > 1
        )
          throw invalid('当前移动云文本模型不支持这些参考素材。');
        const content = [{ type: 'text', text: requirePrompt(params.prompt) }];
        for (const url of await images(assets.images, params, config, 10))
          content.push({ type: 'image_url', image_url: { url } });
        for (const value of assets.videos)
          content.push({
            type: 'video_url',
            video_url: {
              url: glm
                ? publicMediaUrl(value)
                : await inlineMedia(value, 'video', params, config, 100),
            },
          });
        const body = {
          model: ctx.modelId,
          messages: [{ role: 'user', content: content.length === 1 ? params.prompt : content }],
          ...(glm
            ? {
                thinking: { type: 'enabled', clear_thinking: false },
                reasoning_effort: params.reasoning_effort ?? 'max',
                tool_stream: true,
                stream_options: { include_usage: true },
              }
            : { enable_thinking: bool(params.enable_thinking, false) }),
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
        if (params.max_tokens != null)
          body.max_tokens = integer(
            params.max_tokens,
            4096,
            1,
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
        if (!result.text) throw new Error('移动云未返回文本内容。');
        return result;
      },
    },
    EcloudImageProvider: {
      async generateImage(params, config) {
        const ctx = connection('image', params, config),
          assets = inputAssets(params);
        const mode = params.imageMode || 'text-to-image';
        if (
          !['text-to-image', 'image-to-image'].includes(mode) ||
          assets.videos.length ||
          assets.audios.length ||
          (mode === 'text-to-image'
            ? assets.images.length !== 0
            : assets.images.length < 1 || assets.images.length > 3)
        )
          throw invalid('文生图不接受图片；图片编辑需要 1–3 张参考图片。');
        const count = integer(params.generateCount, 1, 1, 6, '图片数量');
        const dimensions = IMAGE_SIZES[params.aspectRatio || '1:1'];
        if (!dimensions || !['1K', '2K'].includes(params.resolution || '2K'))
          throw invalid('移动云图片比例或分辨率不支持。');
        const size = dimensions.map((n) => (params.resolution === '1K' ? n / 2 : n)).join('*');
        const content = (await images(assets.images, params, config, 10)).map((image) => ({
          image,
        }));
        content.push({ text: requirePrompt(params.prompt) });
        const parameters = {
          size,
          n: count,
          prompt_extend: bool(params.prompt_extend, true),
          watermark: false,
          ...seed(params),
        };
        if (params.negative_prompt)
          parameters.negative_prompt = String(params.negative_prompt).slice(0, 500);
        const payload = await request(ctx.submitUrl, {
          ...ctx,
          signal: params.signal,
          useProxy: params.useProxy,
          body: {
            model: ctx.modelId,
            input: { messages: [{ role: 'user', content }] },
            parameters,
          },
        });
        const urls =
          payload.output?.choices?.flatMap(
            (choice) =>
              choice.message?.content?.flatMap((item) => (item.image ? [item.image] : [])) || [],
          ) || [];
        if (urls.length !== count)
          throw Object.assign(
            new Error('移动云返回图片数量与请求不一致，请核对服务商记录；不会重新提交。'),
            { submissionUncertain: true },
          );
        try {
          return await Promise.all(urls.map((url) => download(url, 'png', params)));
        } catch (error) {
          error.submissionUncertain = true;
          throw error;
        }
      },
    },
    EcloudVideoProvider: {
      async generateVideo(params, config) {
        if (isEcloudMiniMaxModel(params.videoModel)) return minimax.generateVideo(params, config);
        if (params.videoModel === ECLOUD_SEEDANCE.model)
          return seedance.generateVideo(params, config);
        const ctx = connection('video', params, config),
          assets = inputAssets(params),
          mode = params.videoMode || 'text-to-video';
        const count = assets.images.length;
        if (
          assets.audios.length ||
          (mode === 'text-to-video' && count) ||
          (mode === 'first-frame' && count !== 1) ||
          (mode === 'reference-video' && (count < 1 || count > 9)) ||
          (mode === 'video-edit' && count > 5) ||
          (mode === 'video-edit' ? assets.videos.length !== 1 : assets.videos.length !== 0)
        )
          throw invalid('移动云视频模式与参考素材数量不匹配。');
        const input = {
          prompt:
            mode === 'first-frame' ? String(params.prompt || '') : requirePrompt(params.prompt),
        };
        const urls = await images(assets.images, params, config, 20);
        if (
          urls.some(
            (url) => url.startsWith('data:') && !/^data:image\/(?:jpeg|png|webp);/.test(url),
          )
        )
          throw invalid('移动云视频参考图片仅支持 JPEG、PNG 和 WebP。');
        if (mode !== 'text-to-video')
          input.media = urls.map((url) => ({
            type: mode === 'first-frame' ? 'first_frame' : 'reference_image',
            url,
          }));
        if (mode === 'video-edit')
          input.media.unshift({ type: 'video', url: publicMediaUrl(assets.videos[0]) });
        const resolution = String(params.resolution || '1080p').toUpperCase();
        if (!['720P', '1080P'].includes(resolution))
          throw invalid('移动云视频支持 720p 或 1080p。');
        const parameters = { resolution, watermark: false, ...seed(params) };
        if (mode !== 'video-edit')
          parameters.duration = integer(params.duration, 5, 3, 15, '视频时长');
        if (['text-to-video', 'reference-video'].includes(mode)) {
          const ratio = params.aspectRatio || '16:9';
          if (!VIDEO_RATIOS.includes(ratio)) throw invalid('移动云视频比例不支持。');
          parameters.ratio = ratio;
        }
        if (mode === 'video-edit') {
          if (!['auto', 'origin'].includes(params.audio_setting || 'auto'))
            throw invalid('声音参数无效。');
          parameters.audio_setting = params.audio_setting || 'auto';
        }
        params.signal?.throwIfAborted();
        config.generationTaskSubmitting?.();
        const payload = await request(ctx.submitUrl, {
          ...ctx,
          signal: params.signal,
          useProxy: params.useProxy,
          async: true,
          body: { model: ctx.modelId, input, parameters },
        });
        const reference = remoteTaskReference({ taskId: payload.output?.task_id, ...ctx });
        if (!reference)
          throw Object.assign(new Error('移动云未返回有效任务编号；请核对原任务，不会重新提交。'), {
            submissionUncertain: true,
          });
        config.generationTaskSubmitted?.(reference);
        const deadline = now() + 600_000;
        while (now() < deadline) {
          const result = await query(reference, params, config, params.signal);
          if (result.status === 'success') return { buffer: result.buffer, format: result.format };
          if (result.status === 'failed')
            throw Object.assign(
              new Error('移动云确认视频任务失败或已取消，请核对服务商任务记录。'),
              {
                code: 'ECLOUD_TASK_FAILED',
                status: 502,
                retryable: false,
                expose: true,
                providerTaskFailed: true,
              },
            );
          if (result.status === 'unknown')
            throw new Error('移动云任务状态未知，请保留任务编号并查询原任务。');
          await wait(5000, params.signal);
        }
        throw new Error('等待移动云视频结果超时，可稍后查询原任务。');
      },
      canRecoverVideo(reference, params, config) {
        if (isEcloudMiniMaxModel(params.videoModel))
          return minimax.canRecoverVideo(reference, params, config);
        if (params.videoModel === ECLOUD_SEEDANCE.model)
          return seedance.canRecoverVideo(reference, params, config);
        try {
          return Boolean(matchesRemoteTask(reference, connection('video', params, config)));
        } catch {
          return false;
        }
      },
      recoverVideo(reference, params, config, signal) {
        if (isEcloudMiniMaxModel(params.videoModel))
          return minimax.recoverVideo(reference, params, config, signal);
        if (params.videoModel === ECLOUD_SEEDANCE.model)
          return seedance.recoverVideo(reference, params, config, signal);
        return query(reference, params, config, signal);
      },
    },
    EcloudAudioProvider: {
      async generateAudio(params, config) {
        const ctx = connection('audio', params, config),
          assets = inputAssets(params);
        if (assets.images.length || assets.videos.length || assets.audios.length)
          throw invalid('移动云 TTS 仅接受文本，不支持参考音频或声音克隆。');
        const language = params.language_type || 'Auto';
        if (
          ![
            'Auto',
            'Chinese',
            'English',
            'German',
            'Italian',
            'Portuguese',
            'Spanish',
            'Japanese',
            'Korean',
            'French',
            'Russian',
          ].includes(language)
        )
          throw invalid('移动云 TTS 语种不支持。');
        const payload = await request(ctx.submitUrl, {
          ...ctx,
          signal: params.signal,
          useProxy: params.useProxy,
          body: {
            model: ctx.modelId,
            input: { text: requirePrompt(params.prompt), voice: 'Cherry', language_type: language },
          },
        });
        try {
          if (!payload.output?.audio?.url) throw new Error('移动云未返回完整语音文件 URL。');
          return await download(payload.output.audio.url, 'wav', params);
        } catch (error) {
          error.submissionUncertain = true;
          throw error;
        }
      },
    },
  };
}
export const { EcloudTextProvider, EcloudImageProvider, EcloudVideoProvider, EcloudAudioProvider } =
  createEcloudHandlers();

import { mediaRuntime } from '../../../modules/kernel/server.js';
const getSeedreamV5ProDimensions = (...args) => mediaRuntime().seedreamDimensions(...args);
import { normalizeMidjourneyPrompt } from '../../../modules/contracts/shared/midjourneyPrompt.js';
import { invalid } from './connection.js';
import { prompt, parameters } from './validation.js';
const geometry = (params) => ({
  ...(params.resolution && params.resolution !== 'Auto'
    ? { resolution: params.resolution.toLowerCase() }
    : {}),
  ...(params.aspectRatio && params.aspectRatio !== 'Auto' ? { ratio: params.aspectRatio } : {}),
});
export function videoBody(params, ctx, media) {
  const options = parameters(params, ctx.definition);
  // Omni Flash edits inherit timing from the source; the API does not accept seconds.
  const duration =
    ctx.modelId === 'workfisher-video-g-omni-flash'
      ? undefined
      : (ctx.definition.fixedDuration ?? options.duration);
  if (duration != null && !Number.isInteger(duration)) throw invalid('视频时长须为整数。');
  const metadata = geometry(params);
  if (ctx.mode.fixedAspectRatio) metadata.ratio = ctx.mode.fixedAspectRatio;
  for (const key of ['generate_audio', 'seed', 'return_last_frame'])
    if (options[key] != null) metadata[key] = options[key];
  const body = {
    model: ctx.modelId,
    prompt: prompt(params.prompt),
    ...(duration ? { seconds: String(duration) } : {}),
    metadata,
  };
  if (ctx.mode.value === 'video-edit' && ctx.mode.fixedDuration === -1) {
    metadata.duration = -1;
    delete body.seconds;
  }
  if (
    ctx.mode.value === 'multimodal' ||
    (ctx.mode.value === 'video-edit' && /^seedance-2\.5-.*-multi$/.test(ctx.modelId))
  ) {
    metadata.content = ['image', 'video', 'audio'].flatMap((kind) =>
      media[kind + 's'].map((url) => ({ type: kind + '_url', [kind + '_url']: { url } })),
    );
  } else {
    if (media.images.length) body.images = media.images;
    if (ctx.mode.value === 'video-edit') metadata.video_url = media.videos[0];
  }
  return body;
}
export function imageBody(params, ctx, media) {
  const options = parameters(params, ctx.definition);
  delete options.generateCount;
  const body = {
    model: ctx.modelId,
    prompt: prompt(params.prompt),
    ...(media.images.length ? { images: media.images } : {}),
  };
  if (/^workfisher-image-g-v2\.5-/.test(ctx.modelId)) {
    if (ctx.modelId.endsWith('-lowprice') && body.prompt.length > 5000)
      throw invalid('低价扩展版提示词不能超过 5000 字符。');
    if (options.output_format === 'jpeg' && options.background === 'transparent')
      throw invalid('透明背景请选择 PNG 或 WebP。');
    // The catalog supplies a compression default even when PNG is selected.
    if (!['jpeg', 'webp'].includes(options.output_format)) delete options.output_compression;
    else if (!Number.isInteger(options.output_compression))
      throw invalid('JPEG/WebP 压缩质量须为 0–100 的整数。');
    return {
      ...body,
      n: 1,
      resolution: String(params.resolution || '1K').toLowerCase(),
      ...(params.aspectRatio && params.aspectRatio !== 'Auto' ? { size: params.aspectRatio } : {}),
      ...options,
    };
  }
  body.metadata = { output_format: 'png', ...geometry(params) };
  if (ctx.modelId === 'workfisher-image-gk-v2' && body.metadata.resolution)
    body.metadata.resolution = 'quality';
  if (/^(seedream-v5-pro|dola-seedream-5\.0-pro)-(t2i|i2i)$/.test(ctx.modelId)) {
    const dimensions = getSeedreamV5ProDimensions(params.resolution, params.aspectRatio);
    if (dimensions) {
      body.metadata.size = dimensions.width + 'x' + dimensions.height;
      body.prompt +=
        '\n\n输出规格：' +
        dimensions.width +
        '×' +
        dimensions.height +
        ' 像素，严格保持 ' +
        params.aspectRatio +
        '。';
    }
  }
  return body;
}
export function midjourneyBody(params, ctx, media) {
  const options = parameters(params, ctx.definition);
  delete options.generateCount;
  return {
    prompt: normalizeMidjourneyPrompt(prompt(params.prompt)),
    size: params.aspectRatio && params.aspectRatio !== 'Auto' ? params.aspectRatio : '1:1',
    ...options,
    ...(media.images.length ? { image_urls: media.images } : {}),
    ...media.roles,
  };
}
export function audioBody(params, ctx, media) {
  const options = parameters(params, ctx.definition);
  if (ctx.profileId === 'music') {
    if (ctx.modelId === 'suno-stems') {
      if (!/^[A-Za-z0-9._:-]{1,200}$/.test(options.task_id || ''))
        throw invalid('请填写原始 Suno task_id。');
      return { model: 'suno', task_id: options.task_id, audio_index: options.audio_index };
    }
    return { model: 'suno', prompt: prompt(params.prompt), ...options };
  }
  if (ctx.modelId === 'doubao-seed-audio-1.0') {
    if (options.sample_rate) options.sample_rate = Number(options.sample_rate);
    if (media.audios.length) options.audio_urls = media.audios;
  }
  if (ctx.modelId === 'minimax-voice-clone') options.audio_url = media.audios[0];
  return {
    model: ctx.modelId,
    prompt: prompt(params.prompt),
    metadata: options,
    ...(media.images.length ? { images: media.images } : {}),
  };
}

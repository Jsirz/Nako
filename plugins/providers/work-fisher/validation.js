import { invalid } from './connection.js';
import { inputs } from './media.js';
export function prompt(value) {
  const result = String(value || '').trim();
  if (!result || result.length > 20480) throw invalid('提示词须为 1–20480 个字符。');
  return result;
}
export function validateInputs(kind, params, ctx) {
  const raw = inputs(params),
    mode = ctx.mode.value;
  if (ctx.modelId !== 'suno-stems') prompt(params.prompt);
  for (const type of ['image', 'video', 'audio'])
    if (raw[type + 's'].length > (ctx.mode.allowedInputs[type] || 0))
      throw invalid('参考素材类型或数量超过当前模型模式的限制。');
  if (
    [
      'first-frame',
      'last-frame',
      'image-to-image',
      'reference-video',
      'layer-decomposition',
    ].includes(mode) &&
    !raw.images.length
  )
    throw invalid('当前模式需要参考图片。');
  if (mode === 'i2v-first-last-frame' && raw.images.length !== 2)
    throw invalid('首尾帧模式需要两张图片。');
  if (mode === 'multimodal' && !raw.images.length && !raw.videos.length)
    throw invalid('全能参考至少需要图片或视频。');
  if (mode === 'video-edit' && !raw.videos.length) throw invalid('视频编辑需要参考视频。');
  if (mode === 'voice-clone' && !raw.audios.length) throw invalid('声音克隆需要参考音频。');
  for (const [key, values] of [
    ['resolution', ctx.definition.resolutions],
    ['aspectRatio', ctx.definition.aspectRatios],
  ])
    if (
      params[key] &&
      params[key] !== 'Auto' &&
      !(key === 'aspectRatio' && ctx.mode.fixedAspectRatio) &&
      values.length &&
      !values.some((value) => value.toLowerCase() === String(params[key]).toLowerCase())
    )
      throw invalid('所选分辨率或比例不在当前模型的支持范围内。');
}
/** Only declared parameters reach the provider; normalize UI strings before sending JSON. */
export function parameters(params, definition) {
  const result = {};
  const mode = definition.videoModes?.find((mode) => mode.value === params.videoMode);
  for (const option of definition.advancedParams || []) {
    if (option.key === 'duration' && mode?.fixedDuration !== undefined) {
      result.duration = mode.fixedDuration;
      continue;
    }
    const value = params[option.key] ?? option.default;
    if (value === undefined || value === null || value === '') continue;
    if (option.type === 'toggle') {
      if (![true, false, 'true', 'false'].includes(value))
        throw invalid(option.label + '须为开关值。');
      result[option.key] = value === true || value === 'true';
    } else if (['number', 'slider'].includes(option.type)) {
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        (option.min != null && number < option.min) ||
        (option.max != null && number > option.max)
      )
        throw invalid(option.label + '超出允许范围。');
      result[option.key] = number;
    } else if (option.type === 'select') {
      if (!option.options.some((item) => String(item.value) === String(value)))
        throw invalid(option.label + '选项无效。');
      result[option.key] = value;
    } else {
      if (typeof value !== 'string' || value.length > 10000)
        throw invalid(option.label + '格式无效。');
      result[option.key] = value;
    }
  }
  return result;
}

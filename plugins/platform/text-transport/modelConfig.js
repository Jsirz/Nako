import { doubaoThinkingParameters } from '../../../modules/contracts/thinkingParameters.js';
import { ERRORS } from '../../../modules/contracts/index.js';
import { AgentTextGenerationError } from '../../../modules/contracts/agentTextGeneration.js';

export const TEXT_SOURCES = Object.freeze({
  DoubaoTextProvider: { owner: 'provider.doubao', secret: 'ARK_API_KEY' },
  DeepSeekProvider: { owner: 'provider.deepseek', secret: 'DEEPSEEK_API_KEY' },
  GlmTextProvider: { owner: 'provider.official-text', secret: 'ZHIPU_API_KEY' },
  KimiTextProvider: { owner: 'provider.official-text', secret: 'MOONSHOT_API_KEY' },
  EcloudTextProvider: { owner: 'provider.ecloud', secret: 'ECLOUD_API_KEY' },
  WorkFisherTextProvider: { owner: 'provider.work-fisher', secret: 'WORK_FISHER_API_KEY' },
});
class TextConfigurationError extends AgentTextGenerationError {
  constructor(message, reason = 'INVALID_TEXT_PARAMETERS', status = 400) {
    super(ERRORS.invalidModel, message, { status, context: { reason } });
  }
}
function assertDramaObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some((key) => !keys.includes(key)))
    throw new TextConfigurationError('对话模型参数无效');
}
export function resolveModel(requested, catalog) {
  if (typeof requested !== 'string' || !requested.trim() || requested.length > 255)
    throw new TextConfigurationError('请选择已连接的文本模型', 'DRAMA_MODEL_UNSUPPORTED');
  const entries = Object.values(catalog ?? {}).filter((entry) =>
    Object.hasOwn(TEXT_SOURCES, entry?.provider || ''),
  );
  const named = entries.filter((entry) => entry.name === requested);
  const matching = named.length
    ? named
    : entries.filter((entry) => entry.endpoint?.['multimodal-chat']?.model === requested);
  if (matching.length !== 1)
    throw new TextConfigurationError(
      '文本模型不受支持或来源不明确，请重新选择带来源的模型',
      'DRAMA_MODEL_UNSUPPORTED',
    );
  const model = matching[0];
  const endpoint = model.endpoint?.['multimodal-chat'];
  if (typeof endpoint?.model !== 'string' || !endpoint.model || typeof endpoint?.url !== 'string')
    throw new TextConfigurationError('文本模型目录缺少端点配置', 'DRAMA_MODEL_UNAVAILABLE', 503);
  let url;
  try {
    url = new URL(endpoint.url);
  } catch {
    throw new TextConfigurationError('文本模型端点无效', 'DRAMA_MODEL_UNAVAILABLE', 503);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw new TextConfigurationError('文本模型端点不符合安全要求', 'DRAMA_MODEL_UNAVAILABLE', 503);
  return model;
}

/** Shared provider routing for chat and tool turns; credentials never cross sources. */
export function textModelConnection(model, supplied) {
  resolveModel(model.name, { selected: model });
  const secret = TEXT_SOURCES[model.provider].secret;
  const apiKey = String(supplied?.[secret] || '').trim();
  if (!apiKey)
    throw new AgentTextGenerationError(ERRORS.credentialMissing, '请先连接当前选择的文本模型来源', {
      status: 503, context: { provider: model.provider },
    });
  const endpoint = model.endpoint['multimodal-chat'];
  const url = new URL(endpoint.url).href;
  return { url, apiKey };
}

export function modelParameters(value, model) {
  assertDramaObject(
    value,
    [
      'temperature',
      'top_p',
      'max_output_tokens',
      'reasoning_effort',
      'reasoning',
      'detail',
      'enable_thinking',
    ],
    '规划模型参数',
  );
  const body = {};
  for (const key of ['reasoning', 'detail']) {
    if (value[key] === undefined) continue;
    const allowed =
      model.advancedParams
        ?.find((entry) => entry.key === key)
        ?.options?.map((item) => item.value) ?? [];
    if (!allowed.includes(value[key])) throw new TextConfigurationError('该模型不支持所选对话参数');
  }
  // Image detail belongs to content blocks, not top-level request fields.
  for (const [key, maximum] of [
    ['temperature', 2],
    ['top_p', 1],
  ]) {
    if (value[key] !== undefined) {
      if (
        typeof value[key] !== 'number' ||
        !Number.isFinite(value[key]) ||
        value[key] < 0 ||
        value[key] > maximum
      )
        throw new TextConfigurationError('规划模型采样参数超出范围');
      body[key] = value[key];
    }
  }
  const tokenLimit = value.max_output_tokens;
  if (tokenLimit !== undefined) {
    if (!Number.isSafeInteger(tokenLimit) || tokenLimit < 1)
      throw new TextConfigurationError('输出长度须为正整数');
    body[model.provider === 'DoubaoTextProvider' ? 'max_output_tokens' : 'max_tokens'] = tokenLimit;
  }
  if (model.provider === 'DoubaoTextProvider') {
    Object.assign(body, doubaoThinkingParameters(value.reasoning));
    body.temperature ??= 1;
    body.top_p ??= 0.7;
  }
  if (model.provider === 'DeepSeekProvider') {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = 'high';
  }
  if (
    model.provider === 'GlmTextProvider' &&
    model.endpoint['multimodal-chat'].model.startsWith('glm-5.3')
  ) {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = 'max';
  }
  if (value.reasoning_effort !== undefined) {
    const allowed =
      model.advancedParams
        ?.find((entry) => entry.key === 'reasoning_effort')
        ?.options?.map((item) => item.value) ?? [];
    if (!allowed.includes(value.reasoning_effort))
      throw new TextConfigurationError('该模型不支持所选推理强度');
    body.reasoning_effort = value.reasoning_effort;
  }
  if (model.provider === 'EcloudTextProvider') {
    if (
      value.enable_thinking !== undefined &&
      ![true, false, 'true', 'false'].includes(value.enable_thinking)
    )
      throw new TextConfigurationError('思考模式须为布尔值');
    if (body.temperature !== undefined && body.temperature >= 2)
      throw new TextConfigurationError('移动云温度须小于 2');
    if (body.top_p !== undefined && body.top_p <= 0)
      throw new TextConfigurationError('移动云 top_p 须大于 0');
    if (model.endpoint['multimodal-chat'].model === 'zhipu/glm-5.3-flash') {
      if ([false, 'false'].includes(value.enable_thinking))
        throw new TextConfigurationError('GLM-5.3-Flash 不支持关闭思考模式');
      if (body.max_tokens > 131072) throw new TextConfigurationError('GLM-5.3-Flash 最大输出为 128K Token');
      body.thinking = { type: 'enabled', clear_thinking: false };
      body.reasoning_effort ??= 'max';
      body.tool_stream = true;
      body.stream_options = { include_usage: true };
    } else {
      body.enable_thinking = value.enable_thinking === true || value.enable_thinking === 'true';
    }
  } else if (value.enable_thinking !== undefined)
    throw new TextConfigurationError('当前模型不支持此思考开关');
  return body;
}

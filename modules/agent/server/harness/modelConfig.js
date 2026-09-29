import { doubaoThinkingParameters } from '../../../contracts/thinkingParameters.js';
import { listGenerationProviders } from '../../../generation-core/api/providerRegistry.js';
import { assertDramaObject, DramaPlanError } from '../agent/drama/dramaPlan.js';
export const TEXT_PROVIDERS = new Set([
  'DoubaoTextProvider',
  'DeepSeekProvider',
  'GlmTextProvider',
  'KimiTextProvider',
  'EcloudTextProvider',
  'WorkFisherTextProvider',
]);
const CREDENTIAL_ALIASES = Object.freeze({
  ARK_API_KEY: 'arkApiKey',
  DEEPSEEK_API_KEY: 'deepSeekApiKey',
  ZHIPU_API_KEY: 'zhipuApiKey',
  MOONSHOT_API_KEY: 'moonshotApiKey',
});
const SECRET_BY_PROVIDER = () =>
  new Map(
    listGenerationProviders()
      .filter((item) => TEXT_PROVIDERS.has(item.name))
      .map((item) => [item.name, item.requiredSecrets[0]]),
  );
export function resolveModel(requested, catalog) {
  if (typeof requested !== 'string' || !requested.trim() || requested.length > 255)
    throw new DramaPlanError('请选择已连接的文本模型', 'DRAMA_MODEL_UNSUPPORTED');
  const entries = Object.values(catalog ?? {}).filter(
    (entry) =>
      TEXT_PROVIDERS.has(entry?.provider) &&
      listGenerationProviders().some((provider) => provider.name === entry.provider),
  );
  const named = entries.filter((entry) => entry.name === requested);
  const matching = named.length
    ? named
    : entries.filter((entry) => entry.endpoint?.['multimodal-chat']?.model === requested);
  if (matching.length !== 1)
    throw new DramaPlanError(
      '文本模型不受支持或来源不明确，请重新选择带来源的模型',
      'DRAMA_MODEL_UNSUPPORTED',
    );
  const model = matching[0];
  const endpoint = model.endpoint?.['multimodal-chat'];
  if (typeof endpoint?.model !== 'string' || !endpoint.model || typeof endpoint?.url !== 'string')
    throw new DramaPlanError('文本模型目录缺少端点配置', 'DRAMA_MODEL_UNAVAILABLE', 503);
  let url;
  try {
    url = new URL(endpoint.url);
  } catch {
    throw new DramaPlanError('文本模型端点无效', 'DRAMA_MODEL_UNAVAILABLE', 503);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw new DramaPlanError('文本模型端点不符合安全要求', 'DRAMA_MODEL_UNAVAILABLE', 503);
  return model;
}

/** Shared provider routing for chat and tool turns; credentials never cross sources. */
export function textModelConnection(model, supplied) {
  resolveModel(model.name, { selected: model });
  const secret = SECRET_BY_PROVIDER().get(model.provider);
  const apiKey = String(supplied?.[secret] || supplied?.[CREDENTIAL_ALIASES[secret]] || '').trim();
  if (!apiKey)
    throw new DramaPlanError(
      '请先连接当前选择的文本模型来源',
      'DRAMA_MODEL_CONFIGURATION_REQUIRED',
      503,
    );
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
    if (!allowed.includes(value[key])) throw new DramaPlanError('该模型不支持所选对话参数');
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
        throw new DramaPlanError('规划模型采样参数超出范围');
      body[key] = value[key];
    }
  }
  const tokenLimit = value.max_output_tokens;
  if (tokenLimit !== undefined) {
    if (!Number.isSafeInteger(tokenLimit) || tokenLimit < 1)
      throw new DramaPlanError('输出长度须为正整数');
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
      throw new DramaPlanError('该模型不支持所选推理强度');
    body.reasoning_effort = value.reasoning_effort;
  }
  if (model.provider === 'EcloudTextProvider') {
    if (
      value.enable_thinking !== undefined &&
      ![true, false, 'true', 'false'].includes(value.enable_thinking)
    )
      throw new DramaPlanError('思考模式须为布尔值');
    if (body.temperature !== undefined && body.temperature >= 2)
      throw new DramaPlanError('移动云温度须小于 2');
    if (body.top_p !== undefined && body.top_p <= 0)
      throw new DramaPlanError('移动云 top_p 须大于 0');
    if (model.endpoint['multimodal-chat'].model === 'zhipu/glm-5.3-flash') {
      if ([false, 'false'].includes(value.enable_thinking))
        throw new DramaPlanError('GLM-5.3-Flash 不支持关闭思考模式');
      if (body.max_tokens > 131072) throw new DramaPlanError('GLM-5.3-Flash 最大输出为 128K Token');
      body.thinking = { type: 'enabled', clear_thinking: false };
      body.reasoning_effort ??= 'max';
      body.tool_stream = true;
      body.stream_options = { include_usage: true };
    } else {
      body.enable_thinking = value.enable_thinking === true || value.enable_thinking === 'true';
    }
  } else if (value.enable_thinking !== undefined)
    throw new DramaPlanError('当前模型不支持此思考开关');
  return body;
}

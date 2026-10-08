import { ERRORS } from '../../../modules/contracts/index.js';
import { PROVIDER_ERRORS, providerError } from '../../../modules/contracts/providerErrors.js';
import {
  ECLOUD_ENDPOINTS, ECLOUD_TEXT_MODELS, ECLOUD_VIDEO_MODELS,
} from './protocol.js';
import { ecloudInputError as invalid } from './media.js';

export function connection(kind, params, config) {
  const apiKey = String(config.ECLOUD_API_KEY || '').trim();
  if (!apiKey) throw providerError('请在设置 → 闭源服务 → 移动云 MoMA 保存 API Key。', {
    providerId: 'ecloud', operation: 'configure', code: ERRORS.credentialMissing, status: 400,
  });
  const submitUrl = ECLOUD_ENDPOINTS[kind];
  if (params.url && params.url !== submitUrl)
    throw invalid('移动云模型端点与官方 MoMA 接口不匹配。');
  const modelId = params[`${kind}Model`];
  const valid = kind === 'text'
    ? ECLOUD_TEXT_MODELS.some(([id]) => id === modelId)
    : kind === 'image' ? modelId === 'qwen/qwen-image-2.0-pro'
      : kind === 'audio' ? modelId === 'qwen/qwen3-tts-flash'
        : ECLOUD_VIDEO_MODELS[params.videoMode || 'text-to-video'] === modelId;
  if (!valid) throw invalid('移动云模型 ID 或生成模式不受支持，请重新选择模型。');
  return {
    apiKey, modelId, submitUrl,
    providerName: `Ecloud${kind[0].toUpperCase() + kind.slice(1)}Provider`,
    queryUrl: 'https://moma.cmecloud.cn/api/v1/tasks/',
  };
}

export function upstreamError(status, payload) {
  // Inspect upstream evidence without exposing prompts, credentials or raw response bodies.
  const reason = [payload?.code, payload?.errorCode, payload?.error?.code, payload?.error?.type,
    payload?.message, payload?.errorMessage, payload?.error?.message]
    .filter((value) => typeof value === 'string').join(' ').toLowerCase();
  const subscription = /未订购|未开通|not.subscribed|subscription.required|model.not.open/.test(reason);
  const quota = /额度|配额|quota|resource.pack|资源包/.test(reason);
  const balance = /余额|欠费|insufficient.balance|insufficient.funds|arrears/.test(reason);
  const paymentMessage = subscription
    ? '移动云拒绝调用：当前账号尚未订购该模型或可用资源包。请在 MoMA 控制台核对模型订购及这把 API Key 的授权。'
    : balance
      ? '移动云拒绝调用：账号余额不足或处于欠费状态。请在移动云控制台核对账户状态，处理后再手动生成。'
      : quota
        ? '移动云拒绝调用：当前模型或 API Key 可用额度不足。请在 MoMA 控制台核对模型资源包、额度和密钥限额。'
        : '移动云拒绝调用（HTTP 402：支付或额度限制）。请在 MoMA 控制台核对 MiniMax 等所选模型的订购、资源包、账户余额及 API Key 额度；本机无法确认具体计费原因。';
  const code = status === 402 ? PROVIDER_ERRORS.ecloudPayment
    : status === 401 || status === 403 ? PROVIDER_ERRORS.ecloudAuth
      : status === 429 ? PROVIDER_ERRORS.ecloudRateLimit : PROVIDER_ERRORS.ecloudApi;
  return providerError(status === 402 ? paymentMessage
    : status === 401 || status === 403
      ? '移动云未接受当前 API Key 或模型订购权限，请检查 MoMA 控制台。'
      : `移动云请求失败（HTTP ${status || 502}），请核对模型订购、额度及请求参数。`, {
    providerId: 'ecloud', operation: 'request', code,
    status: status === 401 || status === 403 ? 502 : status || 502,
    upstreamStatus: status || 502,
    upstreamCode: [payload?.code, payload?.errorCode, payload?.error?.code, payload?.error?.type]
      .find((value) => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(value)),
    retryable: false, expose: true,
  });
}

export function integer(value, fallback, min, max, label) {
  const n = value == null ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw invalid(`${label}须为 ${min}–${max} 的整数。`);
  return n;
}
export function bool(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw invalid('开关参数必须为 true 或 false。');
}
export function seed(params) {
  return params.seed == null ? {} : { seed: integer(params.seed, 0, 0, 2147483647, '随机种子') };
}
export function requirePrompt(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw invalid('请输入提示词。');
  return prompt;
}

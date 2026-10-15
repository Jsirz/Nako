import { ERRORS, PluginError } from '../../../modules/contracts/index.js';
import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { annotateProviderError } from '../../../modules/contracts/providerDiagnostics.js';
import { providerError, wrapProviderError } from '../../../modules/contracts/providerErrors.js';
export const defaultFetcher = (...args) => BaseProvider.fetch(...args);
export const failure = (message, extra = {}) =>
  providerError(message, {
    providerId: 'work-fisher', operation: 'request', code: ERRORS.workFisherRequest,
    status: 502, expose: true, retryable: false, ...extra,
  });
export const boundedSignal = (signal, ms) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
export async function boundedBytes(response, max) {
  if (Number(response.headers.get('content-length')) > max) {
    await response.body?.cancel();
    throw failure('Work-Fisher 响应超过本机大小限制。');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > max) throw failure('Work-Fisher 响应超过本机大小限制。');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function createClient(fetcher = defaultFetcher) {
  return async function request(url, { apiKey, body, signal, task = false, form } = {}) {
    const post = body !== undefined || form !== undefined;
    let response;
    try {
      response = await fetcher(url, {
        method: post ? 'POST' : 'GET',
        redirect: 'error',
        signal: boundedSignal(signal, post ? 120000 : 30000),
        headers: {
          Authorization: 'Bearer ' + apiKey,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : form ? { body: form } : {}),
      });
      const raw = await boundedBytes(response, 4 * 1024 * 1024);
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch {
        throw failure('Work-Fisher 响应不是有效 JSON。', {
          retryable: !post,
          submissionUncertain:
            post && (response.ok || response.status === 408 || response.status >= 500),
        });
      }
      if (!response.ok || (payload?.error && !task)) {
        const status = response.status;
        const label =
          status === 401 || status === 403
            ? 'API Key 或模型权限无效'
            : status === 402
              ? '余额或额度不足'
              : status === 429
                ? '请求频率或容量受限'
                : '请求失败，请核对接口类型和参数';
        throw failure('Work-Fisher ' + label + '（HTTP ' + status + '）。', {
          status: response.ok ? 502 : status,
          upstreamStatus: status,
          retryable: status === 408 || status === 429 || status >= 500,
          submissionUncertain: post && (status === 408 || status >= 500),
          publicTaskId: response.headers.get('x-task-id') || undefined,
        });
      }
      return payload;
    } catch (cause) {
      if (cause instanceof PluginError) {
        cause.upstreamStatus ??= response?.status;
        cause.publicTaskId ??= response?.headers.get('x-task-id') || undefined;
        cause.submissionUncertain ??=
          post && (!response || response.ok || response.status === 408 || response.status >= 500);
        throw annotateProviderError(wrapProviderError(cause, { providerId: 'work-fisher', operation: post ? (form ? 'upload' : 'submit') : 'poll' }), { stage: post ? (form ? 'upload' : 'submit') : 'poll', response });
      }
      if (signal?.aborted && !post) throw wrapProviderError(signal.reason, { providerId: 'work-fisher', operation: 'poll' });
      throw annotateProviderError(failure('Work-Fisher 网络中断或响应超时，请查询原任务后再决定是否重试。', {
        retryable: true,
        submissionUncertain: post,
        publicTaskId: response?.headers.get('x-task-id') || undefined,
      }), { stage: post ? (form ? 'upload' : 'submit') : 'poll', response });
    }
  };
}

import { ERRORS, PluginError } from '../../../contracts/errors.js';
export type SettingsRequestOptions = { signal?: AbortSignal };

/** Bounds both headers and body, including transports that ignore abort. Never replays writes. */
export async function requestSettingsJson<T>(
  fetcher: typeof fetch,
  url: string,
  label: string,
  options: SettingsRequestOptions = {},
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  let rejectAbort: (reason: unknown) => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const cancel = () => {
    const reason = options.signal?.reason ?? new DOMException('已取消', 'AbortError');
    rejectAbort(reason);
    controller.abort(reason);
  };
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => {
    const reason = new PluginError(ERRORS.invalidConfiguration, `${label.replace(/失败$/, '')}超时，请核对配置后重试。`, {
      context: { moduleId: 'generation-core', operation: 'requestSettings', url, timeoutMs },
    });
    rejectAbort(reason);
    controller.abort(reason);
  }, timeoutMs);
  try {
    return await Promise.race([
      cancelled,
      (async () => {
        if (controller.signal.aborted) throw controller.signal.reason;
        const response = await fetcher(url, { ...init, signal: controller.signal });
        const body = await response.json();
        if (controller.signal.aborted) throw controller.signal.reason;
        if (!response.ok)
          throw new PluginError(ERRORS.invalidConfiguration,
            typeof body?.error === 'string' ? body.error : `${label} (${response.status})`, {
              status: response.status, context: { moduleId: 'generation-core', operation: 'requestSettings', url, method: init.method || 'GET' },
            });
        return body as T;
      })(),
    ]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    controller.abort();
  }
}


import { LocalComfyClientError } from '../../../modules/contracts/workflowProtocols.js';

export function assertJsonShape(
  value,
  { maxDepth = 80, maxKeys = 100_000, maxArrayItems = 100_000, maxStringBytes = 1024 * 1024 } = {},
) {
  const state = { keys: 0, arrayItems: 0 };
  const scan = (current, depth) => {
    if (depth > maxDepth) {
      throw new LocalComfyClientError(
        'ComfyUI 返回的 JSON 嵌套过深',
        'COMFYUI_RESPONSE_DEPTH_LIMIT',
      );
    }
    if (typeof current === 'string') {
      if (Buffer.byteLength(current, 'utf8') > maxStringBytes) {
        throw new LocalComfyClientError(
          'ComfyUI 返回的 JSON 单个字符串过长',
          'COMFYUI_RESPONSE_STRING_LIMIT',
        );
      }
      return;
    }
    if (Array.isArray(current)) {
      state.arrayItems += current.length;
      if (state.arrayItems > maxArrayItems) {
        throw new LocalComfyClientError(
          'ComfyUI 返回的 JSON 数组项过多',
          'COMFYUI_RESPONSE_ARRAY_LIMIT',
        );
      }
      for (const item of current) scan(item, depth + 1);
      return;
    }
    if (!current || typeof current !== 'object') return;
    for (const [key, child] of Object.entries(current)) {
      state.keys += 1;
      if (state.keys > maxKeys) {
        throw new LocalComfyClientError(
          'ComfyUI 返回的 JSON 字段过多',
          'COMFYUI_RESPONSE_KEY_LIMIT',
        );
      }
      scan(key, depth + 1);
      scan(child, depth + 1);
    }
  };
  scan(value, 0);
}

export async function readResponseBytesWithLimit(response, maximumBytes, signal) {
  try {
    return await readResponseBytes(response, maximumBytes);
  } catch (cause) {
    if (cause instanceof LocalComfyClientError) throw cause;
    const timedOut = signal?.aborted || ['TimeoutError', 'AbortError'].includes(cause?.name);
    throw new LocalComfyClientError(
      timedOut ? 'ComfyUI 请求超时或已取消' : 'ComfyUI 响应传输中断',
      timedOut ? 'COMFYUI_REQUEST_TIMEOUT' : 'COMFYUI_UNAVAILABLE',
      503,
    );
  }
}

export async function readResponseBytes(response, maximumBytes) {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new LocalComfyClientError('ComfyUI 响应超过大小限制', 'COMFYUI_RESPONSE_SIZE_LIMIT');
  }
  if (!response.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  if (typeof response.body.getReader !== 'function') {
    for await (const value of response.body) {
      total += value.byteLength;
      if (total > maximumBytes) {
        response.body.destroy?.();
        throw new LocalComfyClientError('ComfyUI 响应超过大小限制', 'COMFYUI_RESPONSE_SIZE_LIMIT');
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  }
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new LocalComfyClientError('ComfyUI 响应超过大小限制', 'COMFYUI_RESPONSE_SIZE_LIMIT');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

export async function discardBody(response) {
  if (!response?.body) return;
  if (typeof response.body.cancel === 'function') {
    await response.body.cancel().catch(() => undefined);
    return;
  }
  response.body.destroy?.();
}

export function parseJson(bytes, shapeLimits) {
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new LocalComfyClientError('ComfyUI 返回了无效 JSON', 'COMFYUI_INVALID_JSON');
  }
  assertJsonShape(parsed, shapeLimits);
  return parsed;
}

export function boundedSignal(timeoutMs, signal) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
}

export function redactUntrustedText(value, fallback, maximum = 500) {
  return String(value || fallback)
    .replace(/[\r\n]+/g, ' ')
    .replace(/(^|[\s"'(])(?:[A-Za-z]:[\\/]|\\\\|file:\/\/|\/(?!\/))[^\s"'<>;,]*/gi, '$1[本机路径]')
    .replace(
      /\b(?:api[_ -]?key|authorization|bearer|token|secret|password)\b\s*[:=]?\s*[^\s,;]+/gi,
      '[敏感信息]',
    )
    .replace(/\b(?:sk|rk|pk)[-_][A-Za-z0-9._-]{12,}\b/g, '[敏感信息]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]')
    .slice(0, maximum);
}

export function safeNodeErrors(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .slice(0, 100)
    .map(([nodeId, entry]) => ({
      nodeId: redactUntrustedText(nodeId, 'unknown-node', 120),
      errorType: redactUntrustedText(entry?.class_type || entry?.type, 'validation', 120),
      message: redactUntrustedText(
        entry?.errors?.[0]?.message || entry?.errors?.[0]?.details || '节点参数校验失败',
        500,
      ),
    }));
}

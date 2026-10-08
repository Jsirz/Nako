import { PluginError } from './errors.js';

export const NON_LOCAL_COMFY_SERVER = 'NON_LOCAL_COMFY_SERVER';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function normalizeLocalComfyServer(value = '127.0.0.1:8188') {
  const raw = String(value || '').trim() || '127.0.0.1:8188';
  let parsed;
  try {
    parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
  } catch (cause) {
    throw new PluginError(NON_LOCAL_COMFY_SERVER, 'ComfyUI 只允许使用本机回环地址。', {
      cause, status: 400, context: { moduleId: 'contracts', operation: 'normalizeLocalComfyServer' },
    });
  }
  if (parsed.protocol !== 'http:' || !LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())
    || (parsed.pathname && parsed.pathname !== '/') || parsed.username || parsed.password) {
    throw new PluginError(NON_LOCAL_COMFY_SERVER, 'ComfyUI 只允许使用本机回环地址。', {
      status: 400, context: { moduleId: 'contracts', operation: 'normalizeLocalComfyServer' },
    });
  }
  return parsed.host;
}

export const COMFY_RESPONSE_LIMITS = Object.freeze({
  systemStats: 1024 * 1024,
  objectInfo: 64 * 1024 * 1024,
  prompt: 2 * 1024 * 1024,
  history: 128 * 1024 * 1024,
  queue: 64 * 1024 * 1024,
  jobs: 1024 * 1024,
  upload: 1024 * 1024,
  error: 256 * 1024,
});

export const COMFY_REQUEST_TIMEOUTS = Object.freeze({
  systemStats: 10_000,
  objectInfo: 30_000,
  prompt: 30_000,
  history: 30_000,
  queue: 20_000,
  jobs: 10_000,
  cancel: 10_000,
});

export const COMFY_WS_MAX_PAYLOAD = 4 * 1024 * 1024;

export const COMFY_WS_MAX_TEXT = 1024 * 1024;

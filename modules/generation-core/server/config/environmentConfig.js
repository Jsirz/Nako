export const SECRET_MASK = '********';

import { USER_PROVIDER_SECRET_KEYS } from '../../../contracts/providerSecrets.js';
export { USER_PROVIDER_SECRET_KEYS } from '../../../contracts/providerSecrets.js';
export const SECRET_KEYS = new Set(USER_PROVIDER_SECRET_KEYS);

// 第三方来源配置按键名前缀分别管理。

const RUNNINGHUB_KEYS = [
  'RUNNINGHUB_BASE_URL',
  // RH AI站（runninghub.ai）是独立账号，地址与密钥都和 CN 站分开。
  'RUNNINGHUB_GLOBAL_BASE_URL',
  'RUNNINGHUB_IMAGE_MODE',
  'RUNNINGHUB_IMAGE_WEBAPP_ID',
  'RUNNINGHUB_IMAGE_WORKFLOW_ID',
  'RUNNINGHUB_IMAGE_PROMPT_NODE_ID',
  'RUNNINGHUB_IMAGE_PROMPT_FIELD',
  'RUNNINGHUB_IMAGE_INPUT_NODE_ID',
  'RUNNINGHUB_IMAGE_INPUT_FIELD',
  'RUNNINGHUB_IMAGE_IMAGE_NODE_ID',
  'RUNNINGHUB_IMAGE_IMAGE_FIELD',
  'RUNNINGHUB_IMAGE_ASPECT_NODE_ID',
  'RUNNINGHUB_IMAGE_ASPECT_FIELD',
  'RUNNINGHUB_IMAGE_MODEL_NODE_ID',
  'RUNNINGHUB_IMAGE_MODEL_FIELD',
  'RUNNINGHUB_IMAGE_MODEL_VALUE',
  'RUNNINGHUB_IMAGE_ACCESS_PASSWORD',
  'RUNNINGHUB_IMAGE_INSTANCE_TYPE',
  'RUNNINGHUB_IMAGE_RETAIN_SECONDS',
  'RUNNINGHUB_IMAGE_NODE_INFO_JSON',
  'RUNNINGHUB_VIDEO_MODE',
  'RUNNINGHUB_VIDEO_WEBAPP_ID',
  'RUNNINGHUB_VIDEO_WORKFLOW_ID',
  'RUNNINGHUB_VIDEO_PROMPT_NODE_ID',
  'RUNNINGHUB_VIDEO_PROMPT_FIELD',
  'RUNNINGHUB_VIDEO_INPUT_NODE_ID',
  'RUNNINGHUB_VIDEO_INPUT_FIELD',
  'RUNNINGHUB_VIDEO_IMAGE_NODE_ID',
  'RUNNINGHUB_VIDEO_IMAGE_FIELD',
  'RUNNINGHUB_VIDEO_VIDEO_NODE_ID',
  'RUNNINGHUB_VIDEO_VIDEO_FIELD',
  'RUNNINGHUB_VIDEO_AUDIO_NODE_ID',
  'RUNNINGHUB_VIDEO_AUDIO_FIELD',
  'RUNNINGHUB_VIDEO_ASPECT_NODE_ID',
  'RUNNINGHUB_VIDEO_ASPECT_FIELD',
  'RUNNINGHUB_VIDEO_DURATION_NODE_ID',
  'RUNNINGHUB_VIDEO_DURATION_FIELD',
  'RUNNINGHUB_VIDEO_MODEL_NODE_ID',
  'RUNNINGHUB_VIDEO_MODEL_FIELD',
  'RUNNINGHUB_VIDEO_MODEL_VALUE',
  'RUNNINGHUB_VIDEO_ACCESS_PASSWORD',
  'RUNNINGHUB_VIDEO_INSTANCE_TYPE',
  'RUNNINGHUB_VIDEO_RETAIN_SECONDS',
  'RUNNINGHUB_VIDEO_NODE_INFO_JSON',
];

export const NETWORK_KEYS = new Set(['TOS_ENDPOINT', 'HTTPS_PROXY', 'COMFYUI_SERVER_URL']);
export const LOCAL_ONLY_DISABLED_KEYS = new Set(['SERVER_IP', 'COLLAB_HOST']);
const KNOWN_KEYS = new Set([
  ...SECRET_KEYS,
  ...RUNNINGHUB_KEYS,
  'TOS_BUCKET',
  'TOS_REGION',
  'TOS_ENDPOINT',
  'COMFYUI_SERVER_URL',
  'COMFYUI_AUTO_START',
  'COMFYUI_ROOT',
  'COMFYUI_PYTHON',
  'COMFYUI_EXTRA_ARGS',
  'COMFYUI_START_TIMEOUT_MS',
  'SERVER_PORT',
  'VITE_PORT',
  'HTTPS_PROXY',
]);
const MODEL_KEY_PREFIXES = ['MODEL_ENDPOINT_', 'MODEL_PROXY_', 'MODEL_ID_', 'MODEL_URL_'];

export function isAllowedKey(key) {
  return KNOWN_KEYS.has(key) || MODEL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function fixProtocolSlashes(value = '') {
  return String(value || '')
    .trim()
    .replace(/^([a-zA-Z][a-zA-Z\d+.-]*):\/(?!\/)/, '$1://');
}

function parseUrlSafe(value = '') {
  try {
    return new URL(value);
  } catch {
    /* Try the supported shorthand below. */
  }
  try {
    return new URL(`http://${value}`);
  } catch {
    /* Both forms are invalid. */
  }
  return null;
}

export function normalizeNetworkConfigValue(key, value) {
  const trimmed = String(value || '').trim();
  if (!NETWORK_KEYS.has(key) || !trimmed) return trimmed;
  const fixed = fixProtocolSlashes(trimmed).replace(/\s+/g, '');
  const parsed = parseUrlSafe(fixed);
  if (key === 'HTTPS_PROXY') {
    const proxyValue = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(fixed) ? fixed : `http://${fixed}`;
    const proxyUrl = parseUrlSafe(proxyValue);
    return proxyUrl ? `${proxyUrl.protocol}//${proxyUrl.host}` : proxyValue.replace(/\/+$/, '');
  }
  if (!parsed) return fixed.replace(/^(https?|wss?):\/\//i, '').replace(/\/+$/, '');
  if (key === 'TOS_ENDPOINT') return parsed.hostname || parsed.host || fixed;
  if (key === 'COMFYUI_SERVER_URL')
    return parsed.host || `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  return fixed;
}

function decodeValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    if (value.startsWith('"')) {
      try {
        return JSON.parse(value);
      } catch {
        /* Preserve legacy quoted values. */
      }
    }
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, '').trim();
}

export function parseEnvironment(content) {
  const config = {};
  for (const line of String(content || '').split(/\r?\n/)) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].trim();
    if (isAllowedKey(key)) config[key] = decodeValue(match[2]);
  }
  return config;
}

export function safeValue(value) {
  const normalized = String(value ?? '').trim();
  if (normalized.length > 100_000 || /[\r\n\0]/.test(normalized)) {
    throw new Error('Configuration value is invalid');
  }
  return normalized;
}

function encodeValue(value) {
  return /[\s#'"\\]/.test(value) ? JSON.stringify(value) : value;
}

export function serializeEnvironment(config) {
  const lines = [
    '# ============================================================================',
    '# Nako 画布 配置文件 (.env)',
    '# 此文件由设置中心自动管理。',
    '# ============================================================================',
    '',
  ];
  const keys = Object.keys(config).filter(isAllowedKey).sort();
  for (const key of keys) lines.push(`${key} = ${encodeValue(config[key])}`);
  return `${lines.join('\n')}\n`;
}

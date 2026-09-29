/** Shared workflow validation and public error contracts; no network or filesystem access. */
export class LocalComfyClientError extends Error {
  constructor(message, code = 'COMFYUI_PROTOCOL_ERROR', status = 502, details = undefined) {
    super(message);
    this.name = 'LocalComfyClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export function projectRuntimeProtocol(systemStats, supportsAtomicJobCancel) {
  return {
    comfyuiVersion: String(
      systemStats?.system?.comfyui_version ||
        systemStats?.system?.version ||
        systemStats?.comfyui_version ||
        'unknown',
    ).slice(0, 120),
    supportsAtomicJobCancel: Boolean(supportsAtomicJobCancel),
  };
}
export class LocalComfyExecutorError extends Error {
  constructor(message, code = 'WORKFLOW_EXECUTION_ERROR', status = 500, retryable = false) {
    super(message);
    this.name = 'LocalComfyExecutorError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
export class RunningHubWorkflowExecutorError extends Error {
  constructor(
    message,
    code = 'RUNNINGHUB_WORKFLOW_EXECUTION_ERROR',
    status = 500,
    retryable = false,
  ) {
    super(message);
    this.name = 'RunningHubWorkflowExecutorError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
const SAFE_REMOTE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const RUNNINGHUB_HOSTS = new Set([
  'www.runninghub.cn',
  'runninghub.cn',
  'www.runninghub.ai',
  'runninghub.ai',
]);
const RUNNINGHUB_INSTANCE_TYPES = new Set(['default', 'plus']);
export class RunningHubWorkflowClientError extends Error {
  constructor(message, code = 'RUNNINGHUB_WORKFLOW_ERROR', status = 502, retryable = false) {
    super(message);
    this.name = 'RunningHubWorkflowClientError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
export function normalizeRunningHubBaseUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw new RunningHubWorkflowClientError(
      'RunningHub 地址无效',
      'INVALID_RUNNINGHUB_BASE_URL',
      400,
    );
  }
  if (
    url.protocol !== 'https:' ||
    !RUNNINGHUB_HOSTS.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname)
  ) {
    throw new RunningHubWorkflowClientError(
      'RunningHub 地址必须是官方 HTTPS 根地址',
      'INVALID_RUNNINGHUB_BASE_URL',
      400,
    );
  }
  return `${url.protocol}//${url.host}`;
}
export function assertRunningHubRemoteId(value, label = 'RunningHub 工作流标识') {
  const normalized = String(value || '').trim();
  if (!SAFE_REMOTE_ID.test(normalized)) {
    throw new RunningHubWorkflowClientError(`${label}无效`, 'INVALID_RUNNINGHUB_REFERENCE', 400);
  }
  return normalized;
}
export function normalizeRunningHubInstanceType(value) {
  const normalized = String(value || 'plus')
    .trim()
    .toLowerCase();
  if (!RUNNINGHUB_INSTANCE_TYPES.has(normalized)) {
    throw new RunningHubWorkflowClientError(
      'RunningHub 机器配置无效；当前仅支持 Standard 24GB 与 Plus 48GB',
      'INVALID_RUNNINGHUB_INSTANCE_TYPE',
      400,
    );
  }
  return normalized;
}

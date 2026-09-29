import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

import path from 'node:path';

import { LocalComfyClientError } from './client.js';

export const SAFE_PROMPT_ID = /^[A-Za-z0-9._-]{1,200}$/;

export const SAFE_DOMAIN_CODE =
  /^(?:WORKFLOW|COMFYUI|OUTPUT|ASSET|BINDING|INVALID|MISSING|CAPABILITY|MODEL|INPUT|GENERATION)_/;

export function stagedHandleValue(handle) {
  return handle.subfolder ? `${handle.subfolder}/${handle.name}` : handle.name;
}

export function extensionFor(filename) {
  const extension = path.extname(String(filename || '')).toLowerCase();
  if (!/^\.[a-z\d]{1,10}$/.test(extension)) return '.bin';
  return extension;
}

export function sanitizeFailureMessage(value, fallback = '工作流测试失败') {
  const message = String(value || fallback)
    .replace(/[\r\n]+/g, ' ')
    .replace(/file:\/\/\S+/gi, '[本机路径]')
    .replace(/(?:[A-Za-z]:[\\/]|\\\\)[^\s,;]+/g, '[本机路径]')
    .replace(/\/(?:Users|home|private|var|opt|mnt)\/[^\s,;]+/gi, '[本机路径]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]')
    .replace(
      /\b(?:api[_ -]?key|authorization|bearer|token|secret|password)\b\s*[:=]?\s*[^\s,;]+/gi,
      '[敏感信息]',
    )
    .slice(0, 500);
  return message || fallback;
}

export function safeFailureNodeErrors(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    return [
      {
        nodeId: sanitizeFailureMessage(entry.nodeId, 'unknown-node').slice(0, 120),
        errorType: sanitizeFailureMessage(entry.errorType, 'validation').slice(0, 120),
        message: sanitizeFailureMessage(entry.message, '节点参数校验失败'),
      },
    ];
  });
}

export function assertPromptId(value) {
  const promptId = String(value || '');
  if (!SAFE_PROMPT_ID.test(promptId)) {
    throw new LocalComfyExecutorError(
      'ComfyUI 未返回有效 prompt_id',
      'COMFYUI_PROTOCOL_ERROR',
      502,
    );
  }
  return promptId;
}

export function safeFailure(error) {
  if (error instanceof LocalComfyExecutorError) return error;
  if (error instanceof LocalComfyClientError) {
    const failure = new LocalComfyExecutorError(
      sanitizeFailureMessage(error.message),
      error.code,
      error.status,
      ['COMFYUI_UNAVAILABLE', 'COMFYUI_REQUEST_TIMEOUT'].includes(error.code),
    );
    failure.nodeErrors = safeFailureNodeErrors(error.details?.nodeErrors);
    return failure;
  }
  if (typeof error?.code === 'string' && SAFE_DOMAIN_CODE.test(error.code)) {
    return new LocalComfyExecutorError(
      sanitizeFailureMessage(error.message),
      error.code,
      Number(error.status) || 400,
      Boolean(error.retryable),
    );
  }
  return new LocalComfyExecutorError('工作流测试失败', 'WORKFLOW_EXECUTION_ERROR');
}

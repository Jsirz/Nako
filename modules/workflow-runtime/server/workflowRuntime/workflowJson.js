import crypto from 'node:crypto';

export const WORKFLOW_LIMITS = Object.freeze({
  maxBytes: 20 * 1024 * 1024,
  maxNodes: 5_000,
  maxLinks: 20_000,
  maxDepth: 80,
});

export class WorkflowFormatError extends Error {
  constructor(message, code = 'INVALID_WORKFLOW', details = undefined) {
    super(message);
    this.name = 'WorkflowFormatError';
    this.code = code;
    this.details = details;
  }
}

export function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function assertJsonDepth(value, maximum, depth = 0) {
  if (depth > maximum) {
    throw new WorkflowFormatError('工作流 JSON 嵌套过深', 'WORKFLOW_DEPTH_LIMIT');
  }
  if (Array.isArray(value)) {
    for (const item of value) assertJsonDepth(item, maximum, depth + 1);
    return;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) assertJsonDepth(item, maximum, depth + 1);
  }
}

export function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((key) => [key, canonicalValue(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256Json(value) {
  return sha256Bytes(canonicalJson(value));
}

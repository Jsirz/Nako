export const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;

export const REQUEST_LIMITS = Object.freeze({
  maxBytes: 4 * 1024 * 1024,
  maxDepth: 16,
  maxKeys: 512,
  maxArrayItems: 100,
  maxStringBytes: 64 * 1024,
});

export class WorkflowBindingError extends Error {
  constructor(message, code = 'INVALID_BINDING', status = 400, details = undefined) {
    super(message);
    this.name = 'WorkflowBindingError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function define(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

export function cloneNullPrototype(value) {
  if (Array.isArray(value)) return value.map(cloneNullPrototype);
  if (!isPlainObject(value)) return value;
  const cloned = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    define(cloned, key, cloneNullPrototype(child));
  }
  return cloned;
}

export function assertSafeKey(value, label = '参数 key') {
  const key = String(value || '');
  if (!KEY_PATTERN.test(key) || DANGEROUS_KEYS.has(key)) {
    throw new WorkflowBindingError(`${label}无效`, 'INVALID_BINDING_KEY');
  }
  return key;
}

export function assertSafeText(value, label, maximum, fallback = '') {
  const normalized = String(value ?? fallback).trim();
  // eslint-disable-next-line no-control-regex -- Deliberately reject or strip control characters.
  if (
    Buffer.byteLength(normalized, 'utf8') > maximum ||
    /[\0\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)
  ) {
    throw new WorkflowBindingError(`${label}无效或超过限制`, 'INVALID_BINDING_PRESENTATION');
  }
  return normalized;
}

export function assertNoDangerousKeys(value, depth = 0, state = { keys: 0 }) {
  if (depth > REQUEST_LIMITS.maxDepth) {
    throw new WorkflowBindingError('参数嵌套过深', 'BINDING_VALUES_DEPTH_LIMIT');
  }
  if (
    typeof value === 'string' &&
    Buffer.byteLength(value, 'utf8') > REQUEST_LIMITS.maxStringBytes
  ) {
    throw new WorkflowBindingError('参数字符串超过限制', 'BINDING_VALUE_SIZE_LIMIT');
  }
  if (Array.isArray(value)) {
    if (value.length > REQUEST_LIMITS.maxArrayItems) {
      throw new WorkflowBindingError('参数数组超过限制', 'BINDING_VALUES_ARRAY_LIMIT');
    }
    for (const item of value) assertNoDangerousKeys(item, depth + 1, state);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    state.keys += 1;
    if (state.keys > REQUEST_LIMITS.maxKeys) {
      throw new WorkflowBindingError('参数字段数量超过限制', 'BINDING_VALUES_KEY_LIMIT');
    }
    if (DANGEROUS_KEYS.has(key)) {
      throw new WorkflowBindingError('参数包含危险字段', 'DANGEROUS_BINDING_KEY');
    }
    assertNoDangerousKeys(child, depth + 1, state);
  }
}

export function assertRequestBudgets(values) {
  if (!isPlainObject(values)) {
    throw new WorkflowBindingError('values 必须是对象', 'INVALID_BINDING_VALUES');
  }
  if (Buffer.byteLength(JSON.stringify(values), 'utf8') > REQUEST_LIMITS.maxBytes) {
    throw new WorkflowBindingError('参数请求超过 4 MiB', 'BINDING_VALUES_SIZE_LIMIT', 413);
  }
  assertNoDangerousKeys(values);
}

export function isConnection(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    (typeof value[0] === 'string' || typeof value[0] === 'number') &&
    Number.isInteger(value[1]) &&
    value[1] >= 0
  );
}

export function validateNumber(value, binding, integer) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (integer && !Number.isInteger(value))
  ) {
    throw new WorkflowBindingError(
      `${binding.label}必须是${integer ? '整数' : '数字'}`,
      'INVALID_BINDING_VALUE',
    );
  }
  const { minimum, maximum, step } = binding.control;
  if (Number.isFinite(minimum) && value < minimum) {
    throw new WorkflowBindingError(`${binding.label}低于最小值`, 'INVALID_BINDING_VALUE');
  }
  if (Number.isFinite(maximum) && value > maximum) {
    throw new WorkflowBindingError(`${binding.label}超过最大值`, 'INVALID_BINDING_VALUE');
  }
  if (Number.isFinite(step) && step > 0) {
    const origin = Number.isFinite(minimum) ? minimum : 0;
    const quotient = (value - origin) / step;
    if (Math.abs(quotient - Math.round(quotient)) > 1e-8) {
      throw new WorkflowBindingError(`${binding.label}不符合步长`, 'INVALID_BINDING_VALUE');
    }
  }
  return value;
}

export function validateAssetReference(value, binding, projectId) {
  if (!isPlainObject(value)) {
    throw new WorkflowBindingError(`${binding.label}必须选择项目素材`, 'INVALID_BINDING_ASSET');
  }
  const allowed = new Set(['assetId', 'projectId', 'type']);
  if (Object.keys(value).some((key) => !allowed.has(key) || DANGEROUS_KEYS.has(key))) {
    throw new WorkflowBindingError(`${binding.label}素材引用含非法字段`, 'INVALID_BINDING_ASSET');
  }
  const assetId = String(value.assetId || '');
  const assetProjectId = String(value.projectId || '');
  const type = String(value.type || '');
  if (!assetId || assetId.length > 200 || assetProjectId !== projectId) {
    throw new WorkflowBindingError(`${binding.label}素材不属于当前项目`, 'ASSET_PROJECT_MISMATCH');
  }
  if (binding.control.mediaKind && type !== binding.control.mediaKind) {
    throw new WorkflowBindingError(`${binding.label}素材类型不匹配`, 'INVALID_BINDING_ASSET');
  }
  return { assetId, projectId: assetProjectId, type };
}

export function validateScalarValue(value, binding) {
  const { kind, options } = binding.control;
  if (kind === 'select') {
    if (!Array.isArray(options) || !options.some((option) => Object.is(option, value))) {
      throw new WorkflowBindingError(`${binding.label}选项无效`, 'INVALID_BINDING_VALUE');
    }
    return value;
  }
  if (kind === 'toggle') {
    if (typeof value !== 'boolean') {
      throw new WorkflowBindingError(`${binding.label}必须是开关值`, 'INVALID_BINDING_VALUE');
    }
    return value;
  }
  if (kind === 'number' || kind === 'slider') {
    return validateNumber(value, binding, binding.target.expectedValueType === 'INT');
  }
  if (kind === 'text' || kind === 'textarea') {
    if (
      typeof value !== 'string' ||
      Buffer.byteLength(value, 'utf8') > REQUEST_LIMITS.maxStringBytes ||
      value.includes('\0')
    ) {
      throw new WorkflowBindingError(`${binding.label}文本无效或超过限制`, 'INVALID_BINDING_VALUE');
    }
    return value;
  }
  throw new WorkflowBindingError(`${binding.label}控件类型不受支持`, 'INVALID_BINDING_CONTROL');
}

export function assertReferences({ executionPlanHash, bindingSet, deployment, projectId }) {
  if (
    !projectId ||
    projectId === '.' ||
    projectId === '..' ||
    String(projectId).length > 200 ||
    /[\\/\0\r\n]/.test(String(projectId))
  ) {
    throw new WorkflowBindingError('项目标识无效', 'INVALID_PROJECT_REFERENCE');
  }
  const expected = [bindingSet.executionPlanHash, deployment.executionPlanHash, executionPlanHash];
  if (new Set(expected).size !== 1 || bindingSet.definitionId !== deployment.definitionId) {
    throw new WorkflowBindingError('工作流配置引用冲突', 'WORKFLOW_REFERENCE_CONFLICT', 409);
  }
  if (bindingSet.definitionRevision !== deployment.definitionRevision) {
    throw new WorkflowBindingError('工作流定义版本不一致', 'WORKFLOW_REFERENCE_CONFLICT', 409);
  }
}

export function isBindingRequiredForDeployment(binding, deployment) {
  if (deployment?.runner !== 'runninghub-webapp') {
    return Boolean(binding?.control?.required);
  }
  const classType = String(binding?.target?.expectedClassType || '');
  const fieldName = String(binding?.target?.fieldName || '');
  const definition = deployment?.relevantCapabilities?.[classType];
  const required = definition?.input?.required;
  const optional = definition?.input?.optional;
  if (required && Object.hasOwn(required, fieldName)) return true;
  if (optional && Object.hasOwn(optional, fieldName)) return false;
  return Boolean(binding?.control?.required);
}

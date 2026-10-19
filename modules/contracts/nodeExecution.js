import { PluginError } from './errors.js';
/** Public node execution errors, capability names and supported JSON schema subset. */
export const NODE_CAPABILITIES = Object.freeze([
  'models.generate', 'media.inspect', 'media.read', 'media.compose', 'media.prepareAnalysis', 'media.validateAnalysis', 'media.validateReplica', 'media.extractAnalysis',
  'workflow.execute', 'project.read', 'storage.get', 'storage.set',
]);
export const NODE_ERROR = Object.freeze({
  INVALID: 'NODE_INVALID', DENIED: 'NODE_CAPABILITY_DENIED', MISSING: 'NODE_EXECUTOR_MISSING',
  VERSION: 'NODE_VERSION_MISMATCH', CANCELLED: 'NODE_EXECUTION_CANCELLED', TIMEOUT: 'NODE_TIMEOUT',
  CONFLICT: 'NODE_REQUEST_CONFLICT', REVISION: 'REVISION_CONFLICT', BUDGET: 'NODE_BUDGET_EXCEEDED',
  UNCONFIRMED: 'NODE_CONFIRMATION_REQUIRED', FAILED: 'NODE_EXECUTION_FAILED', NOT_FOUND: 'NODE_RUN_NOT_FOUND',
});
export function nodeError(code, message, details) {
  const status = code === NODE_ERROR.DENIED ? 403 : code === NODE_ERROR.NOT_FOUND ? 404
    : code === NODE_ERROR.CANCELLED ? 499 : code === NODE_ERROR.TIMEOUT ? 504
      : code === NODE_ERROR.FAILED ? 500 : 400;
  return Object.assign(new PluginError(code, message, {
    status, context: { moduleId: 'contracts', operation: 'nodeExecution' },
  }), { details });
}
export const jsonClone = value => JSON.parse(JSON.stringify(value));
export const isNodeRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const keywords = new Set(['type', 'title', 'description', 'default', 'enum', 'properties', 'required',
  'additionalProperties', 'items', 'minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'maximum']);
export function validateNodeSchema(schema, depth = 0) {
  if (!isNodeRecord(schema) || depth > 12) throw nodeError(NODE_ERROR.INVALID, '节点参数 schema 无效或嵌套过深');
  for (const key of Object.keys(schema)) if (!keywords.has(key)) throw nodeError(NODE_ERROR.INVALID, `不支持的 schema 关键字: ${key}`);
  if (!['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(schema.type))
    throw nodeError(NODE_ERROR.INVALID, 'schema 必须声明 type');
  if (schema.enum && (!Array.isArray(schema.enum) || !schema.enum.length)) throw nodeError(NODE_ERROR.INVALID, 'enum 必须非空');
  if (schema.type === 'object') {
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw nodeError(NODE_ERROR.INVALID, '禁止的参数名');
      validateNodeSchema(child, depth + 1);
    }
    if (schema.required && (!Array.isArray(schema.required) || schema.required.some(key => !Object.hasOwn(schema.properties || {}, key))))
      throw nodeError(NODE_ERROR.INVALID, 'required 包含未声明的属性');
  }
  if (schema.type === 'array') validateNodeSchema(schema.items, depth + 1);
  return schema;
}

export function validateNodeValue(schema, value, path = 'parameters') {
  if (!schema) return value;
  if (value === undefined && schema.default !== undefined) value = jsonClone(schema.default);
  if (value === undefined) return value;
  const fail = message => { throw nodeError(NODE_ERROR.INVALID, `${path}: ${message}`); };
  const type = schema.type;
  if ((type === 'object' && !isNodeRecord(value)) || (type === 'array' && !Array.isArray(value)) ||
    (type === 'null' && value !== null) || (['string', 'boolean'].includes(type) && typeof value !== type) ||
    (['number', 'integer'].includes(type) && (typeof value !== 'number' || !Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value))))) fail(`需要 ${type}`);
  if (schema.enum && !schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) fail('不在允许的选项中');
  if (type === 'object') {
    const result = {};
    for (const key of Object.keys(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('禁止的属性');
      if (!Object.hasOwn(schema.properties || {}, key) && schema.additionalProperties !== true) fail(`未知参数 ${key}`);
      if (schema.additionalProperties === true) result[key] = value[key];
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      const item = validateNodeValue(child, value[key], `${path}.${key}`);
      if (item !== undefined) result[key] = item;
    }
    for (const key of schema.required || []) if (result[key] === undefined) fail(`缺少 ${key}`);
    return result;
  }
  if (type === 'array') {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? 10000)) fail('数组长度超出范围');
    return value.map((item, index) => validateNodeValue(schema.items, item, `${path}[${index}]`));
  }
  if (type === 'string' && (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 1000000))) fail('文本长度超出范围');
  if (['number', 'integer'].includes(type) && (value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) fail('数值超出范围');
  return value;
}

export function validatePortValue(port, value) {
  if (port.schema) return validateNodeValue(port.schema, value, `port.${port.id}`);
  if (port.media.includes('any') || port.media.includes('json')) return jsonClone(value);
  if (typeof value !== 'string' && !(isNodeRecord(value) && typeof value.url === 'string'))
    throw nodeError(NODE_ERROR.INVALID, `端口 ${port.id} 需要文本或媒体引用`);
  return value;
}

import { UserScopeError, USER_SCOPE_ERRORS } from './projectErrors.js';
const CANONICAL_OPAQUE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RESERVED_NAMES = new Set([
  '.',
  '..',
  'aux',
  'com1',
  'con',
  'global',
  'lpt1',
  'nul',
  'prn',
  'shared',
  'system',
  'temp',
  'tmp',
  'users',
]);
const WINDOWS_RESERVED_NAME = /^(?:aux|com[1-9]|con|lpt[1-9]|nul|prn)(?:\.|$)/;


export function assertCanonicalOpaqueUserId(value) {
  if (typeof value !== 'string' || !value) {
    throw new UserScopeError('认证主体缺少不透明用户标识', USER_SCOPE_ERRORS.missingSubject, 401);
  }
  if (value !== value.normalize('NFC') || /[^\x20-\x7e]/.test(value)) {
    throw new UserScopeError('认证主体不是规范 ASCII 标识', USER_SCOPE_ERRORS.confusableSubject);
  }
  if (value !== value.toLowerCase()) {
    throw new UserScopeError('认证主体大小写不规范', USER_SCOPE_ERRORS.nonCanonicalSubject);
  }
  if (
    RESERVED_NAMES.has(value)
    || WINDOWS_RESERVED_NAME.test(value)
    || value.includes('/')
    || value.includes('\\')
  ) {
    throw new UserScopeError('认证主体使用了保留名称或路径字符', USER_SCOPE_ERRORS.reservedSubject);
  }
  if (!CANONICAL_OPAQUE_USER_ID.test(value) || value === '00000000-0000-0000-0000-000000000000') {
    throw new UserScopeError('认证主体不是规范不透明用户标识', USER_SCOPE_ERRORS.invalidSubject);
  }
  return value;
}

export const DEFAULT_SHARED_RESOURCE_ALLOWLIST = Object.freeze({
  'public-shell': 'public-shell',
  'model-files': 'models',
  'integration-adapters': 'integrations',
  'device-runtime-config': 'device',
});


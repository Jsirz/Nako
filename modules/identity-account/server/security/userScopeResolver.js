import { UserScopeError, USER_SCOPE_ERRORS } from '../../../contracts/projectErrors.js';
export { UserScopeError } from '../../../contracts/projectErrors.js';
import path from 'node:path';
import { assertCanonicalOpaqueUserId, DEFAULT_SHARED_RESOURCE_ALLOWLIST } from '../../../contracts/userIdentity.js';

const AUTHENTICATION_CONTEXTS = new WeakMap();
function assertContained(rootDirectory, candidate) {
  const root = path.resolve(rootDirectory);
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new UserScopeError('用户路径越出作用域', USER_SCOPE_ERRORS.pathEscape);
  }
  return resolved;
}

function validateAllowlist(allowlist) {
  const normalized = {};
  for (const [resourceId, relativePath] of Object.entries(allowlist || {})) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(resourceId)) {
      throw new UserScopeError('共享资源标识无效', USER_SCOPE_ERRORS.invalidAllowlist, 500);
    }
    const raw = String(relativePath || '').replaceAll('\\', '/');
    const safe = path.posix.normalize(raw);
    if (!safe || safe === '..' || safe.startsWith('../') || safe.startsWith('/')) {
      throw new UserScopeError('共享资源路径无效', USER_SCOPE_ERRORS.invalidAllowlist, 500);
    }
    normalized[resourceId] = safe;
  }
  return Object.freeze(normalized);
}

function registerAuthenticationContext({ opaqueUserId, sessionId, tokenId, issuedAt, expiresAt }) {
  const context = Object.freeze({ authenticated: true });
  AUTHENTICATION_CONTEXTS.set(context, Object.freeze({
    opaqueUserId: assertCanonicalOpaqueUserId(opaqueUserId),
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    tokenId: typeof tokenId === 'string' ? tokenId : null,
    issuedAt: Number.isSafeInteger(issuedAt) ? issuedAt : null,
    expiresAt: Number.isSafeInteger(expiresAt) ? expiresAt : null,
  }));
  return context;
}

/**
 * Creates the only context accepted by the user-scope resolver. The verifier is
 * the server-side signed-token verifier; request headers, cookies, query values,
 * bodies and collaboration room names never become identity inputs here.
 */
export async function createServerAuthenticationContext({ accessToken, verifier }) {
  if (!verifier || typeof verifier.verify !== 'function') {
    throw new UserScopeError('服务端认证验证器缺失', USER_SCOPE_ERRORS.missingVerifier, 500);
  }
  const claims = await verifier.verify(accessToken);
  return registerAuthenticationContext({
    opaqueUserId: claims?.sub,
    sessionId: claims?.sid,
    tokenId: claims?.jti,
    issuedAt: claims?.iat,
    expiresAt: claims?.exp,
  });
}

/**
 * The desktop backend serves exactly one user, chosen by the Electron main process
 * before it starts the backend; no request input can change it.
 */
export function createActiveUserAuthenticationContext(identity) {
  return registerAuthenticationContext(identity || {});
}

export function resolveServerAuthenticationIdentity(authenticationContext) {
  const identity = AUTHENTICATION_CONTEXTS.get(authenticationContext);
  if (!identity) {
    throw new UserScopeError('仅接受服务端已验证认证上下文', USER_SCOPE_ERRORS.authenticationRequired);
  }
  return identity;
}

export function createUserScopeResolver({
  usersDirectory,
  globalDirectory,
  sharedResourceAllowlist = DEFAULT_SHARED_RESOURCE_ALLOWLIST,
  directories,
} = {}) {
  if (!usersDirectory || !globalDirectory) {
    throw new UserScopeError('用户或全局数据根目录缺失', USER_SCOPE_ERRORS.missingRoot, 500);
  }
  const usersRoot = path.resolve(usersDirectory);
  const globalRoot = path.resolve(globalDirectory);
  const sharedAllowlist = validateAllowlist(sharedResourceAllowlist);
  const initializedScopes = new Map();

  function resolve(authenticationContext) {
    const identity = resolveServerAuthenticationIdentity(authenticationContext);
    const opaqueUserId = assertCanonicalOpaqueUserId(identity.opaqueUserId);
    const rootDirectory = assertContained(usersRoot, path.join(usersRoot, opaqueUserId));
    const libraryDirectory = assertContained(rootDirectory, path.join(rootDirectory, 'library'));
    const privateDirectory = assertContained(rootDirectory, path.join(rootDirectory, 'private'));
    const temporaryDirectory = assertContained(rootDirectory, path.join(rootDirectory, 'tmp'));
    return Object.freeze({
      opaqueUserId,
      rootDirectory,
      libraryDirectory,
      mediaDirectory: path.join(libraryDirectory, 'media'),
      workflowDatabasePath: path.join(libraryDirectory, 'workflows.db'),
      agentSessionDirectory: path.join(libraryDirectory, 'agent', 'sessions'),
      yjsDatabasePath: path.join(libraryDirectory, 'collab', 'yjs-updates.db'),
      privateDirectory,
      agentSkillDirectory: path.join(privateDirectory, 'agent-skills'),
      executionWorkflowDirectory: path.join(privateDirectory, 'execution-workflows'),
      generationJournalPath: path.join(privateDirectory, 'generation', 'generation-tasks.json'),
      configDirectory: path.join(rootDirectory, 'config'),
      providerEnvironmentPath: path.join(rootDirectory, 'config', 'providers.env'),
      cacheDirectory: path.join(rootDirectory, 'cache'),
      temporaryDirectory,
      publicLibraryUrl: '/library',
    });
  }

  function resolveSharedResource(resourceId) {
    const relativePath = sharedAllowlist[resourceId];
    if (!relativePath) {
      throw new UserScopeError('共享资源不在显式白名单中', USER_SCOPE_ERRORS.notAllowlisted);
    }
    return assertContained(globalRoot, path.join(globalRoot, ...relativePath.split('/')));
  }

  function ensureDirectories(authenticationContext) {
    const scope = resolve(authenticationContext);
    const initialized = initializedScopes.get(scope.opaqueUserId);
    if (!directories?.ensureDirectory) throw new UserScopeError('用户目录适配器未注入', USER_SCOPE_ERRORS.missingDirectoryService, 503);
    if (initialized) return initialized;
    for (const directory of [
      scope.libraryDirectory,
      scope.mediaDirectory,
      scope.privateDirectory,
      scope.configDirectory,
      scope.cacheDirectory,
      scope.temporaryDirectory,
    ]) {
      directories.ensureDirectory(directory);
    }
    initializedScopes.set(scope.opaqueUserId, scope);
    return scope;
  }

  return Object.freeze({ resolve, resolveSharedResource, ensureDirectories });
}

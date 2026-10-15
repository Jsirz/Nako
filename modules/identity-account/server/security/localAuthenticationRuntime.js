import { createUserScopeResolver } from './userScopeResolver.js';

function configured(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function trustedOrigins(value, port) {
  const configuredOrigins = configured(value);
  return configuredOrigins
    ? configuredOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
}

export function inspectLocalAuthenticationConfiguration({
  env = process.env,
  runtimePaths,
  port,
  directories,
} = {}) {
  const activeOpaqueUserId = runtimePaths?.ACTIVE_OPAQUE_USER_ID;
  if (!activeOpaqueUserId)
    return Object.freeze({ ready: false, code: 'LOCAL_AUTHENTICATION_LOCKED' });
  try {
    const userScopeResolver = createUserScopeResolver({
      usersDirectory: runtimePaths.USERS_DATA_DIR,
      globalDirectory: runtimePaths.GLOBAL_DATA_DIR,
      directories,
    });
    return Object.freeze({
      ready: true,
      activeOpaqueUserId,
      userScopeResolver,
      trustedOrigins: Number.isInteger(port)
        ? trustedOrigins(env.NAKO_TRUSTED_ORIGINS, port)
        : null,
    });
  } catch {
    return Object.freeze({ ready: false, code: 'LOCAL_AUTHENTICATION_LOCKED' });
  }
}

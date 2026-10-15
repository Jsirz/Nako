import { IDENTITY_ERRORS, identityError } from '../../../contracts/identityErrors.js';
import {
  createActiveUserAuthenticationContext,
  UserScopeError,
} from './userScopeResolver.js';

const PROXY_HEADERS = [
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
];
const REQUEST_CONTEXTS = new WeakMap();
const DESKTOP_SESSION_ID = 'desktop';
// The local identity expires with the desktop backend process.
const ACTIVE_USER_CONTEXT_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

function publicError(response, status, code, message) {
  response.status(status).json({ error: message, code });
}

function parseTrustedOrigins(values) {
  const origins = new Set();
  for (const value of values || []) {
    let parsed;
    try { parsed = new URL(value); }
    catch { throw identityError(IDENTITY_ERRORS.originInvalid, 'Trusted browser origin is invalid', 'authentication.origins'); }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    )
      throw identityError(IDENTITY_ERRORS.originInvalid, 'Trusted browser origin is invalid', 'authentication.origins');
    origins.add(parsed.origin);
  }
  if (origins.size === 0) throw identityError(IDENTITY_ERRORS.originInvalid, 'At least one trusted browser origin is required', 'authentication.origins');
  return origins;
}

function hasProxyHeaders(request) {
  return PROXY_HEADERS.some((header) => request.headers[header] !== undefined);
}

// Only for the loopback TCP listener: it keeps other web pages in the user's browser away
// from the local port. The named pipe is unreachable from browsers and needs no such check.
export function createExactLocalBoundary({ trustedOrigins }) {
  const allowedOrigins = parseTrustedOrigins(trustedOrigins);
  const allowedHeaders = 'Content-Type, X-Request-Id';
  const allowedMethods = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';

  return (request, response, next) => {
    if (hasProxyHeaders(request)) {
      publicError(response, 403, 'UNTRUSTED_PROXY', '请求来源不受信任');
      return;
    }
    const origin = request.headers.origin;
    if (origin !== undefined && !allowedOrigins.has(origin)) {
      publicError(response, 403, 'UNTRUSTED_ORIGIN', '请求来源不受信任');
      return;
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Headers', allowedHeaders);
      response.setHeader('Access-Control-Allow-Methods', allowedMethods);
      response.setHeader('Access-Control-Max-Age', '600');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    next();
  };
}

/**
 * Every request that reaches the backend comes from the active user's own desktop window,
 * so the request context is fixed at startup: the user chosen by the main process, that
 * user's local directories. No cloud session participates in this boundary.
 */
export function createActiveUserContext({
  activeOpaqueUserId,
  userScopeResolver,
  clock = () => new Date(),
} = {}) {
  if (typeof userScopeResolver?.ensureDirectories !== 'function') {
    throw identityError(IDENTITY_ERRORS.authenticationInvalid, 'User-scope resolver is missing', 'authentication.create');
  }
  const issuedAt = Math.floor(clock().getTime() / 1_000);
  const identity = Object.freeze({
    opaqueUserId: activeOpaqueUserId,
    sessionId: DESKTOP_SESSION_ID,
    tokenId: DESKTOP_SESSION_ID,
    issuedAt,
    expiresAt: issuedAt + ACTIVE_USER_CONTEXT_TTL_SECONDS,
  });
  const scope = userScopeResolver.ensureDirectories(
    createActiveUserAuthenticationContext(identity),
  );
  return Object.freeze({ identity, scope });
}

export function attachActiveUserContext(context) {
  if (!context?.identity || !context?.scope) {
    throw identityError(IDENTITY_ERRORS.authenticationInvalid, 'Active-user context is invalid', 'authentication.attach');
  }
  return (request, _response, next) => {
    REQUEST_CONTEXTS.set(request, context);
    next();
  };
}

export function getAuthenticatedRequest(request) {
  const context = REQUEST_CONTEXTS.get(request);
  if (!context) {
    const error = new UserScopeError('请求缺少服务端认证上下文', IDENTITY_ERRORS.authenticationRequired, 403);
    error.context = identityError(IDENTITY_ERRORS.authenticationRequired, error.message, 'authentication.request', error.status).context;
    throw error;
  }
  return context;
}

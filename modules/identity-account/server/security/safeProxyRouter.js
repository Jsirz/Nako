import { IDENTITY_ERRORS, IdentityError } from '../../../contracts/identityErrors.js';
import { createModuleLogger } from '../../../kernel/logger.js';
import express from 'express';
import { ExternalUrlPolicyError, fetchExternalUrl } from './externalUrlPolicy.js';

class ProxyError extends IdentityError {
  constructor(message, status = 400, code = IDENTITY_ERRORS.proxyInvalid) {
    super(code, message, 'proxy.fetch', status);
  }
}

async function readBoundedBody(response, maxBytes) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new ProxyError('外部素材超过代理大小限制', 413, IDENTITY_ERRORS.proxyTooLarge);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body || []) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw new ProxyError('外部素材超过代理大小限制', 413, IDENTITY_ERRORS.proxyTooLarge);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function assertMediaResponse(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!/^(image|video|audio)\//.test(contentType)) {
    throw new ProxyError('代理只允许图片、视频或音频响应', 415, IDENTITY_ERRORS.proxyMediaType);
  }
  return contentType;
}

export function createSafeProxyRouter({
  fetchImpl = globalThis.fetch,
  resolveHost,
  maxBytes = 100 * 1024 * 1024,
  logger = console,
} = {}) {
  const router = express.Router();
  const moduleLogger = createModuleLogger('identity-account', logger);
  router.get('/proxy', async (request, response) => {
    try {
      if (!request.query.url) throw new ProxyError('URL is required');
      const external = await fetchExternalUrl(request.query.url, {
        fetchImpl,
        resolveHost,
        method: 'GET',
        timeoutMs: 15_000,
        maxRedirects: 3,
      });
      if (!external.response.ok) {
        throw new ProxyError(`外部素材返回 HTTP ${external.response.status}`, 502, IDENTITY_ERRORS.proxyUpstream);
      }
      const contentType = assertMediaResponse(external.response);
      const body = await readBoundedBody(external.response, maxBytes);
      response.setHeader('Content-Type', contentType);
      response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      response.setHeader('Cache-Control', 'private, max-age=300');
      response.send(body);
    } catch (error) {
      const status = error instanceof ExternalUrlPolicyError || error instanceof ProxyError
        ? error.status
        : 502;
      if (status >= 500 && !(error instanceof ProxyError)) {
        moduleLogger.error('Safe proxy request failed', { moduleId: 'identity-account', operation: 'proxy.fetch', error });
      }
      response.status(status).json({
        error: error?.message || '外部素材代理失败',
        code: error?.code || IDENTITY_ERRORS.proxyFailed,
      });
    }
  });
  return router;
}

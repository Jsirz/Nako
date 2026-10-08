import express from 'express';
import { ERRORS, PluginError } from '../../../contracts/index.js';

/** Validate existing model-reference URLs. Uploads belong to Provider adapters. */
export function createTosRouter({ externalUrlFetch, logger }) {
  if (!externalUrlFetch?.fetch) throw new PluginError(ERRORS.serviceMissing, 'identity.externalUrlFetch is required', { context: { moduleId: 'asset-media', operation: 'verifyRemote' } });
  const router = express.Router();
  router.post('/api/verify-tos-url', async (request, response) => {
    try {
      const { networkUrl } = request.body || {};
      if (typeof networkUrl !== 'string' || !networkUrl) throw new PluginError(ERRORS.invalidMedia, 'Missing networkUrl', { status: 400, context: { moduleId: 'asset-media', operation: 'verifyRemote' } });
      const result = await externalUrlFetch.fetch(networkUrl, { method: 'HEAD', timeoutMs: 8_000 });
      response.json({ exists: result.response.ok, status: result.response.status });
    } catch (error) {
      logger?.warn('Remote media reference verification failed', { moduleId: 'asset-media', operation: 'verifyRemote', code: error.code });
      response.status(error.status || 500).json({ exists: false, error: error.message, code: error.code });
    }
  });
  return router;
}

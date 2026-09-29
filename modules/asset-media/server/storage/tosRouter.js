import express from 'express';
import { fetchExternalUrl } from '../../../identity-account/api/server/security/externalUrlPolicy.js';

/** Validate existing model-reference URLs. Uploads belong to Provider adapters. */
export function createTosRouter({ fetchImpl = fetch, logger } = {}) {
  const router = express.Router();
  router.post('/api/verify-tos-url', async (request, response) => {
    try {
      const { networkUrl } = request.body || {};
      if (!networkUrl) return response.status(400).json({ error: 'Missing networkUrl' });
      const result = await fetchExternalUrl(networkUrl, { fetchImpl, method: 'HEAD' });
      response.json({ exists: result.response.ok, status: result.response.status });
    } catch (error) {
      logger?.warn('Remote media reference verification failed');
      response.status(error.status || 500).json({ exists: false, error: error.message, code: error.code });
    }
  });
  return router;
}

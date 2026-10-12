import express from 'express';
import { PROJECT_ERRORS } from '../../../contracts/projectErrors.js';

export function createShowcaseCacheRouter({ maintenance, logger }) {
  const router = express.Router();
  router.post('/showcase/cache/clear', async (_req, res) => {
    try { res.json(await maintenance.clear()); }
    catch (error) {
      if (error.status !== 409) logger.error('Clear showcase cache failed', { operation: 'clearShowcaseCache', error });
      res.status(error.status || 500).json({ error: error.message, code: error.code || PROJECT_ERRORS.cacheClear });
    }
  });
  return router;
}

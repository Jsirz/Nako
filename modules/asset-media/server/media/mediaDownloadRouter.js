import express from 'express';
import { ERRORS, PluginError } from '../../../contracts/index.js';

export function createMediaDownloadRouter({ downloads, security }) {
  if (!downloads || !security) throw new PluginError(ERRORS.serviceMissing, 'Media download services are required', { context: { moduleId: 'asset-media', operation: 'createDownloadRouter' } });
  const router = express.Router();
  router.get('/settings', async (request, response) => {
    const result = await downloads.settings({ scope: security.getAuthenticatedScope(request), body: request.body });
    response.status(result.status).json(result.body);
  });
  router.patch('/settings', async (request, response) => {
    const result = await downloads.updateSettings({ scope: security.getAuthenticatedScope(request), body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/settings/directory', async (request, response) => {
    const result = await downloads.selectDirectory({ scope: security.getAuthenticatedScope(request), body: request.body });
    response.status(result.status).json(result.body);
  });
  router.delete('/settings/directory', async (request, response) => {
    const result = await downloads.resetDirectory({ scope: security.getAuthenticatedScope(request), body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/save', async (request, response) => {
    const result = await downloads.save({ scope: security.getAuthenticatedScope(request), body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/open-directory', async (request, response) => {
    const result = await downloads.openDirectory({ scope: security.getAuthenticatedScope(request), body: request.body });
    response.status(result.status).json(result.body);
  });
  return router;
}

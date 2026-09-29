import express from 'express';
import { getAuthenticatedRequest } from '../../../identity-account/api/server/security/localAuthentication.js';
import { ERRORS, PluginError } from '../../../contracts/index.js';

export function createMediaDownloadRouter({ downloads }) {
  if (!downloads) throw new PluginError(ERRORS.serviceMissing, 'media.operations.downloads is required');
  const router = express.Router();
  router.get('/settings', async (request, response) => {
    const result = await downloads.settings({ scope: getAuthenticatedRequest(request).scope, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.patch('/settings', async (request, response) => {
    const result = await downloads.updateSettings({ scope: getAuthenticatedRequest(request).scope, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/settings/directory', async (request, response) => {
    const result = await downloads.selectDirectory({ scope: getAuthenticatedRequest(request).scope, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.delete('/settings/directory', async (request, response) => {
    const result = await downloads.resetDirectory({ scope: getAuthenticatedRequest(request).scope, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/save', async (request, response) => {
    const result = await downloads.save({ scope: getAuthenticatedRequest(request).scope, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/open-directory', async (request, response) => {
    const result = await downloads.openDirectory({ scope: getAuthenticatedRequest(request).scope, body: request.body });
    response.status(result.status).json(result.body);
  });
  return router;
}

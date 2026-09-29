import express from 'express';
import { ERRORS, PluginError } from '../../../contracts/index.js';

/** HTTP translation; all library storage belongs to media.filesystem. */
export function createMediaLibraryRouter({ library }) {
  if (!library) throw new PluginError(ERRORS.serviceMissing, 'media.operations.library is required');
  const router = express.Router();
  router.post('/api/library', async (request, response) => {
    const result = await library.save({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.get('/api/library', async (request, response) => {
    const result = await library.list({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/api/library/import', async (request, response) => {
    const result = await library.importAsset({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.patch('/api/library/:id', async (request, response) => {
    const result = await library.update({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.delete('/api/library/:id', async (request, response) => {
    const result = await library.remove({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.get('/api/library/workflows', async (request, response) => {
    const result = await library.listWorkflows({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.post('/api/library/workflows/import', async (request, response) => {
    const result = await library.importWorkflow({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.delete('/api/library/workflows/:id', async (request, response) => {
    const result = await library.removeWorkflow({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.get('/api/public-workflows', async (request, response) => {
    const result = await library.listPublicWorkflows({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  router.get('/api/public-workflows/:id', async (request, response) => {
    const result = await library.readPublicWorkflow({ params: request.params, query: request.query, body: request.body });
    response.status(result.status).json(result.body);
  });
  return router;
}

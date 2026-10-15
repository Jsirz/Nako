import express from 'express';
import { httpSecurity } from '../kernel/server.js';

export function createNodeRunRouter({ runs, packages }) {
  const router = express.Router();
  const scope = request => httpSecurity().getAuthenticatedScope(request).opaqueUserId;
  const route = handler => async (request, response) => {
    try { response.json(await handler(request)); }
    catch (error) { response.status(error.code === 'NODE_CAPABILITY_DENIED' ? 403 : error.code === 'NODE_RUN_NOT_FOUND' ? 404 : 400).json({ error: error.message, code: error.code || 'NODE_INVALID' }); }
  };
  router.get('/api/node-packages', route(() => packages.list()));
  router.post('/api/node-packages/reload', route(() => packages.reload()));
  router.get('/api/node-packages/:packageId/ui/:nodeType', route(async request => ({ html: await packages.ui(request.params.packageId, request.params.nodeType) })));
  router.get('/api/node-runs', route(request => runs.list(String(request.query.projectId || ''), scope(request))));
  router.get('/api/node-runs/find', route(async request => {
    const caller = scope(request);
    const run = runs.find(String(request.query.projectId || ''), String(request.query.requestId || ''), caller);
    return run ? runs.observe(run.id, caller) : null;
  }));
  router.post('/api/node-runs', route(request => runs.prepare(request.body, { scope: scope(request) })));
  router.get('/api/node-runs/:id', route(request => runs.observe(request.params.id, scope(request))));
  router.post('/api/node-runs/:id/approve', route(request => runs.approve(request.params.id, scope(request), request.body?.grants)));
  router.post('/api/node-runs/:id/cancel', route(request => runs.cancel(request.params.id, scope(request))));
  router.post('/api/node-runs/projects/:projectId/stop', route(async request => {
    await runs.stopProject(request.params.projectId, scope(request)); return { ok: true };
  }));
  return router;
}

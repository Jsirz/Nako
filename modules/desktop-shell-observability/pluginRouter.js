import express from 'express';
/** Mounted after the existing local authentication boundary. Configuration has no secrets. */
export function createPluginRouter(host) {
  const router = express.Router();
  router.get('/', (_request, response) => response.json({ apiVersion: '1.0.0', plugins: host.list(), services: host.services.list() }));
  router.get('/capabilities/:capability', (request, response) => response.json(host.discover(request.params.capability)));
  const mutate = action => async (request, response) => {
    try { await host[action](request.params.id); response.json({ success: true, plugins: host.list() }); }
    catch (error) { response.status(error.code === 'PLUGIN_NOT_FOUND' ? 404 : 409).json({ code: error.code || 'PLUGIN_OPERATION_FAILED', error: '插件操作未完成，请检查依赖或重启要求。' }); }
  };
  router.post('/:id/enable', mutate('load'));
  router.post('/:id/disable', mutate('unload'));
  return router;
}

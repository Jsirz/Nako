import express from 'express';

/** HTTP translation only. Storage/processing is supplied by the plugin host. */
export function createMediaAssetRouter({ mediaStore }) {
  if (!mediaStore) throw new Error('mediaStore is required');
  const router = express.Router();
  router.post("/assets/upload/:type", async (request, response) => {
    const result = await mediaStore.upload({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/assets/import/:type", express.json({ limit: '16kb', strict: true }), async (request, response) => {
    const result = await mediaStore.importFile({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/assets/metadata/repair", async (request, response) => {
    const result = await mediaStore.repairMetadata({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/assets/external/check", async (request, response) => {
    const result = await mediaStore.checkExternal({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/assets/copy", async (request, response) => {
    const result = await mediaStore.copy({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/assets/localize", async (request, response) => {
    const result = await mediaStore.localize({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.get("/assets/:type", async (request, response) => {
    const result = await mediaStore.list({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.patch("/assets/:type/:id/favorite", async (request, response) => {
    const result = await mediaStore.favorite({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.delete("/assets/:type/:id", async (request, response) => {
    const result = await mediaStore.deleteAsset({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/assets/:type/:id/trash", async (request, response) => {
    const result = await mediaStore.trash({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/workflows/:id/cleanup", async (request, response) => {
    const result = await mediaStore.cleanupProject({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.get("/workflows/:id/cleanup/trash", async (request, response) => {
    const result = await mediaStore.listTrash({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/workflows/:id/cleanup/restore", async (request, response) => {
    const result = await mediaStore.restoreTrash({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.delete("/workflows/:id/cleanup/trash/:batchId", async (request, response) => {
    const result = await mediaStore.purgeTrash({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  return router;
}

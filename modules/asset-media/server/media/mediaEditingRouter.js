import express from 'express';
import { ERRORS, PluginError } from '../../../contracts/index.js';

/** HTTP translation only. Storage/processing is supplied by the plugin host. */
export function createMediaEditingRouter({ mediaProcessor }) {
  if (!mediaProcessor) throw new PluginError(ERRORS.serviceMissing, 'mediaProcessor is required', { context: { moduleId: 'asset-media', service: 'media.editing' } });
  const router = express.Router();
  router.post("/media/images/crop", async (request, response) => {
    const result = await mediaProcessor.crop({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/media/images/grid", async (request, response) => {
    const result = await mediaProcessor.grid({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/media/images/annotation", async (request, response) => {
    const result = await mediaProcessor.annotate({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.put("/media/edits/:projectId/:nodeId", async (request, response) => {
    const result = await mediaProcessor.saveEdits({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.get("/media/edits/:projectId/:nodeId", async (request, response) => {
    const result = await mediaProcessor.readEdits({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/trim-video", async (request, response) => {
    const result = await mediaProcessor.trimVideo({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/media/videos/frames", async (request, response) => {
    const result = await mediaProcessor.videoFrames({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  router.post("/trim-audio", async (request, response) => {
    const result = await mediaProcessor.trimAudio({ params: request.params, query: request.query, headers: request.headers, body: request.body, stream: request });
    response.status(result.status).json(result.body);
  });
  return router;
}

import express from 'express';
import { PROJECT_ERRORS } from '../../../contracts/projectErrors.js';

export function createShowcaseVideoRouter({ cache }) {
  const router = express.Router();
  const fail = (res, error) => {
    if (res.headersSent) return res.destroy();
    res.status(error.status || 500).json({ error: error.message || '视频缓存失败。', code: error.code || PROJECT_ERRORS.videoDownload });
  };
  router.post('/showcase/videos', express.json({ limit: '16kb' }), async (req, res) => {
    try {
      const cached = await cache.get(req.body?.video);
      if (!res.destroyed) res.json({ url: `/api/showcase/videos/${cached.key}` });
    } catch (error) { if (!res.destroyed) fail(res, error); }
  });
  router.get('/showcase/videos/:key', async (req, res) => {
    try {
      const release = cache.acquire?.();
      if (release) { res.once('finish', release); res.once('close', release); }
      const cached = await cache.resolve(req.params.key);
      // Relative name avoids treating host folders such as .desktop-dev as dotfiles.
      res.type(cached.contentType).set('X-Content-Type-Options', 'nosniff').set('Cache-Control', 'private, no-cache');
      res.sendFile('video.bin', { root: cached.directory }, error => { if (error) fail(res, error); });
    } catch (error) { fail(res, error); }
  });
  return router;
}

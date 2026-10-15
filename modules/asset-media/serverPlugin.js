import express from 'express';
import { defineApplicationPlugin } from '../kernel/application.js';
import { createMediaAssetRouter } from './server/media/mediaAssetRouter.js';
import { createMediaEditingRouter } from './server/media/mediaEditingRouter.js';
import { createMediaDownloadRouter } from './server/media/mediaDownloadRouter.js';
import { createMediaLibraryRouter } from './server/media/mediaLibraryRouter.js';
import { createTosRouter } from './server/storage/tosRouter.js';
import { sendMediaDelivery } from './server/media/mediaDeliveryResponse.js';

export default defineApplicationPlugin({
  id: 'module.asset-media',
  dependencies: ['module.media-capabilities', 'media.filesystem', 'media.ffmpeg-sharp', 'module.identity-account'],
  requires: ['platform.paths', 'media.operations', 'media.editing', 'media.processor', 'media.delivery', 'identity.externalUrlFetch', 'identity.httpSecurity'],
  provides: ['media.projectFiles'],
  activate(context) {
    const store = context.services.get('media.delivery');
    const routes = context.services.get('http.routes');
    const operations = context.services.get('media.operations');
    const processor = context.services.get('media.processor');
    /** @type {import('../contracts/httpSecurity').IdentityHttpSecurity<import('express').Request, import('express').Response>} */
    const security = context.services.get('identity.httpSecurity');
    const app = express.Router();
    routes.contribute(context, app);
    app.get('/api/media/thumbnail', async (request, response) => {
      try {
        const reference = await processor.thumbnail(request.query.url, request.query.max);
        await sendMediaDelivery(request, response, await store.open(reference), { immutable: true });
      } catch (error) {
        if (response.headersSent || response.destroyed) return;
        const status = error.status || 500;
        if (status >= 500) context.logger.error('Thumbnail generation failed', { moduleId: 'asset-media', operation: 'thumbnail', code: error.code });
        response.status(status).json({ error: error.message || '缩略图生成失败', code: error.code });
      }
    });
    app.use('/api/media-download', createMediaDownloadRouter({ downloads: operations.downloads, security }));
    app.use('/api', security.createProxyRouter());
    app.use('/api', createMediaAssetRouter({ mediaStore: operations }));
    app.use('/api', createMediaEditingRouter({ mediaProcessor: context.services.get('media.editing') }));
    app.use(createTosRouter({ externalUrlFetch: context.services.get('identity.externalUrlFetch'), logger: context.logger }));
    app.use(createMediaLibraryRouter({ library: operations.library }));
    const library = express.Router();
    library.use('/library', (_request, response, next) => {
      response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      next();
    }, security.createPublicLibraryGuard(), security.denyPrivateLibraryPath, async (request, response, next) => {
      if (!['GET', 'HEAD'].includes(request.method)) return next();
      try {
        const delivery = await store.open({ kind: 'library', url: `/library${request.url}` });
        await sendMediaDelivery(request, response, delivery);
      } catch (error) {
        if (response.headersSent || response.destroyed) return;
        if (error.status === 404) return next();
        context.logger.error('Media delivery failed', { moduleId: 'asset-media', code: error.code });
        response.status(error.status || 500).json({ error: '媒体文件读取失败', code: error.code });
      }
    });
    routes.contribute(context, library, { phase: 30 });
    context.services.register('media.projectFiles', operations.projectFiles);
  },
});

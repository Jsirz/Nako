import { createLocalMediaProcessor } from './processor.js';
import { createImageComposer } from './compose.js';
import { createThumbnailCache } from './thumbnailCache.js';
import { createShotAnalysisProcessor } from './shotAnalysis.js';
import { ERRORS, PluginError } from '../../../modules/contracts/index.js';
export function createMediaProcessorPlugin(options) {
  return {
    manifest: { id: 'media.ffmpeg-sharp', version: '1.0.0', apiVersion: '^1.0.0', type: 'media',
      dependencies: { 'media.filesystem': '^1.0.0' },
      services: { requires: ['platform.paths', 'media.store'], provides: ['media.processor', 'media.editing'] }, capabilities: ['media.crop', 'media.trim', 'media.frames'], reloadRequired: true },
    activate(context) {
      const operations = createLocalMediaProcessor({ ...options, logger: context.logger });
      const store = context.services.get('media.store');
      const thumbnails = createThumbnailCache({ libraryDir: options.libraryDirectory });
      async function assetFor(id, type) {
        const asset = await store.read(id);
        if (!asset || asset.type !== type) throw new PluginError(ERRORS.mediaNotFound, 'Media asset not found', { status: 404, context: { moduleId: 'media.ffmpeg-sharp', assetId: id } });
        return asset;
      }
      function unwrap(result, source) {
        if (result.status >= 400) throw new PluginError(ERRORS.invalidMedia, result.body.error, { status: result.status, context: { moduleId: 'media.ffmpeg-sharp', operationCode: result.body.code } });
        return { ...result.body.asset, type: source.type, projectId: source.projectId };
      }
      context.services.register('media.editing', operations);
      context.services.register('media.processor', Object.freeze({
        ...createShotAnalysisProcessor({ libraryDirectory: options.libraryDirectory, logger: context.logger }),
        thumbnail: (url, maxSize) => thumbnails.get(url, maxSize),
        compose: createImageComposer({ libraryDirectory: options.libraryDirectory, store }),
        async crop(input) {
          const source = await assetFor(input.assetId, 'image');
          return unwrap(await operations.crop({ body: { projectId: source.projectId, imageUrl: source.url,
            rect: { x: input.left, y: input.top, width: input.width, height: input.height } } }), source);
        },
        async trimVideo(input) {
          const source = await assetFor(input.assetId, 'video');
          return unwrap(await operations.trimVideo({ body: { projectId: source.projectId, videoUrl: source.url,
            startTime: input.start, endTime: input.end } }), source);
        },
      }));
    },
  };
}

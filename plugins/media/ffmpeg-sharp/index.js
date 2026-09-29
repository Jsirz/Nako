import { createLocalMediaProcessor } from './processor.js';
import { createImageComposer } from './compose.js';
export function createMediaProcessorPlugin(options) {
  return {
    manifest: { id: 'media.ffmpeg-sharp', version: '1.0.0', apiVersion: '^1.0.0', type: 'media',
      dependencies: { 'media.filesystem': '^1.0.0' },
      services: { requires: ['media.store'], provides: ['media.processor', 'media.editing'] }, capabilities: ['media.crop', 'media.trim', 'media.frames'], reloadRequired: true },
    activate(context) {
      const operations = createLocalMediaProcessor(options);
      const store = context.services.get('media.store');
      async function assetFor(id, type) {
        const asset = await store.read(id);
        if (!asset || asset.type !== type) throw Object.assign(new Error('Media asset not found'), { code: 'MEDIA_NOT_FOUND', status: 404 });
        return asset;
      }
      function unwrap(result, source) {
        if (result.status >= 400) throw Object.assign(new Error(result.body.error), { code: result.body.code, status: result.status });
        return { ...result.body.asset, type: source.type, projectId: source.projectId };
      }
      context.services.register('media.editing', operations);
      context.services.register('media.processor', Object.freeze({
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

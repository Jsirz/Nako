export { createMediaAssetRouter } from './server/media/mediaAssetRouter.js';
export { createMediaEditingRouter } from './server/media/mediaEditingRouter.js';
/** Bind a public media application service to the selected adapter implementations. */
export function createMediaService(registry) {
  return Object.freeze({
    save: input => registry.get('media.store').save(input),
    read: id => registry.get('media.store').read(id),
    remove: id => registry.get('media.store').remove(id),
    crop: input => registry.get('media.processor').crop(input),
    trimVideo: input => registry.get('media.processor').trimVideo(input),
  });
}

import { defineApplicationPlugin } from '../kernel/application.js';
import { getModelDimensions, getSeedreamV5ProDimensions } from './server/utils/resolutionMapper.js';

export default defineApplicationPlugin({
  id: 'module.media-capabilities',
  dependencies: ['media.filesystem-runtime'],
  requires: ['media.files'],
  provides: ['media.runtime'],
  activate(context) {
    /** @type {import('../contracts/mediaRuntime').MediaRuntimeService} */
    const mediaRuntime = Object.freeze({
      ...context.services.get('media.files'),
      dimensions: getModelDimensions, seedreamDimensions: getSeedreamV5ProDimensions,
    });
    context.services.register('media.runtime', mediaRuntime);
  },
});

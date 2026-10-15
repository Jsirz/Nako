import { createMediaFiles } from './mediaFiles.js';

/** Early storage capabilities, independent of the HTTP and repository plugins. */
export default {
  manifest: {
    id: 'media.filesystem-runtime', version: '1.0.0', apiVersion: '^1.0.0', type: 'media',
    dependencies: { 'host.runtime': '^1.0.0', 'media.ffmpeg-probe': '^1.0.0' },
    services: { requires: ['platform.paths', 'media.probe'], provides: ['media.files'] },
    capabilities: ['media.files'], reloadRequired: true,
  },
  activate(context) {
    context.services.register('media.files', createMediaFiles({
      paths: context.services.get('platform.paths'),
      probe: context.services.get('media.probe'), logger: context.logger,
    }));
  },
};

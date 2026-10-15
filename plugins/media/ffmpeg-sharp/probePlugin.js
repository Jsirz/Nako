import path from 'node:path';
import { createMediaMetadataProbe } from './mediaMetadataProbe.js';

/** Registered before storage consumers; probing does not depend on MediaStore. */
export default {
  manifest: {
    id: 'media.ffmpeg-probe', version: '1.0.0', apiVersion: '^1.0.0', type: 'media',
    dependencies: { 'host.runtime': '^1.0.0' },
    services: { requires: ['platform.paths'], provides: ['media.probe'] },
    capabilities: ['media.probe'], reloadRequired: true,
  },
  activate(context) {
    const paths = context.services.get('platform.paths');
    /** @type {import('../../../modules/contracts/mediaRuntime').MediaProbeService} */
    const probe = Object.freeze({
      create: options => createMediaMetadataProbe({
        ffprobePath: path.join(paths.runtime.BIN_DIR, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'),
        ...options,
      }),
    });
    context.services.register('media.probe', probe);
  },
};

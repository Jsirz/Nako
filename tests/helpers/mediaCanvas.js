import { beforeEach, afterEach } from 'vitest';
import { browserHost } from '../../modules/kernel/browser.ts';
import { adaptiveMediaNodeSize, videoDisplayAspectRatio } from '../../modules/asset-media/ui/media/mediaNodeSizing.ts';

let dispose;
beforeEach(() => {
  dispose = browserHost.services.register('ui.media.canvas', {
    nodeSize: adaptiveMediaNodeSize, videoAspectRatio: videoDisplayAspectRatio,
  });
});
afterEach(() => dispose());

import { beforeEach, afterEach } from 'vitest';
import { browserHost } from '../../modules/kernel/browser.ts';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, AUDIO_MODELS, installModelCatalog } from '../../modules/generation-core/models/catalog.ts';
import { modelDisplayName } from '../../modules/generation-core/models/modelDisplayName.ts';
import { modelContributions } from '../../apps/canvas/modelContributions.ts';

let dispose;
beforeEach(() => {
  installModelCatalog(modelContributions);
  const catalogs = { image: IMAGE_MODELS, video: VIDEO_MODELS, text: TEXT_MODELS, audio: AUDIO_MODELS };
  dispose = browserHost.services.register('ui.generation.catalog', {
    list: kind => structuredClone(catalogs[kind]), displayName: modelDisplayName,
  });
});
afterEach(() => dispose());

import { expect, it } from 'vitest';
import { modelContributions } from '../apps/canvas/modelContributions';
import { IMAGE_MODELS, TEXT_MODELS, installModelCatalog } from '../modules/generation-core/models/catalog';
import { modelDisplayName } from '../modules/generation-core/models/modelDisplayName';
import { isModelVisible } from '../modules/generation-core/ui/generation/hiddenProviderPolicy';

it('installs declarative model data without replacing shared arrays or retaining input objects', () => {
  const original = IMAGE_MODELS;
  try {
    const image = { name: 'Catalog test image', catalogOrder: 2, provider: 'test',
      source: 'runninghub', endpoint: { default: { model: 'catalog-test', url: 'https://example.test' } },
      displayName: 'Catalog test label' };
    installModelCatalog({ TEXT_MODELS: [], IMAGE_MODELS: [image], AUDIO_MODELS: [], VIDEO_MODELS: [] });
    expect(IMAGE_MODELS).toBe(original);
    expect(IMAGE_MODELS[0]).not.toBe(image);
    image.displayName = 'Changed outside catalog';
    expect(modelDisplayName('catalog-test')).toBe('Catalog test label');
    expect(isModelVisible(image.name)).toBe(false);
    expect(TEXT_MODELS).toEqual([]);
    const before = structuredClone(IMAGE_MODELS);
    expect(() => installModelCatalog({ TEXT_MODELS: [], IMAGE_MODELS: [image, image],
      AUDIO_MODELS: [], VIDEO_MODELS: [] })).toThrow('Invalid model catalog contribution');
    expect(IMAGE_MODELS).toEqual(before);
  } finally {
    installModelCatalog(modelContributions);
  }
});

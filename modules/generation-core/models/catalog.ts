import type { CatalogModel } from '../../contracts/modelCatalog';
import { ERRORS, PluginError } from '../../contracts/errors.js';
export * from './defaults';

export const TEXT_MODELS: CatalogModel[] = [];
export const IMAGE_MODELS: CatalogModel[] = [];
export const AUDIO_MODELS: CatalogModel[] = [];
export const VIDEO_MODELS: CatalogModel[] = [];
const lists = { TEXT_MODELS, IMAGE_MODELS, AUDIO_MODELS, VIDEO_MODELS };

/** The application composition root supplies declarative data, never provider objects. */
export function installModelCatalog(input: unknown) {
  if (!input || typeof input !== 'object') throw invalidCatalog();
  const source = input as Record<string, unknown>;
  const names = new Set<string>();
  const projected = Object.entries(lists).map(([key, target]) => {
    const models = source[key];
    if (!Array.isArray(models)) throw invalidCatalog(key);
    for (const model of models) {
      if (!model || typeof model.name !== 'string' || !model.name || names.has(model.name)
        || !Number.isFinite(model.catalogOrder) || typeof model.provider !== 'string'
        || !model.endpoint || typeof model.endpoint !== 'object') throw invalidCatalog(key);
      names.add(model.name);
    }
    return { target, models: structuredClone(models) as CatalogModel[] };
  });
  for (const { target, models } of projected) {
    target.splice(0, target.length, ...models.sort((a, b) => a.catalogOrder - b.catalogOrder));
  }
}

function invalidCatalog(list?: string) {
  return new PluginError(ERRORS.invalidModel, 'Invalid model catalog contribution', {
    context: { moduleId: 'generation-core', operation: 'installModelCatalog', list },
  });
}

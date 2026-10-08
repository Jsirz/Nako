import { ERRORS, PluginError } from '../contracts/errors.js';

/** Materialize the core plugin contract from declarative metadata and lifecycle handlers. */
export function definePlugin(definition) {
  const manifest = definition?.manifest;
  if (!manifest || typeof definition.activate !== 'function') {
    throw new PluginError(ERRORS.invalidManifest, 'Plugin metadata and activation are required', {
      context: { moduleId: 'kernel', operation: 'definePlugin', pluginId: manifest?.id },
    });
  }
  for (const key of ['id', 'version', 'type']) {
    if (definition[key] !== undefined && definition[key] !== manifest[key]) {
      throw new PluginError(ERRORS.invalidManifest, 'Plugin identity differs from its manifest', {
        context: { moduleId: 'kernel', operation: 'definePlugin', pluginId: manifest.id, field: key },
      });
    }
  }
  return Object.freeze({
    manifest,
    id: manifest.id,
    version: manifest.version,
    type: manifest.type,
    activate: (context) => definition.activate(context),
    deactivate: () => definition.deactivate?.(),
    ...(definition.canDeactivate ? { canDeactivate: () => definition.canDeactivate() } : {}),
  });
}

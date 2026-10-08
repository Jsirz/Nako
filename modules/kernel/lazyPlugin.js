import { ERRORS, PluginError } from '../contracts/index.js';
import { definePlugin } from './plugin.js';
/** Defer implementation loading until activation, while retaining dependency and capability metadata. */
export function lazyPlugin(manifest, load) {
  const canonical = (value) =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, canonical(value[key])]),
          )
        : value;
  let implementation;
  return definePlugin({
    manifest,
    async activate(context) {
      implementation ??= await load();
      if (
        JSON.stringify(canonical(implementation?.manifest)) !== JSON.stringify(canonical(manifest))
      ) {
        throw new PluginError(ERRORS.invalidManifest, `Plugin entry does not match its manifest: ${manifest.id}`);
      }
      await implementation.activate(context);
    },
    canDeactivate: () => implementation?.canDeactivate?.() ?? true,
    deactivate: () => implementation?.deactivate?.(),
  });
}

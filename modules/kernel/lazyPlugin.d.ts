import type { NakoPlugin, PluginDefinition, PluginManifest } from '../contracts/index.js';
export function lazyPlugin(
  manifest: PluginManifest,
  load: () => Promise<PluginDefinition>,
): NakoPlugin;

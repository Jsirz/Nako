import type { NakoPlugin, PluginManifest } from '../contracts/index.js';
export function lazyPlugin(
  manifest: PluginManifest,
  load: () => Promise<NakoPlugin>,
): NakoPlugin;

import './installModelCatalog';
import { browserHost } from '../../modules/kernel/browser';
import type { NakoPlugin, PluginManifest } from '../../modules/contracts/index.js';
import { ERRORS, PluginError } from '../../modules/contracts/errors.js';
import { lazyPlugin } from '../../modules/kernel/lazyPlugin.js';
import catalog from '../../config/browser-plugins.json';
import settings from '../../config/plugins.json';
const entries = import.meta.glob<{ default: NakoPlugin }>(
  ['../../modules/*/{browser.ts,*Plugin.ts,*Plugin.tsx}', './rootPlugin.tsx'],
);
const manifests = import.meta.glob<{ default: PluginManifest }>(
  ['../../modules/*/browser*.manifest.json', './browser.root.manifest.json'],
  { eager: true },
);
document.documentElement.dataset.nakoBuild = __NAKO_BUILD__;
for (const entry of catalog) {
  const load = entries[entry.entry];
  if (!load) throw new PluginError(ERRORS.missing, 'Plugin entry missing: ' + entry.id,
    { context: { moduleId: 'canvas-ui', operation: 'bootstrap', pluginId: entry.id, entry: entry.entry } });
  const manifest = manifests[entry.manifest]?.default;
  if (manifest?.id !== entry.id) throw new PluginError(ERRORS.invalidManifest, 'Plugin identity mismatch: ' + entry.id,
    { context: { moduleId: 'canvas-ui', operation: 'bootstrap', pluginId: entry.id } });
  browserHost.register(lazyPlugin(manifest, async () => (await load()).default));
}
const disabled = new Set<string>(settings.disabled);
const selected = browserHost.list().filter((plugin) => !disabled.has(plugin.id));
for (const plugin of selected)
  for (const dependency of Object.keys(plugin.dependencies || {})) {
    if (disabled.has(dependency))
      throw new PluginError(ERRORS.dependency, `Enabled plugin ${plugin.id} requires disabled plugin ${dependency}`,
        { context: { moduleId: 'canvas-ui', operation: 'bootstrap', pluginId: plugin.id, dependency } });
  }
await browserHost.start(selected.map((plugin) => plugin.id));

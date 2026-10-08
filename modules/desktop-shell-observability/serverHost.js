import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PluginHost } from '../kernel/index.js';
import { lazyPlugin } from '../kernel/lazyPlugin.js';
import { createCredentialStore } from '../identity-account/api/credentialStore.js';
import { createNodeRegistry } from '../kernel/nodeRegistry.js';
import { createNodeDirectoryLoader } from './serverNodeDirectory.js';
import { ERRORS, PluginError } from '../contracts/index.js';

export async function createServerPluginHost({
  libraryDirectory,
  privateDirectory,
  readSecret = (key) => process.env[key],
  logger = console,
  configuration,
  runtime,
  routes,
} = {}) {
  const settings =
    configuration ||
    JSON.parse(
      await fs.readFile(
        process.env.NAKO_PLUGIN_CONFIG || new URL('../../config/plugins.json', import.meta.url),
        'utf8',
      ),
    );
  const catalogUrl = new URL('../../config/backend-plugins.json', import.meta.url);
  const entries = JSON.parse(await fs.readFile(catalogUrl, 'utf8'));
  const declarations = entries
    .filter((entry) => entry.credentialKeys)
    .map((entry) => ({ id: entry.id, keys: entry.credentialKeys }));
  const credentialStore = createCredentialStore({ declarations, readSecret });
  const credentialGrants = Object.fromEntries(
    entries.map((entry) => [entry.id, entry.credentialGrants || []]),
  );
  const host = new PluginHost({
    config: settings.options || {},
    credentialStore,
    credentialGrants,
    logger,
    readConfig: (id, key) =>
      entries
        .find((entry) => entry.id === id)
        ?.configPrefixes?.some((prefix) => key.startsWith(prefix)) &&
      !/(?:KEY|PASSWORD|TOKEN)$/.test(key)
        ? readSecret(key)
        : undefined,
  });
  const paths = {
    libraryDirectory,
    publicDirectory: runtime?.paths.PUBLIC_DIR || fileURLToPath(new URL('../../public', import.meta.url)),
    privateDirectory: privateDirectory || path.join(path.dirname(libraryDirectory), 'private'),
    generationDirectory: privateDirectory ? path.join(privateDirectory, 'generation') : undefined,
  };
  // Node packages ship with the application. NAKO_NODE_DIR is an explicit
  // developer/admin override for portable or user-managed installations.
  const installedNodeDirectory = path.join(
    runtime?.paths?.APP_DIR || path.dirname(libraryDirectory),
    'nodes',
  );
  const nodeDirectory = path.resolve(process.env.NAKO_NODE_DIR || installedNodeDirectory);
  const nodeRegistry = createNodeRegistry();
  const nodePackages = createNodeDirectoryLoader({ directory: nodeDirectory, builtinDirectory: path.join(installedNodeDirectory, 'canvas-core'), registry: nodeRegistry, logger });
  await nodePackages.reload();
  if (nodePackages.list().errors.length) logger.warn(`[nodes] ${nodePackages.list().errors.length} package(s) could not be loaded`);
  async function register(entries, base) {
    for (const entry of entries) {
      const manifest = JSON.parse(await fs.readFile(new URL(entry.manifest, base), 'utf8'));
      if (entry.id !== manifest.id) throw new PluginError(ERRORS.invalidManifest, `Catalog identity mismatch: ${entry.id}`, { context: { moduleId: 'desktop-shell-observability', pluginId: entry.id } });
      host.register(
        lazyPlugin(manifest, async () => {
          const module = await import(new URL(entry.entry, base));
          return entry.factory
            ? module[entry.factory](
                Object.fromEntries(
                  Object.entries(entry.options || {}).map(([key, source]) => [key, paths[source]]),
                ),
              )
            : module.default;
        }),
      );
    }
  }
  await register(entries, catalogUrl);
  if (runtime) {
    host.register({
      manifest: {
        id: 'host.runtime',
        version: '1.0.0',
        apiVersion: '^1.0.0',
        type: 'platform',
        services: { provides: ['host.runtime', 'http.routes', 'node.registry', 'node.packages'] },
      },
      activate(context) {
        context.services.register('host.runtime', Object.freeze(runtime));
        context.services.register('http.routes', routes);
        context.services.register('node.registry', nodeRegistry);
        context.services.register('node.packages', nodePackages);
      },
    });
    const applicationUrl = new URL('../../config/application-plugins.json', import.meta.url);
    await register(JSON.parse(await fs.readFile(applicationUrl, 'utf8')), applicationUrl);
  }
  const selected = host.list().filter((plugin) => !settings.disabled?.includes(plugin.id));
  for (const plugin of selected)
    for (const dependency of Object.keys(plugin.dependencies || {})) {
      if (settings.disabled?.includes(dependency))
        throw new PluginError(ERRORS.dependency, `Enabled plugin ${plugin.id} requires disabled plugin ${dependency}`, { context: { moduleId: 'desktop-shell-observability', pluginId: plugin.id, dependency } });
    }
  await host.start(selected.map((plugin) => plugin.id));
  return host;
}

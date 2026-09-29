import fs from 'node:fs/promises';
import { PluginHost } from '../../../modules/kernel/index.js';
import { lazyPlugin } from '../../../modules/kernel/lazyPlugin.js';
export async function createDesktopPluginHost(environment) {
  const host = new PluginHost();
  host.register({
    manifest: {
      id: 'host.desktop',
      version: '1.0.0',
      apiVersion: '^1.0.0',
      type: 'platform',
      services: { provides: ['desktop.environment'] },
    },
    activate(context) {
      context.services.register('desktop.environment', Object.freeze(environment));
    },
  });
  const url = new URL('../../../config/desktop-plugins.json', import.meta.url);
  const catalog = JSON.parse(await fs.readFile(url, 'utf8'));
  for (const entry of catalog) {
    const manifest = JSON.parse(await fs.readFile(new URL(entry.manifest, url), 'utf8'));
    host.register(
      lazyPlugin(manifest, async () => (await import(new URL(entry.entry, url))).default),
    );
  }
  await host.start();
  return host;
}

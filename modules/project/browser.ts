import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installCanvasAutoSave } from './ui/persistence/canvasAutoSave';
import { accountPreferences as preferenceStorage } from '../kernel/browser';
import type { ProjectPreferencesService, ProjectCacheSettingsService } from '../contracts/browserCapabilities';
import { mountShowcaseCacheSettings } from './ui/settings/showcaseCacheSettings';
import { installCanvasSession } from './ui/persistence/canvasSession';
import { createDashboardClient } from './ui/navigation/projectDashboardData';
import type { ProjectCatalogService } from '../contracts/projectCatalog';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.project',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.canvas-ui': '^1.0.0' },
    capabilities: ['ui.project'],
    services: { provides: ['ui.project.preferences', 'ui.project.cacheSettings', 'ui.project.catalog'], requires: ['ui.canvas.project', 'ui.media.recovery', 'ui.account.preferences'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      context.services.register<ProjectCatalogService>('ui.project.catalog', Object.freeze({ createClient: createDashboardClient }));
      context.services.register<ProjectCacheSettingsService>('ui.project.cacheSettings', {
        mountSettings(host) {
          const dispose = mountShowcaseCacheSettings(host); context.onDispose(dispose); return dispose;
        },
      });
      trackBrowserResource(context, installCanvasSession());
      context.services.register<ProjectPreferencesService>('ui.project.preferences', Object.freeze({
        currentProjectId: () => installCanvasSession().load()?.workflowId,
        getItem: (key: string) => preferenceStorage().getItem(key),
        setItem: (key: string, value: string) => preferenceStorage().setItem(key, value),
        removeItem: (key: string) => preferenceStorage().removeItem(key),
      }));
      trackBrowserResource(context, installCanvasAutoSave());
    });
  },
};
export default definePlugin(plugin);

import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installPreferenceStore } from '../project/api/ui/persistence/preferenceStore';
import { installCanvasAppearance } from './ui/appearance/canvasAppearance';
import { installLocalProfile } from './ui/profile/localProfile';
import { createAccountUiService } from './ui/profile/accountUiService';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.identity-account',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: {},
    capabilities: ['ui.identity-account'],
    services: { provides: ['ui.account'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      await trackBrowserResource(context, installPreferenceStore(window.fetch.bind(window)));
      trackBrowserResource(context, installCanvasAppearance());
      trackBrowserResource(context, installLocalProfile());
      context.services.register('ui.account', createAccountUiService());
    });
  },
};
export default definePlugin(plugin);

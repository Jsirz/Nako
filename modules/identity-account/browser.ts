import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installPreferenceStore } from '../project/api/ui/persistence/preferenceStore';
import { installCanvasAppearance } from './ui/appearance/canvasAppearance';
import { installLocalProfile } from './ui/profile/localProfile';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.identity-account',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: {},
    capabilities: ['ui.identity-account'],
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      await trackBrowserResource(context, installPreferenceStore(window.fetch.bind(window)));
      trackBrowserResource(context, installCanvasAppearance());
      trackBrowserResource(context, installLocalProfile());
    });
  },
};
export default plugin;

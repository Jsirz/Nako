import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installComfyLogPanel } from './ui/local/comfyLogPanel';
import { installLocalRuntimeClient } from './ui/local/localRuntimeClient';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.local-runtime',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.generation-core': '^1.0.0' },
    capabilities: ['ui.local-runtime'],
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      const localRuntimeClient = trackBrowserResource(context, installLocalRuntimeClient());
      trackBrowserResource(context, installComfyLogPanel(localRuntimeClient));
    });
  },
};
export default plugin;

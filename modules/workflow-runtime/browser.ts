import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { localRuntimeUi } from '../kernel/browser';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.workflow-runtime',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.local-runtime': '^1.0.0' },
    capabilities: ['ui.workflow-runtime'],
    services: { requires: ['ui.local-runtime'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      const runtime = localRuntimeUi();
      const workflowManagerClient = runtime.createWorkflowClient();
      trackBrowserResource(context, runtime.installWorkflowNodes(workflowManagerClient));
      context.onDispose(runtime.mountWorkflowManager(workflowManagerClient));
    });
  },
};
export default definePlugin(plugin);

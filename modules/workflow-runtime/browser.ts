import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { createWorkflowManagerClient } from '../local-runtime/api/ui/local/workflowManagerClient';
import { installWorkflowManager } from '../local-runtime/api/ui/local/workflowManager';
import { installWorkflowCanvasNodes } from '../local-runtime/api/ui/local/workflowCanvasNodes';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.workflow-runtime',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.local-runtime': '^1.0.0' },
    capabilities: ['ui.workflow-runtime'],
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      const workflowManagerClient = createWorkflowManagerClient();
      trackBrowserResource(context, installWorkflowCanvasNodes(workflowManagerClient));
      trackBrowserResource(context, installWorkflowManager(workflowManagerClient));
    });
  },
};
export default plugin;

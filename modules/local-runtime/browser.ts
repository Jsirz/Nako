import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installComfyLogPanel } from './ui/local/comfyLogPanel';
import { installLocalRuntimeClient } from './ui/local/localRuntimeClient';
import { mountLocalRuntimeSettings } from './ui/local/localRuntimeSettings';
import { createWorkflowManagerClient } from './ui/local/workflowManagerClient';
import { requestWorkflowNodeRun } from './ui/local/workflowNodeSession';
import { CanvasWorkflowGenerator } from './ui/local/canvasWorkflowGenerator';
import type { LocalRuntimeUiService } from '../contracts/localRuntimeUi';
import { createWorkflowCanvasNodes, normalizeNumericParameterValues } from './ui/local/workflowCanvasNodes';
import { installWorkflowCanvasNodes } from './ui/local/workflowCanvasNodes';
import { installWorkflowManager } from './ui/local/installWorkflowManager';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.local-runtime',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.generation-core': '^1.0.0' },
    capabilities: ['ui.local-runtime'],
    services: { provides: ['ui.local-runtime'], requires: ['ui.generation.interaction', 'ui.account.preferences'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      const localRuntimeClient = trackBrowserResource(context, installLocalRuntimeClient());
      trackBrowserResource(context, installComfyLogPanel(localRuntimeClient));
      const service: LocalRuntimeUiService = {
        createWorkflowClient: createWorkflowManagerClient,
        createWorkflowNodes: createWorkflowCanvasNodes,
        installWorkflowNodes: installWorkflowCanvasNodes,
        mountWorkflowManager: installWorkflowManager,
        normalizeParameters: normalizeNumericParameterValues,
        mountSettings: host => mountLocalRuntimeSettings(host, localRuntimeClient),
        requestWorkflowNodeRun,
        renderWorkflowNode: (runtime, props, frame) => CanvasWorkflowGenerator(
          runtime as Parameters<typeof CanvasWorkflowGenerator>[0],
          props as Parameters<typeof CanvasWorkflowGenerator>[1],
          frame as Parameters<typeof CanvasWorkflowGenerator>[2],
        ),
      };
      context.services.register('ui.local-runtime', service);
    });
  },
};
export default definePlugin(plugin);

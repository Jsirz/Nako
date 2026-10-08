import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installStableCanvasClipboard } from './ui/canvas/canvasClipboard';
import { installStableCanvasConnections } from './ui/canvas/canvasConnections';
import { installStableCanvasContextActions } from './ui/canvas/canvasContextActions';
import { installStableCanvasEditing } from './ui/canvas/canvasEditing';
import { installStableCanvasGroups } from './ui/canvas/canvasGroups';
import { installStableCanvasLayout } from './ui/canvas/canvasLayout';
import { installStableCanvasNavigation } from './ui/canvas/canvasNavigation';
import { installStableCanvasSelection } from './ui/canvas/canvasSelection';
import { installStableDesignSystem } from './ui/design/designSystem';
import { installNodeFramework } from './ui/nodes/nodeFramework';
import { loadNodeDirectoryPackages } from './ui/nodes/nodeDirectoryClient';
import { nodeGenerationClient } from './ui/nodes/nodeGenerationClient';
import type { CanvasProjectUiService } from '../contracts/projectWorkflow';
import { instantiateWorkflowPreset } from './ui/canvas/canvasWorkflowPresets';
import { cleanupCanvasGroups } from './ui/canvas/canvasGroups';
import { createToast } from './ui/design/designSystem';
import { activateModal } from './ui/design/modalFocus';
import { observeStableEnhancement } from './ui/lifecycle/enhancementLifecycle';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.canvas-ui',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.asset-media': '^1.0.0' },
    capabilities: ['ui.canvas-ui'],
    services: { provides: ['node.registry', 'nodes.client', 'ui.canvas.project'], requires: ['ui.media.recovery'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      context.services.register<CanvasProjectUiService>('ui.canvas.project', Object.freeze({
        instantiateWorkflowPreset, cleanupCanvasGroups, createToast, activateModal,
        observeStableEnhancement,
      }));
      trackBrowserResource(context, installStableCanvasClipboard());
      trackBrowserResource(context, installStableCanvasConnections());
      trackBrowserResource(context, installStableCanvasContextActions());
      trackBrowserResource(context, installStableCanvasEditing());
      trackBrowserResource(context, installStableCanvasGroups());
      trackBrowserResource(context, installStableCanvasLayout());
      trackBrowserResource(context, installStableCanvasNavigation());
      trackBrowserResource(context, installStableCanvasSelection());
      context.onDispose(installStableDesignSystem().observe());
      const framework = installNodeFramework();
      context.services.register('node.registry', framework.getRegistry());
      context.services.register('nodes.client', nodeGenerationClient);
      await loadNodeDirectoryPackages(framework).catch((error) => {
        context.logger.warn(`User node directory unavailable: ${error instanceof Error ? error.message : String(error)}`);
      });
      trackBrowserResource(context, framework);
    });
  },
};
export default definePlugin(plugin);

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
import { installStableDesignSystem } from '../kernel/ui/designSystem';
import { installNodeFramework } from './ui/nodes/nodeFramework';
import { loadNodeDirectoryPackages } from './ui/nodes/nodeDirectoryClient';
import { nodeGenerationClient } from './ui/nodes/nodeGenerationClient';
import type { CanvasProjectUiService } from '../contracts/projectWorkflow';
import { instantiateWorkflowPreset } from './ui/canvas/canvasWorkflowPresets';
import { cleanupCanvasGroups } from './ui/canvas/canvasGroups';
import { createToast } from '../kernel/ui/designSystem';
import { activateModal } from '../kernel/ui/modalFocus';
import { observeStableEnhancement } from '../kernel/ui/enhancementLifecycle';
import type { NodeRunUiService } from '../contracts/nodeRunUi';
import { getNodeRun, approveNodeRun, cancelNodeRun, waitNodeRun } from './ui/nodes/nodeGraphClient';
import type { CanvasEditingService } from '../contracts/canvasEditing';
import { deleteCanvasNodes, cloneCanvasNodes, hasGeneratingCanvasNodes, insertClonedCanvasNodes } from './ui/canvas/canvasClipboard';
import { connectCanvasNodes, disconnectCanvasNodes } from './ui/canvas/canvasConnections';
import { groupCanvasNodes, ungroupCanvasNodes, renameCanvasGroup } from './ui/canvas/canvasGroups';
import { gridLayoutCanvasNodes } from './ui/canvas/canvasLayout';
import { assetNode } from './ui/canvas/canvasAssetInsertion';

import * as React from 'react';
import { CanvasTooltip } from './ui/dialogs/canvasTooltip';
import { CanvasImageAngle } from './ui/dialogs/canvasImageAngle';
import type { CanvasPresentationService } from '../contracts/canvasPresentation';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.canvas-ui',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.asset-media': '^1.0.0' },
    capabilities: ['ui.canvas-ui'],
    services: { provides: ['node.registry', 'nodes.client', 'ui.canvas.project', 'ui.nodes.runs', 'ui.canvas.editing', 'ui.canvas.presentation'], requires: ['generation.defaults', 'ui.media.recovery', 'ui.media.canvas', 'ui.generation.catalog', 'ui.generation.interaction', 'ui.local-runtime'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      context.services.register<CanvasPresentationService>('ui.canvas.presentation', Object.freeze<CanvasPresentationService>({
        tooltip: (props) => CanvasTooltip(React, { ...props, children: props.children as React.ReactNode }),
        imageAngle: (props) => React.createElement(CanvasImageAngle, props),
      }));
      context.services.register<CanvasEditingService>('ui.canvas.editing', Object.freeze({
        deleteNodes: deleteCanvasNodes, cloneNodes: cloneCanvasNodes, hasGeneratingNodes: hasGeneratingCanvasNodes,
        insertClones: insertClonedCanvasNodes, connect: connectCanvasNodes, disconnect: disconnectCanvasNodes,
        group: groupCanvasNodes, ungroup: ungroupCanvasNodes, cleanupGroups: cleanupCanvasGroups,
        renameGroup: renameCanvasGroup, grid: gridLayoutCanvasNodes, assetNode,
      }));
      context.services.register<NodeRunUiService>('ui.nodes.runs', Object.freeze({
        get: getNodeRun, approve: approveNodeRun, cancel: cancelNodeRun, wait: waitNodeRun,
      }));
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
        context.logger.warn('User node directory unavailable', { operation: 'nodes.load', error });
      });
      trackBrowserResource(context, framework);
    });
  },
};
export default definePlugin(plugin);

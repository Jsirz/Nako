import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { PluginDefinition } from '../../modules/contracts/index.js';
import { definePlugin } from '../../modules/kernel/plugin.js';
import { preventFileDropNavigation } from '../../modules/contracts/shared/fileDrop';
import { CanvasRoot } from './canvasRuntime';
import '../../modules/canvas-ui/ui/app/canvas.css';
import '../../modules/identity-account/ui/appearance/appearance.css';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.canvas-shell',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.canvas-ui': '^1.0.0', 'ui.project': '^1.0.0', 'ui.prompt': '^1.0.0', 'ui.local-runtime': '^1.0.0' },
    services: { provides: ['ui.root'], requires: ['ui.local-runtime'] },
  },
  activate(context) {
    context.services.register('ui.root', {
      mount(element: HTMLElement) {
        preventFileDropNavigation();
        if (window.nakoDesktop?.integratedTitleBar)
          document.documentElement.dataset.nkIntegratedTitlebar = 'true';
        const root = createRoot(element);
        root.render(
          <React.StrictMode>
            <CanvasRoot />
          </React.StrictMode>,
        );
        context.onDispose(() => root.unmount());
      },
    });
  },
};
export default definePlugin(plugin);

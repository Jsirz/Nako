import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { NakoPlugin } from '../contracts/index.js';
import { preventFileDropNavigation } from '../contracts/shared/fileDrop';
import { CanvasRoot } from './ui/app/canvasRuntime';
import './ui/app/canvas.css';
import '../identity-account/ui/appearance/appearance.css';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.canvas-shell',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.canvas-ui': '^1.0.0', 'ui.project': '^1.0.0', 'ui.prompt': '^1.0.0' },
    services: { provides: ['ui.root'] },
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
export default plugin;

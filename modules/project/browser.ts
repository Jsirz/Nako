import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installCanvasAutoSave } from './ui/persistence/canvasAutoSave';
import { installCanvasSession } from './ui/persistence/canvasSession';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.project',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.canvas-ui': '^1.0.0' },
    capabilities: ['ui.project'],
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      trackBrowserResource(context, installCanvasSession());
      trackBrowserResource(context, installCanvasAutoSave());
    });
  },
};
export default plugin;

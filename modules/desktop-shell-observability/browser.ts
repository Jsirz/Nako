import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { installBackendReconnectNotice } from './ui/desktop/backendReconnectNotice';
import { installUpdateSettings } from './ui/desktop/updateSettings';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.desktop-shell-observability',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.project': '^1.0.0' },
    capabilities: ['ui.desktop-shell-observability'],
  },
  activate(context) {
    context.onDispose(installBackendReconnectNotice());
    context.onDispose(installUpdateSettings());
  },
};
export default definePlugin(plugin);

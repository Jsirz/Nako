import type { PluginDefinition } from '../contracts/index.js';
import type { DesktopBrowserService } from '../contracts/desktopBrowser';
import { definePlugin } from '../kernel/plugin.js';
import { desktopBridge } from './ui/desktop/desktopBridge';
import { fileUploadBody, localFilePath, projectArchiveRestoreRequest } from './ui/desktop/localFileUpload';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.desktop-platform', version: '1.0.0', apiVersion: '^1.0.0', type: 'platform', reloadRequired: true,
    services: { provides: ['ui.desktop.capabilities'] },
  },
  activate(context) {
    context.services.register<DesktopBrowserService>('ui.desktop.capabilities', Object.freeze({
      bridge: desktopBridge, fileUploadBody, localFilePath, projectArchiveRestoreRequest,
    }));
  },
};
export default definePlugin(plugin);

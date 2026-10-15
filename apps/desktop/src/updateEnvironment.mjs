import configuration from '../../../config/desktop-updates.json' with { type: 'json' };
import path from 'node:path';
import { createSparkleUpdater } from '../../../modules/desktop-shell-observability/api/desktop/sparkleUpdater.mjs';
import { launchWindowsUpdate } from '../../../modules/desktop-shell-observability/api/desktop/windowsUpdateHandoff.mjs';
import { createModuleLogger } from '../../../modules/kernel/logger.js';
import { DESKTOP_ERRORS, desktopError } from '../../../modules/contracts/desktopErrors.js';

const logger = createModuleLogger('desktop-shell-observability');

export async function createUpdateEnvironment({ app, version, publish, beforeInstall, onInstallFailure,
  prepareQuit, cancelQuit }) {
  let disabledReason = !app.isPackaged ? '开发模式不检查更新' : !configuration.url ? '未配置更新源' : '';
  let updater;
  if (!disabledReason) {
    try {
      const url = new URL(configuration.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
        throw desktopError(DESKTOP_ERRORS.configuration, 'Invalid update configuration', 'update.configure', 400);
      if (process.platform === 'darwin') {
        const { loadSparkleBridge } = await import('electron-sparkle-updater');
        const bridge = loadSparkleBridge({ isPackaged: true, resourcesPath: process.resourcesPath,
          addonPath: path.join(app.getAppPath(), 'node_modules/electron-sparkle-updater/native/build/Release/sparkle_bridge.node'),
          log: message => logger.info('Sparkle native update log', {
            operation: 'update.sparkle', message,
          }) });
        if (!bridge) throw desktopError(DESKTOP_ERRORS.update, 'Sparkle bridge unavailable', 'update.sparkle', 503);
        updater = createSparkleUpdater({ bridge, version, prepareQuit, cancelQuit,
          feedUrl: new URL('appcast.xml', url.href).href, publicKey: configuration.sparklePublicKey });
      } else {
        const module = await import('electron-updater');
        updater = module.default.autoUpdater;
        updater.setFeedURL({ provider: 'generic', url: url.href });
      }
    } catch (error) {
      logger.error('Desktop updater initialization failed', {
        operation: 'update.initialize', error,
      });
      disabledReason = '更新配置无效，请联系发行者';
    }
  }
  const installDownloaded = process.platform === 'win32' ? info => launchWindowsUpdate({
    info, tempDirectory: app.getPath('temp'), executable: process.execPath, quit: () => app.quit(),
  }) : undefined;
  return { updater, version, disabledReason, publish, beforeInstall, onInstallFailure, installDownloaded };
}

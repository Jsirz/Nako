import configuration from '../../../config/desktop-updates.json' with { type: 'json' };
import path from 'node:path';
import { createSparkleUpdater } from '../../../modules/desktop-shell-observability/api/desktop/sparkleUpdater.mjs';
import { launchWindowsUpdate } from '../../../modules/desktop-shell-observability/api/desktop/windowsUpdateHandoff.mjs';

export async function createUpdateEnvironment({ app, version, publish, beforeInstall, onInstallFailure,
  prepareQuit, cancelQuit }) {
  let disabledReason = !app.isPackaged ? '开发模式不检查更新' : !configuration.url ? '未配置更新源' : '';
  let updater;
  if (!disabledReason) {
    try {
      const url = new URL(configuration.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
        throw new Error('Invalid update configuration');
      if (process.platform === 'darwin') {
        const { loadSparkleBridge } = await import('electron-sparkle-updater');
        const bridge = loadSparkleBridge({ isPackaged: true, resourcesPath: process.resourcesPath,
          addonPath: path.join(app.getAppPath(), 'node_modules/electron-sparkle-updater/native/build/Release/sparkle_bridge.node'),
          log: message => console.error('[Sparkle]', message) });
        if (!bridge) throw new Error('Sparkle bridge unavailable');
        updater = createSparkleUpdater({ bridge, version, prepareQuit, cancelQuit,
          feedUrl: new URL('appcast.xml', url.href).href, publicKey: configuration.sparklePublicKey });
      } else {
        const module = await import('electron-updater');
        updater = module.default.autoUpdater;
        updater.setFeedURL({ provider: 'generic', url: url.href });
      }
    } catch (error) {
      console.error('Desktop updater initialization failed', error);
      disabledReason = '更新配置无效，请联系发行者';
    }
  }
  const installDownloaded = process.platform === 'win32' ? info => launchWindowsUpdate({
    info, tempDirectory: app.getPath('temp'), executable: process.execPath, quit: () => app.quit(),
  }) : undefined;
  return { updater, version, disabledReason, publish, beforeInstall, onInstallFailure, installDownloaded };
}

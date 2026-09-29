import configuration from '../../../config/desktop-updates.json' with { type: 'json' };
import { launchWindowsUpdate } from '../../../modules/desktop-shell-observability/api/desktop/windowsUpdateHandoff.mjs';

export async function createUpdateEnvironment({ app, version, publish, beforeInstall, onInstallFailure }) {
  let disabledReason = !app.isPackaged ? '开发模式不检查更新' : !configuration.url ? '未配置更新源' : '';
  let updater;
  if (!disabledReason) {
    try {
      const url = new URL(configuration.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
        throw new Error('Invalid update configuration');
      const module = await import('electron-updater');
      updater = module.default.autoUpdater;
      updater.setFeedURL({ provider: 'generic', url: url.href });
    } catch { disabledReason = '更新配置无效，请联系发行者'; }
  }
  const installDownloaded = process.platform === 'win32' ? info => launchWindowsUpdate({
    info, tempDirectory: app.getPath('temp'), executable: process.execPath, quit: () => app.quit(),
  }) : undefined;
  return { updater, version, disabledReason, publish, beforeInstall, onInstallFailure, installDownloaded };
}

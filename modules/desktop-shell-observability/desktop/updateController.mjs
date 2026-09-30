import { ERRORS, PluginError } from '../../contracts/index.js';

const PERIODIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Update state stays in the desktop process and survives settings/window remounts. */
export function createUpdateController({ updater, version, disabledReason, publish, beforeInstall,
  installDownloaded,
  onInstallFailure = async () => {}, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let state = { version, phase: disabledReason ? 'disabled' : 'idle',
    message: disabledReason || '点击检查更新' };
  let running = null;
  let disposed = false;
  let timer;
  let automaticChecksStarted = false;
  let cancellation;
  let downloaded;
  const listeners = [];
  const snapshot = () => ({ ...state });
  function change(patch) {
    if (disposed) return;
    state = { ...state, ...patch };
    publish(snapshot());
  }
  function fail(error) {
    if (error) console.error('Desktop update failed', error);
    const restoreBackend = !disposed && state.phase === 'installing';
    change({ phase: 'error', percent: undefined, message: '更新失败，请检查网络或稍后重试' });
    if (restoreBackend) void Promise.resolve().then(onInstallFailure).catch(() => {});
  }
  function listen(name, handler) {
    updater.on(name, handler);
    listeners.push([name, handler]);
  }
  if (!disabledReason) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.allowPrerelease = false;
    updater.logger = null;
    listen('error', fail);
    listen('update-available', info => change({ phase: 'available', nextVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      message: `发现新版本 ${info.version}` }));
    listen('update-not-available', () => change({ phase: 'current', nextVersion: undefined,
      message: '当前已是最新版本', checkedAt: new Date().toISOString() }));
    listen('download-progress', progress => change({ phase: 'downloading',
      percent: Math.max(0, Math.min(100, Number(progress.percent) || 0)),
      message: progress.phase === 'apply' ? '正在校验并准备更新' : '正在下载更新' }));
    listen('update-downloaded', info => {
      downloaded = info;
      change({ phase: 'downloaded', nextVersion: info.version,
        percent: 100, message: '更新已就绪，重启后安装' });
    });
  }
  function check() {
    if (disposed || disabledReason || ['downloaded', 'installing'].includes(state.phase))
      return Promise.resolve(snapshot());
    if (state.phase === 'available') return Promise.resolve(snapshot());
    if (running) return running;
    change({ phase: 'checking', percent: undefined, nextVersion: undefined, message: '正在检查更新' });
    running = Promise.resolve().then(async () => {
      try {
        if (disposed) return snapshot();
        const result = await updater.checkForUpdates();
        if (!result) throw new PluginError(ERRORS.desktopUpdate, 'Update check unavailable');
        if (!disposed && state.phase === 'available') cancellation = result.cancellationToken;
      } catch { fail(); }
      finally {
        running = null;
        // Keep the updater cancellation token until the user starts downloading.
        if (state.phase !== 'available') cancellation = null;
      }
      return snapshot();
    });
    return running;
  }
  function download() {
    if (running) return running;
    if (disposed || disabledReason || state.phase !== 'available')
      return Promise.resolve(snapshot());
    change({ phase: 'downloading', percent: 0, message: '正在下载更新' });
    running = Promise.resolve().then(async () => {
      try { if (!disposed) await updater.downloadUpdate(cancellation); }
      catch { fail(); }
      finally { running = null; cancellation = null; }
      return snapshot();
    });
    return running;
  }
  async function install() {
    if (disposed || state.phase !== 'downloaded' || running) return snapshot();
    change({ phase: 'installing', message: '准备重启安装' });
    try {
      if (!await beforeInstall()) {
        change({ phase: 'downloaded', message: '更新已就绪，重启后安装' });
      } else if (!disposed) {
        if (installDownloaded) await installDownloaded(downloaded);
        else updater.quitAndInstall(true, true);
      }
    } catch { fail(); }
    return snapshot();
  }
  function schedule(delay) {
    timer = setTimer(async () => {
      timer = undefined;
      await check();
      if (!disposed) schedule(PERIODIC_CHECK_INTERVAL_MS);
    }, delay);
    timer?.unref?.();
  }
  return {
    state: snapshot, check, download, install,
    start() {
      if (disabledReason || disposed || automaticChecksStarted) return;
      automaticChecksStarted = true;
      // Check on the next event-loop turn without blocking desktop startup.
      schedule(0);
    },
    dispose() {
      disposed = true;
      clearTimer(timer);
      timer = undefined;
      cancellation?.cancel();
      updater?.dispose?.();
      const remove = () => {
        for (const [event, handler] of listeners) updater.removeListener(event, handler);
      };
      if (running) void running.finally(remove);
      else remove();
    },
  };
}

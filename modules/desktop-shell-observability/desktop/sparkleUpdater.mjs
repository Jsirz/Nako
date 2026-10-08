import { DESKTOP_ERRORS, desktopError, desktopFailure } from '../../contracts/desktopErrors.js';
import { EventEmitter } from 'node:events';
import { readSparkleAppcast } from './sparkleAppcast.mjs';

/** Keep the existing check/confirm-download/confirm-install contract around Sparkle. */
export function createSparkleUpdater({ bridge, feedUrl, publicKey, version,
  fetchFeed = fetch, prepareQuit = () => {}, cancelQuit = () => {},
  setTimer = setTimeout, clearTimer = clearTimeout, downloadTimeout = 30 * 60_000 }) {
  const updater = new EventEmitter();
  let pending;
  let expectedVersion;
  let ready = false;
  let active = true;
  let installing = false;
  let installTimer;
  function fail(error) {
    error = desktopFailure(error, DESKTOP_ERRORS.update, 'Sparkle update failed', 'update.sparkle');
    ready = false;
    clearTimer(installTimer);
    if (installing) cancelQuit();
    installing = false;
    const work = pending;
    pending = undefined;
    if (work) { clearTimer(work.timer); work.reject(error); }
    else if (active) updater.emit('error', error);
  }
  bridge.setEventHandler(event => {
    if (!active) return;
    if (event.type === 'error') return fail(desktopError(DESKTOP_ERRORS.update, event.message || 'Sparkle update failed', 'update.sparkle'));
    if (!pending) return;
    if (event.type === 'download-progress') updater.emit('download-progress', event);
    if (event.type === 'update-not-available') fail(desktopError(DESKTOP_ERRORS.update, 'Update is no longer available', 'update.download', 409));
    if (event.type === 'update-downloaded') {
      if (event.version !== expectedVersion) return fail(desktopError(DESKTOP_ERRORS.update, 'Sparkle version changed; check again', 'update.download', 409));
      const work = pending;
      pending = undefined;
      ready = true;
      clearTimer(work.timer);
      updater.emit('update-downloaded', { version: event.version });
      work.resolve([]);
    }
  });
  if (!bridge.init({ appcastUrl: feedUrl, publicEdKey: publicKey }))
    throw desktopError(DESKTOP_ERRORS.update, 'Sparkle initialization failed', 'update.initialize');
  // The controller schedules checks; native checks also download, so run them only on consent.
  bridge.setAutomaticChecks(false);
  updater.checkForUpdates = async () => {
    const response = await fetchFeed(feedUrl, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
    if (!response.ok) throw desktopError(DESKTOP_ERRORS.update, `Sparkle feed HTTP ${response.status}`, 'update.fetchFeed', 502);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 2 * 1024 * 1024) throw desktopError(DESKTOP_ERRORS.update, 'Sparkle feed too large', 'update.fetchFeed', 413);
    const info = readSparkleAppcast(data, publicKey, version);
    expectedVersion = info?.version;
    ready = false;
    updater.emit(info ? 'update-available' : 'update-not-available', info || { version });
    return {};
  };
  updater.downloadUpdate = () => {
    if (pending) return pending.promise;
    if (!expectedVersion) return Promise.reject(desktopError(DESKTOP_ERRORS.update, 'No confirmed Sparkle update', 'update.download', 409));
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    pending = { promise, resolve, reject, timer: setTimer(() => fail(desktopError(DESKTOP_ERRORS.update, 'Sparkle download timed out', 'update.download', 504)), downloadTimeout) };
    pending.timer?.unref?.();
    try { bridge.checkForUpdates(); } catch (error) { fail(error); }
    return promise;
  };
  updater.quitAndInstall = () => {
    if (!ready) throw desktopError(DESKTOP_ERRORS.update, 'Sparkle installer is not ready', 'update.install', 409);
    installing = true;
    prepareQuit();
    installTimer = setTimer(() => fail(desktopError(DESKTOP_ERRORS.update, 'Sparkle did not terminate the application', 'update.install', 504)), 60_000);
    installTimer?.unref?.();
    try { bridge.installUpdateNow(); } catch (error) { fail(error); }
  };
  updater.dispose = () => {
    active = false;
    clearTimer(installTimer);
    if (pending) { clearTimer(pending.timer); pending.reject(desktopError(DESKTOP_ERRORS.update, 'Updater stopped', 'update.dispose', 499)); pending = undefined; }
  };
  return updater;
}

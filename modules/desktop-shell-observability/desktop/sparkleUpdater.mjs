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
    if (event.type === 'error') return fail(new Error(event.message || 'Sparkle update failed'));
    if (!pending) return;
    if (event.type === 'download-progress') updater.emit('download-progress', event);
    if (event.type === 'update-not-available') fail(new Error('Update is no longer available'));
    if (event.type === 'update-downloaded') {
      if (event.version !== expectedVersion) return fail(new Error('Sparkle version changed; check again'));
      const work = pending;
      pending = undefined;
      ready = true;
      clearTimer(work.timer);
      updater.emit('update-downloaded', { version: event.version });
      work.resolve([]);
    }
  });
  if (!bridge.init({ appcastUrl: feedUrl, publicEdKey: publicKey }))
    throw new Error('Sparkle initialization failed');
  // The controller schedules checks; native checks also download, so run them only on consent.
  bridge.setAutomaticChecks(false);
  updater.checkForUpdates = async () => {
    const response = await fetchFeed(feedUrl, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Sparkle feed HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 2 * 1024 * 1024) throw new Error('Sparkle feed too large');
    const info = readSparkleAppcast(data, publicKey, version);
    expectedVersion = info?.version;
    ready = false;
    updater.emit(info ? 'update-available' : 'update-not-available', info || { version });
    return {};
  };
  updater.downloadUpdate = () => {
    if (pending) return pending.promise;
    if (!expectedVersion) return Promise.reject(new Error('No confirmed Sparkle update'));
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    pending = { promise, resolve, reject, timer: setTimer(() => fail(new Error('Sparkle download timed out')), downloadTimeout) };
    pending.timer?.unref?.();
    try { bridge.checkForUpdates(); } catch (error) { fail(error); }
    return promise;
  };
  updater.quitAndInstall = () => {
    if (!ready) throw new Error('Sparkle installer is not ready');
    installing = true;
    prepareQuit();
    installTimer = setTimer(() => fail(new Error('Sparkle did not terminate the application')), 60_000);
    installTimer?.unref?.();
    try { bridge.installUpdateNow(); } catch (error) { fail(error); }
  };
  updater.dispose = () => {
    active = false;
    clearTimer(installTimer);
    if (pending) { clearTimer(pending.timer); pending.reject(new Error('Updater stopped')); pending = undefined; }
  };
  return updater;
}

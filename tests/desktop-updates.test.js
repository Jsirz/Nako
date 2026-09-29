import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import { createUpdateController } from '../modules/desktop-shell-observability/desktop/updateController.mjs';
import configuration from '../scripts/desktop/updateFeed.cjs';

const disposers = [];
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); });
function setup(options = {}) {
  const updater = new EventEmitter();
  updater.checkForUpdates = vi.fn(async () => {
    updater.emit('update-not-available', { version: '1.1.3' });
    return {};
  });
  updater.downloadUpdate = vi.fn(async () => {
    updater.emit('download-progress', { percent: 48 });
    updater.emit('update-downloaded', { version: '1.1.4' });
  });
  updater.quitAndInstall = vi.fn();
  const publish = vi.fn(), beforeInstall = vi.fn(async () => true);
  const controller = createUpdateController({ updater, version: '1.1.3', publish, beforeInstall, ...options });
  disposers.push(controller.dispose);
  return { updater, controller, publish, beforeInstall };
}

it('does not perform network work or installation without a feed', async () => {
  const { updater, controller } = setup({ disabledReason: '未配置更新源' });
  controller.start();
  expect((await controller.check()).phase).toBe('disabled');
  await controller.install();
  expect(updater.checkForUpdates).not.toHaveBeenCalled();
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
});

it('checks immediately without blocking startup, repeats every six hours, and stops on disposal', async () => {
  vi.useFakeTimers();
  const { updater, controller } = setup();
  controller.start(); controller.start();
  expect(updater.checkForUpdates).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(0);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
  expect(controller.state().phase).toBe('current');
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
  controller.dispose();
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
});

it('does not queue a second startup check after the first one has fired', async () => {
  vi.useFakeTimers();
  const { updater, controller } = setup();
  controller.start();
  await vi.advanceTimersByTimeAsync(0);
  controller.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(updater.checkForUpdates).toHaveBeenCalledOnce();
});

it('waits for download confirmation and installs only after preparation succeeds', async () => {
  const { updater, controller, beforeInstall, publish } = setup();
  const cancellationToken = { cancel: vi.fn() };
  let release;
  updater.checkForUpdates.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const first = controller.check(), second = controller.check();
  expect(first).toBe(second);
  await Promise.resolve();
  updater.emit('update-available', { version: '1.1.4' }); release({ cancellationToken });
  await first;
  expect(updater.downloadUpdate).not.toHaveBeenCalled();
  expect(controller.state().phase).toBe('available');
  const download = controller.download();
  expect(controller.download()).toBe(download);
  await download;
  expect(updater.downloadUpdate).toHaveBeenCalledOnce();
  expect(updater.downloadUpdate).toHaveBeenCalledWith(cancellationToken);
  expect(publish.mock.calls.some(([state]) => state.percent === 48)).toBe(true);
  expect(controller.state().phase).toBe('downloaded');
  await controller.check();
  expect(controller.state().phase).toBe('downloaded');
  expect(updater.autoInstallOnAppQuit).toBe(false);
  expect(updater.allowDowngrade).toBe(false);
  beforeInstall.mockResolvedValueOnce(false);
  await controller.install();
  expect(controller.state().phase).toBe('downloaded');
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
  await controller.install(); await controller.install();
  expect(updater.quitAndInstall).toHaveBeenCalledExactlyOnceWith(true, true);
});

it('does not download when no update is available', async () => {
  const { updater, controller } = setup();
  await controller.check();
  expect(controller.state().phase).toBe('current');
  await controller.download();
  expect(updater.downloadUpdate).not.toHaveBeenCalled();
});

it('hands a verified download to the independent installer only after preparation', async () => {
  const installDownloaded = vi.fn(async () => {});
  const { controller, updater, beforeInstall } = setup({ installDownloaded });
  const info = { version: '1.1.4', downloadedFile: 'fixture.exe', files: [] };
  updater.emit('update-downloaded', info);
  await controller.install();
  expect(beforeInstall).toHaveBeenCalledOnce();
  expect(installDownloaded).toHaveBeenCalledExactlyOnceWith(info);
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
  await controller.install();
  expect(installDownloaded).toHaveBeenCalledOnce();
});

it('keeps the app available and restores its backend if helper handoff fails', async () => {
  const installDownloaded = vi.fn(async () => { throw new Error('helper failed'); });
  const onInstallFailure = vi.fn(async () => {});
  const { controller, updater } = setup({ installDownloaded, onInstallFailure });
  updater.emit('update-downloaded', { version: '1.1.4' });
  await controller.install();
  expect(controller.state().phase).toBe('error');
  expect(onInstallFailure).toHaveBeenCalledOnce();
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
});

it('allows a failed download to be retried after a new available event', async () => {
  const { updater, controller } = setup();
  await controller.check();
  updater.emit('update-available', { version: '1.1.4' });
  updater.downloadUpdate.mockRejectedValueOnce(new Error('network failed'));
  await controller.download();
  expect(controller.state().phase).toBe('error');
  updater.emit('update-available', { version: '1.1.4' });
  await controller.download();
  expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
  expect(controller.state().phase).toBe('downloaded');
});

it('deduplicates concurrent download calls', async () => {
  const { updater, controller } = setup();
  await controller.check();
  updater.emit('update-available', { version: '1.1.4' });
  let release;
  updater.downloadUpdate.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const first = controller.download();
  const second = controller.download();
  expect(second).toBe(first);
  await Promise.resolve();
  release();
  await first;
  expect(updater.downloadUpdate).toHaveBeenCalledOnce();
});

it('reports an offline error without exposing URLs and permits a retry', async () => {
  const { updater, controller } = setup();
  updater.checkForUpdates.mockRejectedValueOnce(new Error('https://private-server/token'));
  expect((await controller.check()).phase).toBe('error');
  expect(controller.state().message).not.toContain('private-server');
  expect((await controller.check()).phase).toBe('current');
});

it('releases the request lock after a synchronous updater failure', async () => {
  const { updater, controller } = setup();
  updater.checkForUpdates.mockImplementationOnce(() => { throw new Error('updater failed'); });
  expect((await controller.check()).phase).toBe('error');
  expect((await controller.check()).phase).toBe('current');
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
});

it('restores the local backend if the installer fails after shutdown', async () => {
  const onInstallFailure = vi.fn(async () => {});
  const { updater, controller } = setup({ onInstallFailure });
  updater.emit('update-downloaded', { version: '1.1.4' });
  updater.quitAndInstall.mockImplementation(() => updater.emit('error', new Error('installer failed')));
  await controller.install();
  expect(controller.state().phase).toBe('error');
  expect(onInstallFailure).toHaveBeenCalledOnce();
});

it('does not download after disposal while a check is in flight', async () => {
  const { updater, controller } = setup();
  let release;
  updater.checkForUpdates.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const promise = controller.check();
  await Promise.resolve();
  controller.dispose();
  updater.emit('update-available', { version: '1.1.4' }); release({});
  await promise;
  expect(updater.downloadUpdate).not.toHaveBeenCalled();
});

it('does not start a queued network check after disposal', async () => {
  const { updater, controller } = setup();
  const pending = controller.check();
  controller.dispose();
  await pending;
  expect(updater.checkForUpdates).not.toHaveBeenCalled();
});

it('separates update feeds by platform and CPU', () => {
  expect(configuration.updateFeed('win32', 'x64', 'https://updates.example.com/nako'))
    .toBe('https://updates.example.com/nako/windows-x64/');
  expect(configuration.updateFeed('darwin', 'arm64', 'https://updates.example.com/nako/'))
    .toBe('https://updates.example.com/nako/mac-arm64/');
  expect(configuration.updateFeed('win32', 'x64', '')).toBeNull();
});

it.each(['http://updates.example.com', 'https://user:secret@updates.example.com',
  'https://updates.example.com/?token=secret', 'https://updates.example.com/#fragment', 'bad-url'])
('rejects unsafe update configuration %s', input => {
  expect(() => configuration.updateFeed('win32', 'x64', input)).toThrow();
});

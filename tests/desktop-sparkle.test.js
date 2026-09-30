import { afterEach, expect, it, vi } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readSparkleAppcast } from '../modules/desktop-shell-observability/desktop/sparkleAppcast.mjs';
import { createSparkleUpdater } from '../modules/desktop-shell-observability/desktop/sparkleUpdater.mjs';
import { createUpdateController } from '../modules/desktop-shell-observability/desktop/updateController.mjs';

const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
function feed(version = '1.5.6') {
  const xml = `<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel><item>
    <sparkle:version>${version}</sparkle:version><sparkle:shortVersionString>${version}</sparkle:shortVersionString>
    <enclosure url="https://updates.example.com/mac-arm64/update.zip" sparkle:edSignature="signature" />
  </item></channel></rss>\n`;
  return Buffer.from(`${xml}<!-- sparkle-signatures:\nedSignature: ${sign(null, Buffer.from(xml), keys.privateKey).toString('base64')}\nlength: ${Buffer.byteLength(xml)}\n-->\n`);
}
const disposers = [];
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); vi.restoreAllMocks(); });
function setup() {
  let event;
  const bridge = {
    init: vi.fn(() => true), setEventHandler: fn => { event = fn; }, setAutomaticChecks: vi.fn(),
    checkForUpdates: vi.fn(), installUpdateNow: vi.fn(),
  };
  const prepareQuit = vi.fn(), cancelQuit = vi.fn(), restore = vi.fn(), stop = vi.fn(async () => true);
  const updater = createSparkleUpdater({ bridge, publicKey, version: '1.5.5',
    feedUrl: 'https://updates.example.com/mac-arm64/appcast.xml',
    fetchFeed: async () => new Response(feed()), prepareQuit, cancelQuit });
  const controller = createUpdateController({ updater, version: '1.5.5', publish: vi.fn(),
    beforeInstall: stop, onInstallFailure: restore });
  disposers.push(() => controller.dispose());
  return { bridge, controller, event: value => event(value), prepareQuit, cancelQuit, restore, stop };
}

it('verifies the signed appcast and rejects metadata edits, wrong keys and unsigned feeds', () => {
  expect(readSparkleAppcast(feed(), publicKey, '1.5.5')?.version).toBe('1.5.6');
  expect(readSparkleAppcast(feed('1.5.4'), publicKey, '1.5.5')).toBeNull();
  expect(() => readSparkleAppcast(feed().toString().replace('1.5.6', '9.5.6'), publicKey, '1.5.5')).toThrow('verification');
  expect(() => readSparkleAppcast(feed(), Buffer.alloc(32).toString('base64'), '1.5.5')).toThrow('verification');
  expect(() => readSparkleAppcast('<rss/>', publicKey, '1.5.5')).toThrow('not signed');
});

it('checks without downloading and waits for native readiness before stopping the backend', async () => {
  const s = setup();
  expect((await s.controller.check()).phase).toBe('available');
  expect(s.bridge.checkForUpdates).not.toHaveBeenCalled();
  expect(s.bridge.setAutomaticChecks).toHaveBeenCalledWith(false);
  const downloading = s.controller.download();
  await Promise.resolve();
  expect(s.bridge.checkForUpdates).toHaveBeenCalledOnce();
  s.event({ type: 'download-progress', phase: 'apply', percent: 80 });
  expect(s.controller.state().message).toBe('正在校验并准备更新');
  await s.controller.install();
  expect(s.stop).not.toHaveBeenCalled();
  s.event({ type: 'update-downloaded', version: '1.5.6' });
  await downloading;
  await s.controller.install();
  expect(s.stop).toHaveBeenCalledOnce();
  expect(s.prepareQuit).toHaveBeenCalledOnce();
  expect(s.bridge.installUpdateNow).toHaveBeenCalledOnce();
});

it('restores the backend and quit interception when native installation does not terminate', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const s = setup();
  await s.controller.check();
  const download = s.controller.download(); await Promise.resolve();
  s.event({ type: 'update-downloaded', version: '1.5.6' }); await download;
  await s.controller.install();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(s.controller.state().phase).toBe('error');
  expect(s.cancelQuit).toHaveBeenCalledOnce();
  expect(s.restore).toHaveBeenCalledOnce();
});

it('rejects a feed change between confirmation and native download', async () => {
  const s = setup();
  await s.controller.check();
  const download = s.controller.download(); await Promise.resolve();
  s.event({ type: 'update-downloaded', version: '1.6.0' });
  expect((await download).phase).toBe('error');
  expect(s.stop).not.toHaveBeenCalled();
});

it('fails initialization instead of advertising a usable updater', () => {
  expect(() => createSparkleUpdater({ bridge: { setEventHandler() {}, init: () => false },
    publicKey, version: '1.5.5', feedUrl: 'https://example.com/appcast.xml' })).toThrow('initialization failed');
});

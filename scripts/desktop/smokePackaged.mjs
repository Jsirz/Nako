import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const expectedVersion = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const mac = process.platform === 'darwin';
const executablePath = process.argv[2] || path.join(root, 'release', mac
  ? `${process.arch === 'arm64' ? 'mac-arm64' : 'mac'}/Nako 画布.app/Contents/MacOS/Nako 画布`
  : 'win-unpacked/Nako 画布.exe');
const resources = path.resolve(path.dirname(executablePath), mac ? '../Resources/app' : 'resources/app');
if (!mac) {
  const helper = await readFile(path.join(resources, 'modules/desktop-shell-observability/desktop/windows/NakoUpdate.exe'));
  assert.equal(helper.subarray(0, 2).toString('ascii'), 'MZ', 'Packaged Windows update helper is missing or invalid');
}
const output = path.join(root, '.verification', `packaged-${process.platform}-${process.arch}`);
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, 'profile-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE'
  && !/^(NAKO_|RELAY_)/.test(key) && !/(API_KEY|ACCESS_KEY|SECRET_KEY|TOKEN|PASSWORD)$/.test(key)));
Object.assign(env, { NAKO_DESKTOP_DATA_ROOT: path.join(profile, 'data'), NAKO_DESKTOP_STATE_ROOT: path.join(profile, 'state') });
const errors = [];
let app;
async function canvas() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const page = app.context().pages().find((page) => page.url() === 'nako://app/');
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Packaged canvas did not start; inspect isolated backend logs.');
}
async function launch() {
  app = await electron.launch({ executablePath, env, timeout: 60000 });
  app.context().on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
  assert.equal(await app.evaluate(({ app }) => app.getVersion()), expectedVersion);
  assert.equal(await app.evaluate(({ app }) => app.getName()), 'Nako 画布');
  return canvas();
}
async function api(page, url, options) {
  return page.evaluate(async ({ url, options }) => {
    const response = await fetch(url, options);
    return { status: response.status, body: await response.json() };
  }, { url, options });
}
try {
  const video = path.join(profile, 'fixture.mp4');
  await promisify(execFile)(path.join(resources, 'bin', mac ? 'ffmpeg' : 'ffmpeg.exe'),
    ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=12',
      '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video], { windowsHide: true, timeout: 30000 });
  let page = await launch();
  const info = await page.evaluate(() => window.nakoShell.info());
  assert.equal(info.version, expectedVersion);
  assert.equal(info.productVersion, expectedVersion);
  // The update server may still contain the previous release (or no Sparkle feed during migration).
  // Complete the real check and dismiss its prompt before exercising unrelated application UI.
  const initialUpdate = await page.evaluate(() => window.nakoDesktop.updates.check());
  if (initialUpdate.phase === 'error') {
    await page.getByRole('dialog', { name: '更新失败' }).getByRole('button', { name: '关闭', exact: true }).click();
  } else if (initialUpdate.phase === 'available') {
    await page.getByRole('button', { name: '稍后提醒', exact: true }).click();
  }
  assert.equal((await api(page, '/api/config/keys')).status, 200);
  await page.getByRole('button', { name: '新建项目', exact: true }).click();
  await page.getByRole('button', { name: 'SKILL 管理', exact: true }).waitFor();
  assert.equal((await api(page, '/api/agent-skills')).status, 200);
  const updateState = await page.evaluate(() => window.nakoDesktop.updates.state());
  assert.equal(updateState.version, expectedVersion);
  const updateConfiguration = JSON.parse(await readFile(path.join(resources, 'config/desktop-updates.json'), 'utf8'));
  if (updateConfiguration.url) assert.notEqual(updateState.phase, 'disabled', updateState.message);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  const versionButton = page.getByRole('button', { name: `当前版本 ${expectedVersion}，检查更新` });
  await versionButton.waitFor();
  await page.screenshot({ path: path.join(output, 'settings-version.png') });
  if (updateState.phase === 'disabled') {
    assert.equal(await versionButton.isDisabled(), true);
    assert.equal((await page.evaluate(() => window.nakoDesktop.updates.check())).phase, 'disabled');
  }
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.unmaximize();
    window.setContentSize(720, 600);
  });
  await page.waitForFunction(() => window.innerWidth <= 724);
  await page.screenshot({ path: path.join(output, 'settings-version-narrow.png') });
  const footerFits = await page.locator('[data-nako-settings-version]').evaluate(element => {
    const bounds = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
    return bounds.bottom <= parent.bottom && bounds.top >= parent.top
      && element.scrollWidth <= element.clientWidth;
  });
  assert.equal(footerFits, true);
  await page.getByRole('button', { name: '关闭设置', exact: true }).click();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1180, 820));
  // A fake credential only, in the isolated profile; no provider request is made.
  if (!mac) {
    const saved = await api(page, '/api/config/keys', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ OPENAI_API_KEY: 'package-smoke-fake-key' }) });
    assert.equal(saved.status, 200);
    const [userId] = await readdir(path.join(profile, 'data', 'users'));
    const encrypted = await readFile(path.join(profile, 'data', 'users', userId, 'private', 'provider-credentials.dpapi'));
    assert.equal(encrypted.includes(Buffer.from('package-smoke-fake-key')), false);
  }
  const media = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const response = await fetch('/api/assets/upload/videos', { method: 'POST',
      headers: { 'content-type': 'video/mp4', 'x-project-id': 'package-smoke', 'x-filename': 'fixture.mp4' }, body: bytes });
    return { status: response.status, body: await response.json() };
  }, (await readFile(video)).toString('base64'));
  assert.equal(media.status, 200, JSON.stringify(media.body));
  assert.equal(media.body.asset.width, 320);
  assert.ok(media.body.asset.duration > 0);
  await page.screenshot({ path: path.join(output, 'canvas.png') });
  await app.close(); app = null;
  page = await launch();
  const restoredConfig = await api(page, '/api/config/keys');
  assert.equal(restoredConfig.status, 200);
  if (!mac) assert.equal(restoredConfig.body.OPENAI_API_KEY, '********');
  assert.equal(await page.evaluate(async (url) => (await fetch(url)).status, media.body.url), 200);
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ ok: true, executablePath, version: expectedVersion,
    checks: ['packaged launcher', 'isolated profile', 'backend health', 'new project', 'skill storage',
      'update IPC and settings version', 'narrow settings layout',
      'bundled ffmpeg', 'video upload and ffprobe metadata', 'restart',
      ...(mac ? [] : ['DPAPI credential encryption and restart recovery'])], errors }, null, 2));
  process.stdout.write('Packaged desktop smoke passed.\n');
} finally {
  if (app) await app.close();
}

import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, '.verification', 'desktop-update-settings');
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, 'profile-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE'
  && !/^(NAKO_|RELAY_)/.test(key) && !/(API_KEY|ACCESS_KEY|SECRET_KEY|TOKEN|PASSWORD)$/.test(key)));
Object.assign(env, { NAKO_DESKTOP_DATA_ROOT: path.join(profile, 'data'),
  NAKO_DESKTOP_STATE_ROOT: path.join(profile, 'state') });
const app = await electron.launch({ executablePath: path.join(root, 'apps/desktop/node_modules/electron/dist',
  process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron.exe'),
  args: [path.join(root, 'apps/desktop')], env, timeout: 60_000 });
const errors = [];
app.context().on('page', page => page.on('pageerror', error => errors.push(error.message)));
try {
  const deadline = Date.now() + 60_000;
  let page;
  while (!page && Date.now() < deadline) {
    page = app.context().pages().find(candidate => candidate.url() === 'nako://app/');
    if (!page) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(page, 'Canvas did not load');
  await page.getByRole('button', { name: '新建项目', exact: true }).click();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  const button = page.getByRole('button', { name: `当前版本 ${version}，检查更新` });
  await button.waitFor();
  await page.getByText('开发模式不检查更新', { exact: true }).waitFor();
  assert.equal(await button.isDisabled(), true);
  const state = await page.evaluate(() => window.nakoDesktop.updates.check());
  assert.equal(state.phase, 'disabled');
  assert.equal(state.version, version);
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, size) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.unmaximize();
      window.setContentSize(size, 700);
    }, width);
    await page.waitForFunction(size => window.innerWidth <= size + 4, width);
    await page.screenshot({ path: path.join(output, `settings-${width}.png`) });
    const fits = await page.locator('[data-nako-settings-version]').evaluate(element => {
      const box = element.getBoundingClientRect(), aside = element.parentElement.getBoundingClientRect();
      return box.top >= aside.top && box.bottom <= aside.bottom && box.left >= aside.left
        && box.right <= aside.right && element.scrollWidth <= element.clientWidth;
    });
    assert.equal(fits, true, `Version footer must fit at ${width}px`);
  }
  await page.getByRole('button', { name: '关闭设置', exact: true }).click();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await button.waitFor();
  await page.getByText('开发模式不检查更新', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ ok: true, version, errors,
    checks: ['isolated source desktop', 'update IPC', 'settings footer at 1180/720px', 'settings reopen'] }, null, 2));
  process.stdout.write('Desktop update settings smoke passed.\n');
} finally { await app.close(); }

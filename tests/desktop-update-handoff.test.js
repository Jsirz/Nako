import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { launchWindowsUpdate, validateInstaller } from '../modules/desktop-shell-observability/desktop/windowsUpdateHandoff.mjs';

const directories = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-handoff-test-'));
  directories.push(root);
  const installer = path.join(root, 'setup.exe'), helper = path.join(root, 'helper.exe');
  await writeFile(installer, 'fixture only'); await writeFile(helper, 'helper fixture');
  const sha512 = createHash('sha512').update('fixture only').digest('base64');
  const info = { downloadedFile: installer, version: '9.8.7', files: [{ url: 'setup.exe', sha512 }] };
  return { root, info, helper };
}
it('checks the downloaded package hash again before launching a helper', async () => {
  const { info } = await fixture();
  expect(await validateInstaller(info)).toMatchObject({ version: '9.8.7', installer: info.downloadedFile });
  await writeFile(info.downloadedFile, 'tampered');
  await expect(validateInstaller(info)).rejects.toThrow('校验失败');
  await expect(validateInstaller({ ...info, files: [] })).rejects.toThrow('信息无效');
});
it('copies the helper outside the installation and quits only after ready and commit', async () => {
  const { root, info, helper } = await fixture();
  let handoff;
  const launch = vi.fn((filename, args, options) => {
    handoff = options.cwd;
    expect(filename).toBe(path.join(handoff, 'NakoUpdate.exe'));
    expect(args).toEqual([path.join(handoff, 'job.json')]);
    expect(options.detached).toBe(true);
    expect(options.windowsHide).toBe(false);
    expect(options.env.TEST_SECRET_KEY).toBeUndefined();
    void writeFile(path.join(handoff, 'ready'), 'ready');
    return Object.assign(new EventEmitter(), { unref() {} });
  });
  const quit = vi.fn();
  process.env.TEST_SECRET_KEY = 'not-passed';
  try {
    await launchWindowsUpdate({ info, tempDirectory: root, helper, executable: path.join(root, 'app.exe'), quit, launch });
  } finally { delete process.env.TEST_SECRET_KEY; }
  expect(quit).toHaveBeenCalledOnce();
  expect(await readFile(path.join(handoff, 'commit'), 'utf8')).toBe('install');
  expect(await readFile(path.join(handoff, 'NakoUpdate.exe'), 'utf8')).toBe('helper fixture');
});
it('does not quit or commit if the helper cannot become ready', async () => {
  const { root, info, helper } = await fixture();
  const launch = () => Object.assign(new EventEmitter(), { unref() {} });
  const quit = vi.fn();
  await expect(launchWindowsUpdate({ info, tempDirectory: root, helper,
    executable: path.join(root, 'app.exe'), quit, launch, timeout: 1 })).rejects.toThrow('超时');
  expect(quit).not.toHaveBeenCalled();
  const handoff = (await readdir(root)).find(name => name.startsWith('nako-update-'));
  expect(await readFile(path.join(root, handoff, 'cancel'), 'utf8')).toBe('cancel');
  await expect(readFile(path.join(root, handoff, 'commit'))).rejects.toThrow();
});

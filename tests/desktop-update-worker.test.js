import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const run = promisify(execFile);
const windows = process.platform === 'win32';
let root, harness, fake;
beforeAll(async () => {
  if (!windows) return;
  root = await mkdtemp(path.join(os.tmpdir(), 'nako-worker-test-'));
  harness = path.join(root, 'harness.exe'); fake = path.join(root, 'fake.exe');
  const csc = path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  await run(csc, ['/nologo', '/target:exe', `/out:${harness}`, '/reference:System.Web.Extensions.dll',
    path.resolve('modules/desktop-shell-observability/desktop/windows/UpdateWorker.cs'), path.resolve('tests/fixtures/desktop-update/WorkerHarness.cs')]);
  await run(csc, ['/nologo', '/target:exe', `/out:${fake}`, path.resolve('tests/fixtures/desktop-update/FakeApplication.cs')]);
}, 30_000);
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });
async function job(fail = false) {
  const directory = await mkdtemp(path.join(root, 'job-'));
  const destination = path.join(directory, '中文 安装目录');
  await mkdir(destination);
  const executable = path.join(destination, 'Nako 画布.exe');
  await copyFile(fake, executable);
  const installer = path.join(directory, fail ? 'installer-fail.exe' : 'installer.exe');
  await copyFile(fake, installer);
  const sha512 = createHash('sha512').update(await readFile(installer)).digest('base64');
  const file = path.join(directory, 'job.json');
  await writeFile(file, JSON.stringify({ installer, executable, sha512, installDirectory: destination, version: '9.8.7', parentPid: 2147483647 }));
  await writeFile(path.join(directory, 'commit'), 'install');
  return { file, directory, destination, installer };
}
it.skipIf(!windows)('runs silent installation then validates version and waits for startup receipt', async () => {
  const { file, directory, destination } = await job();
  const { stdout } = await run(harness, [file], { windowsHide: true, timeout: 15000 });
  expect(stdout).toContain('stage:3');
  expect(await readFile(path.join(directory, 'started'), 'utf8')).toBe('9.8.7');
  expect(await readFile(path.join(destination, 'installer-args.txt'), 'utf8')).toContain('--updated /S');
});
it.skipIf(!windows)('does not start the app after a failing installer', async () => {
  const { file, directory } = await job(true);
  await expect(run(harness, [file], { windowsHide: true, timeout: 15000 })).rejects.toMatchObject({ code: 1 });
  await expect(readFile(path.join(directory, 'started'))).rejects.toThrow();
});
it.skipIf(!windows)('rejects tampered packages before executing them', async () => {
  const { file, installer, destination } = await job();
  await writeFile(installer, 'tampered');
  await expect(run(harness, [file], { windowsHide: true, timeout: 15000 })).rejects.toMatchObject({ code: 1 });
  await expect(readFile(path.join(destination, 'installer-args.txt'))).rejects.toThrow();
});

it.skipIf(!windows)('waits for the original application to exit before installing', async () => {
  const { file, destination } = await job();
  const parent = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { windowsHide: true, stdio: 'ignore' });
  let pending;
  try {
    const value = JSON.parse(await readFile(file, 'utf8'));
    await writeFile(file, JSON.stringify({ ...value, parentPid: parent.pid }));
    pending = run(harness, [file], { windowsHide: true, timeout: 15000 });
    await delay(400);
    await expect(readFile(path.join(destination, 'installer-args.txt'))).rejects.toThrow();
    parent.kill();
    expect((await pending).stdout).toContain('stage:3');
  } finally { parent.kill(); if (pending) await pending.catch(() => {}); }
});

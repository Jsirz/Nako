import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildUpdateHelper } from '../scripts/desktop/buildUpdateHelper.mjs';

const run = promisify(execFile);
const windows = process.platform === 'win32';
let root, helper, probe;
beforeAll(async () => {
  if (!windows) return;
  root = await mkdtemp(path.join(os.tmpdir(), 'nako-window-test-'));
  helper = path.join(root, 'NakoUpdate.exe');
  probe = path.join(root, 'probe.exe');
  await buildUpdateHelper(path.resolve('.'), helper);
  const compiler = path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  await run(compiler, ['/nologo', '/target:exe', `/out:${probe}`,
    path.resolve('tests/fixtures/desktop-update/WindowProbe.cs')], { windowsHide: true });
}, 30_000);
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

async function start(windowsHide) {
  const directory = await mkdtemp(path.join(root, 'job-'));
  const file = path.join(directory, 'job.json');
  await writeFile(file, JSON.stringify({ installer: path.join(directory, 'unused.exe'),
    executable: path.join(directory, 'app.exe'), installDirectory: directory,
    sha512: 'unused', version: '9.8.7', parentPid: process.pid }));
  // No commit is written: these GUI tests cannot execute an installation.
  const child = spawn(helper, [file], { windowsHide, stdio: 'ignore' });
  const exited = once(child, 'exit');
  return { directory, child, exited };
}
async function stop(job) {
  if (job.child.exitCode === null && job.child.signalCode === null) job.child.kill();
  await job.exited;
}
async function windowState(child, close = false) {
  return (await run(probe, [String(child.pid), ...(close ? ['close'] : [])], { windowsHide: true })).stdout;
}

it.skipIf(!windows)('announces ready only with visible progress, and closing keeps a taskbar window', async () => {
  const job = await start(false);
  try {
    await expect.poll(async () => readFile(path.join(job.directory, 'ready'), 'utf8'), { timeout: 10_000 }).toBe('ready');
    expect(await windowState(job.child)).toContain('visible=True;minimized=False');
    await windowState(job.child, true);
    await expect.poll(() => windowState(job.child), { timeout: 5_000 }).toContain('visible=True;minimized=True');
    await expect(readFile(path.join(job.directory, 'commit'))).rejects.toMatchObject({ code: 'ENOENT' });
  } finally { await stop(job); }
}, 20_000);

it.skipIf(!windows)('rejects a hidden launch without sending a ready receipt', async () => {
  const job = await start(true);
  try {
    await expect.poll(() => job.child.exitCode, { timeout: 10_000 }).toBe(0);
    await expect(readFile(path.join(job.directory, 'ready'))).rejects.toMatchObject({ code: 'ENOENT' });
  } finally { await stop(job); }
}, 20_000);

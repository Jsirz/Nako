import { expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { launchNodeSandbox } from '../modules/desktop-shell-observability/nodeSandboxProcess.js';

it.each(['x64', 'arm64'])('launches macOS Electron %s through the Node helper with a string path', arch => {
  const fork = vi.fn();
  launchNodeSandbox({ versions: { electron: '44.3.0' }, platform: 'darwin', arch,
    execPath: '/Applications/Nako.app/Contents/MacOS/Nako',
    helperExecPath: '/Applications/Nako.app/Contents/Frameworks/Nako Helper.app/Contents/MacOS/Nako Helper',
    env: { API_KEY: 'must-not-inherit' } }, fork);
  const [entry, args, options] = fork.mock.calls[0];
  expect(typeof entry).toBe('string');
  expect(path.isAbsolute(entry)).toBe(true);
  expect(entry).toMatch(/nodeSandboxChild\.mjs$/);
  expect(args).toEqual([]);
  expect(options.execPath).toContain('Nako Helper');
  expect(options.env).toEqual({ ELECTRON_RUN_AS_NODE: '1' });
  expect(options.stdio).toEqual(['ignore', 'ignore', 'pipe', 'ipc']);
});

it('uses the current executable when no helper is available, retaining Electron Node mode', () => {
  const fork = vi.fn();
  launchNodeSandbox({ versions: { electron: '44.3.0' }, platform: 'win32', execPath: 'app.exe' }, fork);
  expect(fork.mock.calls[0][2]).toMatchObject({ execPath: 'app.exe', env: { ELECTRON_RUN_AS_NODE: '1' } });
});

it('keeps the ordinary Node runtime isolated from inherited environment', () => {
  const fork = vi.fn();
  launchNodeSandbox({ versions: {}, platform: 'linux', execPath: '/usr/bin/node', env: { API_KEY: 'secret' } }, fork);
  expect(fork.mock.calls[0][2]).toMatchObject({ execPath: '/usr/bin/node', env: {} });
});

let electron;
try { electron = createRequire(path.resolve('apps/desktop/package.json'))('electron'); } catch { /* Optional desktop runtime. */ }
it.skipIf(!electron || !existsSync(electron))('executes an isolated node under the real Electron Node runtime', async () => {
  const { stdout } = await promisify(execFile)(electron,
    [path.resolve('tests/fixtures/node-sandbox/electron-smoke.mjs')],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true, timeout: 20_000 });
  expect(JSON.parse(stdout.trim())).toEqual({ text: 'sandbox ready', globals: ['undefined', 'undefined'] });
}, 25_000);

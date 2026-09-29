import { it, expect, vi } from 'vitest';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { PluginHost } from '../modules/kernel/index.js';
import { lazyPlugin } from '../modules/kernel/lazyPlugin.js';
import { RouteContributions } from '../modules/kernel/application.js';
import { createDesktopPluginHost } from '../apps/desktop/src/pluginHost.mjs';
import { resolveInstallation } from '../apps/desktop/src/installation.mjs';

it('keeps source code and configuration in the current repository even when legacy install variables exist', () => {
  const root = process.cwd();
  const installation = resolveInstallation({
    packaged: false,
    executablePath: process.execPath,
    sourceRoot: root,
    environment: {
      NAKO_DESKTOP_INSTALL_ROOT: path.join(os.tmpdir(), 'retired-install'),
      NAKO_DESKTOP_MIGRATE_TAURI: '1',
    },
  });
  expect(installation.code).toBe(root);
  expect(installation.app).toBe(root);
  expect(installation.server).toBe(path.join(root, 'apps', 'backend', 'main.mjs'));
  expect(installation.identityRuntimeConfig).toBeUndefined();
  expect(installation).not.toHaveProperty("legacyState");
});

it('loads feature code only on activation and removes its HTTP contribution on unload', async () => {
  const host = new PluginHost(),
    routes = new RouteContributions(),
    app = express();
  const manifest = { id: 'test.feature', version: '1.0.0', apiVersion: '^1.0.0', type: 'module' };
  const load = vi.fn(async () => ({
    manifest,
    activate(context) {
      const router = express.Router();
      router.get('/feature', (_request, response) => response.json({ ok: true }));
      routes.contribute(context, router);
    },
  }));
  host.register(lazyPlugin(manifest, load));
  expect(load).not.toHaveBeenCalled();
  await host.start();
  routes.mount(app, 20);
  app.use((_request, response) => response.sendStatus(404));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}/feature`;
  try {
    expect((await fetch(url)).status).toBe(200);
    await host.unload('test.feature');
    expect((await fetch(url)).status).toBe(404);
    expect(routes.list()).toEqual([]);
    expect(load).toHaveBeenCalledTimes(1);
  } finally {
    await host.stop();
    await new Promise((resolve) => server.close(resolve));
  }
});

it('rejects a plugin whose implementation expands its catalog permissions', async () => {
  const manifest = { id: 'test.changed', version: '1.0.0', apiVersion: '^1.0.0', type: 'module' };
  const activate = vi.fn(),
    host = new PluginHost();
  host.register(
    lazyPlugin(manifest, async () => ({
      manifest: { ...manifest, credentials: ['private.service'] },
      activate,
    })),
  );
  await expect(host.start()).rejects.toThrow('does not match its manifest');
  expect(activate).not.toHaveBeenCalled();
  expect(host.services.list()).toEqual([]);
});

it('rolls back HTTP contributions when feature activation fails', async () => {
  const routes = new RouteContributions(),
    host = new PluginHost();
  host.register({
    manifest: { id: 'test.broken', version: '1.0.0', apiVersion: '^1.0.0', type: 'module' },
    activate(context) {
      routes.contribute(context, () => {});
      throw new Error('fixture failure');
    },
  });
  await expect(host.start()).rejects.toThrow('fixture failure');
  expect(routes.list()).toEqual([]);
});

it('creates a local workspace with updates disabled when no feed is configured', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-desktop-plugins-'));
  const userId = '1f8726c2-a4cc-49ef-a339-e6b37b613132';
  const fetch = vi.fn(() => {
    throw new Error('No cloud call expected');
  });
  let host;
  try {
    host = await createDesktopPluginHost({
      updates: { version: '1.1.3', disabledReason: '未配置更新源', publish: vi.fn() },
      installation: {
        state: directory,
        config: directory,
        tokenFile: path.join(directory, 'session.bin'),
        legacyTokenFile: null,
        legacyLauncherPreferences: null,
        packaged: false,
        updateBridge: null,
      },
      readIssuer: async () => null,
      selectWorkspace: async () => userId,
      net: { fetch },
      safeStorage: {
        encryptString: (text) => Buffer.from(text),
        decryptString: (bytes) => bytes.toString(),
      },
      broadcast: vi.fn(),
      spawn: () => {
        throw new Error('No update executable expected');
      },
    });
    const identity = await host.services.get('desktop.identity').create();
    expect((await identity.restore()).ready).toBe(true);
    expect(identity.userId()).toBe(userId);
    expect(identity.getAccessToken).toBeUndefined();
    expect(host.services.has('desktop.updates')).toBe(false);
    expect(host.services.get('desktop.application-updates').state().phase).toBe('disabled');
    expect(fetch).not.toHaveBeenCalled();
    await host.stop();
    expect(host.services.list()).toEqual([]);
  } finally {
    await host?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

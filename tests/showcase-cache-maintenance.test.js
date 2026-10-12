import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { createProjectFileStore } from '../plugins/storage/sqlite/projectFileStore.js';
import { createShowcaseVideoCache } from '../modules/project/server/project/showcaseVideoCache.js';
import { createShowcaseCacheMaintenance } from '../modules/project/server/project/showcaseCacheMaintenance.js';
import { createShowcaseCacheRouter } from '../modules/project/server/project/showcaseCacheRouter.js';

const cleanup = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
it('clears only this user’s showcase caches and fetches changed video content from the same source', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-cache-clear-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const user = path.join(root, 'users', 'one'), videos = path.join(user, 'cache', 'showcase-videos');
  const archives = path.join(user, 'cache', 'showcase'), shareDirectory = path.join(root, 'share');
  await mkdir(shareDirectory); await mkdir(archives, { recursive: true });
  await writeFile(path.join(archives, 'old.nako'), 'archive');
  const preserved = ['users/one/library/project.json', 'users/one/private/agent-skills/skill.md',
    'users/one/cache/other/data', 'users/two/cache/showcase-videos/video.bin', 'downloads/video.mp4'];
  for (const relative of preserved) { const file = path.join(root, relative); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, 'keep'); }
  const source = '/share/sample.mp4';
  await writeFile(path.join(shareDirectory, 'index.json'), JSON.stringify([{ video: source }]));
  await writeFile(path.join(shareDirectory, 'sample.mp4'), 'old-video');
  const files = createProjectFileStore();
  const maintenance = createShowcaseCacheMaintenance({ files, directories: [archives, videos] });
  const cache = createShowcaseVideoCache({ files, shareDirectory, cacheDirectory: videos, acquire: maintenance.acquire });
  const first = await cache.get(source);
  await writeFile(path.join(shareDirectory, 'sample.mp4'), 'new-video');
  expect(await readFile((await cache.get(source)).filename, 'utf8')).toBe('old-video');
  const app = express(); app.use('/api', createShowcaseCacheRouter({ maintenance, logger: { error: vi.fn() } }));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  cleanup.push(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const release = maintenance.acquire();
  expect((await fetch(origin + '/api/showcase/cache/clear', { method: 'POST' })).status).toBe(409);
  release(); release();
  const response = await fetch(origin + '/api/showcase/cache/clear', { method: 'POST' });
  expect(await response.json()).toEqual({ success: true }); expect(response.status).toBe(200);
  expect(files.exists(archives)).toBe(false); expect(files.exists(first.filename)).toBe(false);
  for (const relative of preserved) expect(await readFile(path.join(root, relative), 'utf8')).toBe('keep');
  expect(await readFile((await cache.get(source)).filename, 'utf8')).toBe('new-video');
});
it('blocks cache operations during deletion and releases the lock after a filesystem failure', async () => {
  let reject;
  const maintenance = createShowcaseCacheMaintenance({ directories: ['cache/showcase'],
    files: { remove: () => new Promise((_resolve, fail) => { reject = fail; }) } });
  const clearing = maintenance.clear();
  expect(() => maintenance.acquire()).toThrow('作品缓存正在使用或清理中');
  await expect(maintenance.clear()).rejects.toMatchObject({ status: 409 });
  reject(new Error('busy file'));
  await expect(clearing).rejects.toMatchObject({ code: 'SHOWCASE_CACHE_CLEAR_FAILED' });
  const release = maintenance.acquire(); release();
});

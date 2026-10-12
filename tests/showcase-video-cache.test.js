import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { showcaseVideoSource } from '../modules/contracts/showcaseVideo.js';
import { createShowcaseVideoCache } from '../modules/project/server/project/showcaseVideoCache.js';
import { createShowcaseVideoRouter } from '../modules/project/server/project/showcaseVideoRouter.js';
import { createProjectFileStore } from '../plugins/storage/sqlite/projectFileStore.js';

const cleanups = [];
afterEach(async () => { vi.unstubAllGlobals(); for (const close of cleanups.splice(0).reverse()) await close(); });
async function fixture(source = 'https://example.com/video.mp4?token=demo') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-showcase-video-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const shareDirectory = path.join(root, 'share'), cacheDirectory = path.join(root, '.desktop-dev/data/users/sample/cache/showcase-videos');
  await mkdir(shareDirectory);
  await writeFile(path.join(shareDirectory, 'index.json'), JSON.stringify([{ video: source }]));
  const options = { files: createProjectFileStore(), shareDirectory, cacheDirectory, maxVideoBytes: 1024 };
  return { root, source, options, cache: createShowcaseVideoCache(options) };
}
function remote(content = 'video-content', type = 'video/mp4') {
  return new Response(new ReadableStream({ start(controller) {
    const bytes = Buffer.from(content);
    controller.enqueue(bytes.subarray(0, 4)); controller.enqueue(bytes.subarray(4)); controller.close();
  } }), { headers: { 'Content-Type': type, 'Content-Length': String(Buffer.byteLength(content)) } });
}
it('streams a single download for concurrent requests, and reuses the complete file after restart offline', async () => {
  const f = await fixture();
  const fetcher = vi.fn(async () => remote()); vi.stubGlobal('fetch', fetcher);
  const [first, second] = await Promise.all([f.cache.get(f.source), f.cache.get(f.source)]);
  expect(first).toEqual(second); expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  expect(await readFile(first.filename, 'utf8')).toBe('video-content');
  expect(await readdir(f.options.cacheDirectory)).toEqual([first.key]);
  fetcher.mockRejectedValue(new Error('offline'));
  const restarted = createShowcaseVideoCache(f.options);
  expect(await restarted.get(f.source)).toEqual(first);
  expect(await restarted.resolve(first.key)).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('copies local videos into the user cache and rejects unlisted or removed catalog sources', async () => {
  const f = await fixture('/share/demo.webm');
  await writeFile(path.join(f.options.shareDirectory, 'demo.webm'), 'local-video');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const cached = await f.cache.get(f.source);
  expect(cached.contentType).toBe('video/webm'); expect(await readFile(cached.filename, 'utf8')).toBe('local-video');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(f.cache.get('https://unlisted.example/video.mp4')).rejects.toMatchObject({ status: 404, code: 'SHOWCASE_VIDEO_NOT_LISTED' });
  await writeFile(path.join(f.options.shareDirectory, 'index.json'), '[]');
  await expect(f.cache.resolve(cached.key)).rejects.toMatchObject({ status: 404 });
});
it('isolates users and rebuilds incomplete caches without reusing partial files', async () => {
  const f = await fixture();
  const fetcher = vi.fn(async () => remote()); vi.stubGlobal('fetch', fetcher);
  const cached = await f.cache.get(f.source);
  const other = createShowcaseVideoCache({ ...f.options, cacheDirectory: path.join(f.root, 'other-user/cache') });
  expect((await other.get(f.source)).filename).not.toBe(cached.filename);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await writeFile(cached.filename, 'partial');
  expect(await readFile((await f.cache.get(f.source)).filename, 'utf8')).toBe('video-content');
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it.each([
  { response: () => remote('too-large-content'), limit: 2, code: 'SHOWCASE_VIDEO_TOO_LARGE' },
  { response: () => new Response('too-large-content', { headers: { 'Content-Type': 'video/mp4' } }), limit: 2, code: 'SHOWCASE_VIDEO_TOO_LARGE' },
  { response: () => remote('<html>failure</html>', 'text/html'), code: 'INVALID_SHOWCASE_VIDEO' },
  { response: () => new Response('error', { status: 403 }), code: 'SHOWCASE_VIDEO_DOWNLOAD_FAILED' },
  { response: () => new Response('redirect', { status: 302 }), code: 'SHOWCASE_VIDEO_DOWNLOAD_FAILED' },
  { response: () => new Response('partial', { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '99' } }), code: 'SHOWCASE_VIDEO_DOWNLOAD_FAILED' },
  { response: () => new Response('', { headers: { 'Content-Type': 'video/mp4' } }), code: 'SHOWCASE_VIDEO_DOWNLOAD_FAILED' },
  { response: () => new Response(new ReadableStream({ pull(controller) { controller.error(new Error('interrupted')); } }),
    { headers: { 'Content-Type': 'video/mp4' } }), code: 'SHOWCASE_VIDEO_DOWNLOAD_FAILED' },
])('removes failed temporary downloads and permits retry: $code', async ({ response, limit, code }) => {
  const f = await fixture();
  const fetcher = vi.fn(async () => response()); vi.stubGlobal('fetch', fetcher);
  const cache = createShowcaseVideoCache({ ...f.options, ...(limit ? { maxVideoBytes: limit } : {}) });
  await expect(cache.get(f.source)).rejects.toMatchObject({ code });
  expect(await readdir(f.options.cacheDirectory)).toEqual([]);
  fetcher.mockImplementation(async () => remote('ok'));
  expect(await readFile((await cache.get(f.source)).filename, 'utf8')).toBe('ok');
});
it('recognizes binary MP4 objects with signed URLs while retaining the exact source identity', async () => {
  const f = await fixture();
  const fetcher = vi.fn(async () => remote('binary-video', 'application/octet-stream')); vi.stubGlobal('fetch', fetcher);
  expect((await f.cache.get(f.source)).contentType).toBe('video/mp4');
  expect(fetcher.mock.calls[0][0]).toBe(f.source);
  await expect(f.cache.get(f.source.replace('demo', 'changed'))).rejects.toMatchObject({ status: 404 });
});
it('serves cached video ranges and HEAD requests from hidden user directories after the server restarts', async () => {
  const f = await fixture('/share/demo.mp4');
  await writeFile(path.join(f.options.shareDirectory, 'demo.mp4'), 'video-content');
  const app = express(); app.use('/api', createShowcaseVideoRouter({ cache: f.cache }));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  cleanups.push(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(origin + '/api/showcase/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video: f.source }) });
  expect(response.status).toBe(200);
  const { url } = await response.json(); expect(url).toMatch(/^\/api\/showcase\/videos\/[a-f0-9]{64}$/);
  const range = await fetch(origin + url, { headers: { Range: 'bytes=0-4' } });
  expect(range.status).toBe(206); expect(range.headers.get('content-type')).toBe('video/mp4');
  expect(range.headers.get('content-range')).toBe('bytes 0-4/13'); expect(await range.text()).toBe('video');
  const head = await fetch(origin + url, { method: 'HEAD' }); expect(head.status).toBe(200);
  expect(head.headers.get('content-length')).toBe('13'); expect(await head.text()).toBe('');
  expect((await fetch(origin + '/api/showcase/videos/not-a-cache-key')).status).toBe(404);
  expect((await fetch(origin + '/api/showcase/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video: 'https://unlisted.example/video.mp4' }) })).status).toBe(404);
});
it.each(['/share/../demo.mp4', '/share/%2e%2e/demo.mp4', '/share/%2fdemo.mp4', '/share/%5cdemo.webm', 'http://example.com/video.mp4', 'javascript:alert(1)', 'https://user:password@example.com/video.mp4'])(
  'rejects unsupported video source %s', value => expect(showcaseVideoSource(value)).toBe(''),
);

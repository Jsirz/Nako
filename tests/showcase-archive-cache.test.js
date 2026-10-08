import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as tar from 'tar';
import express from 'express';
import { showcaseArchiveSource } from '../modules/contracts/showcaseArchive.js';
import { createShowcaseArchiveCache } from '../modules/project/server/project/showcaseArchiveCache.js';
import { createProjectFileStore } from '../plugins/storage/sqlite/projectFileStore.js';
import { createProjectTransferRouter } from '../modules/project/server/project/projectTransferRouter.js';

const cleanup = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const directory of cleanup.splice(0)) await rm(directory, { recursive: true, force: true });
});
async function fixture(source = 'https://example.oss-cn-hangzhou.aliyuncs.com/case.nako?token=demo') {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-showcase-'));
  cleanup.push(directory);
  const shareDirectory = path.join(directory, 'share');
  const staging = path.join(directory, 'source');
  const cacheDirectory = path.join(directory, '.desktop-dev/data/users/sample/cache/showcase');
  await mkdir(shareDirectory);
  await mkdir(path.join(staging, 'media/images'), { recursive: true });
  await writeFile(path.join(shareDirectory, 'index.json'), JSON.stringify([{ archive: source }]));
  await writeFile(path.join(staging, 'manifest.json'), JSON.stringify({ format: 'nako-project', version: 1, project: { id: 'sample' } }));
  await writeFile(path.join(staging, 'workflow.json'), JSON.stringify({ id: 'sample', title: 'example', nodes: [
    { id: 'image', type: 'Upload Image', x: 0, y: 0, resultUrl: '/library/media/sample/images/image.png' },
    { id: 'video', type: 'Upload Video', x: 300, y: 0, resultUrl: '/library/media/sample/videos/video.mp4' },
  ], groups: [] }));
  await writeFile(path.join(staging, 'media/images/image.png'), 'media');
  await mkdir(path.join(staging, 'media/videos'));
  await writeFile(path.join(staging, 'media/videos/video.mp4'), 'video-content');
  const archivePath = path.join(shareDirectory, 'case.nako');
  await tar.create({ cwd: staging, file: archivePath, gzip: true }, ['manifest.json', 'workflow.json', 'media']);
  const files = createProjectFileStore();
  const options = { files, shareDirectory, cacheDirectory, maxArchiveBytes: 1024 * 1024, maxArchiveEntries: 20 };
  return { source, archivePath, cacheDirectory, options, cache: createShowcaseArchiveCache(options) };
}

it('streams one remote download for concurrent previews and reuses it after restart while offline', async () => {
  const f = await fixture();
  const bytes = await readFile(f.archivePath);
  const fetcher = vi.fn(async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 30));
      controller.enqueue(bytes.subarray(30));
      controller.close();
    },
  })));
  vi.stubGlobal('fetch', fetcher);
  const [first, second] = await Promise.all([f.cache.get(f.source), f.cache.get(f.source)]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(second.archivePath).toBe(first.archivePath);
  expect(await readFile(path.join(first.extractionDirectory, 'media/images/image.png'), 'utf8')).toBe('media');
  fetcher.mockRejectedValue(new Error('offline'));
  expect((await createShowcaseArchiveCache(f.options).get(f.source)).workflow.id).toBe('sample');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('accepts local showcase archives and rejects sources absent from the catalog', async () => {
  const f = await fixture('/share/case.nako');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect((await f.cache.get(f.source)).workflow.id).toBe('sample');
  await expect(f.cache.get('https://other.example/case.nako')).rejects.toMatchObject({ code: 'SHOWCASE_ARCHIVE_NOT_LISTED' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('serves cached preview images and video ranges beneath a hidden application directory', async () => {
  const f = await fixture('/share/case.nako');
  const app = express();
  app.use('/api', createProjectTransferRouter({ files: f.options.files,
    showcaseArchives: f.cache, mediaDirectory: path.join(f.cacheDirectory, 'media') }));
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(origin + '/api/workflows/preview', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archive: f.source }) });
    expect(response.status).toBe(200);
    const { workflow } = await response.json();
    const image = await fetch(origin + workflow.nodes[0].resultUrl);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toContain('image/png');
    expect(await image.text()).toBe('media');
    const video = await fetch(origin + workflow.nodes[1].resultUrl, { headers: { Range: 'bytes=0-4' } });
    expect(video.status).toBe(206);
    expect(video.headers.get('content-range')).toBe('bytes 0-4/13');
    expect(await video.text()).toBe('video');
    const hiddenFile = workflow.nodes[0].resultUrl.replace('images/image.png', '.hidden');
    await writeFile(path.join((await f.cache.get(f.source)).extractionDirectory, 'media/.hidden'), 'private');
    expect((await fetch(origin + hiddenFile)).status).toBe(404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

it('removes partial downloads when streamed data exceeds the limit and allows retry', async () => {
  const f = await fixture();
  const bytes = await readFile(f.archivePath);
  const fetcher = vi.fn(async () => new Response(bytes));
  vi.stubGlobal('fetch', fetcher);
  const cache = createShowcaseArchiveCache({ ...f.options, maxArchiveBytes: 10 });
  await expect(cache.get(f.source)).rejects.toMatchObject({ code: 'ARCHIVE_TOO_LARGE' });
  expect(await readdir(f.cacheDirectory)).toEqual([]);
  await expect(cache.get(f.source)).rejects.toMatchObject({ code: 'ARCHIVE_TOO_LARGE' });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each(['/share/../case.nako', '/share/%2e%2e/case.nako', '/share/%2fcase.nako', 'http://example.com/case.nako', 'https://user:password@example.com/case.nako'])(
  'rejects unsupported archive source %s', source => expect(showcaseArchiveSource(source)).toBe(''),
);

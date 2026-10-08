import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createProjectMediaStore } from '../plugins/media/filesystem/projectMediaStore.js';
import { createThumbnailCache } from '../plugins/media/ffmpeg-sharp/thumbnailCache.js';
import { ERRORS, PluginError } from '../modules/contracts/index.js';

const directories = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});
async function fixture() {
  const libraryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nako-project-media-'));
  directories.push(libraryDirectory);
  const buffer = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#fff' } }).png().toBuffer();
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  const store = createProjectMediaStore({ libraryDirectory, logger: { info: vi.fn() } });
  return { libraryDirectory, store, buffer, dataUrl };
}
describe('project media adapter boundary', () => {
  it('saves project media with metadata and reuses a persisted video last frame', async () => {
    const f = await fixture();
    const node = { id: 'node', type: 'Video', lastFrame: f.dataUrl, editorCanvasData: f.dataUrl };
    const first = f.store.sanitizeWorkflowNodes([node], 'project')[0];
    const second = f.store.sanitizeWorkflowNodes([node], 'project')[0];
    expect(first.lastFrame).toBe(second.lastFrame);
    expect(first.lastFrame).toMatch(/^\/library\/media\/project\/images\/.+\.png$/);
    const file = path.join(f.libraryDirectory, first.lastFrame.slice('/library/'.length));
    expect(fs.readFileSync(file)).toEqual(f.buffer);
    const metadata = JSON.parse(fs.readFileSync(file.replace(/\.png$/, '.json'), 'utf8'));
    expect(metadata).toMatchObject({ nodeId: 'node', prompt: 'Video Last Frame', type: 'images' });
    expect(node.lastFrame).toBe(f.dataUrl);
  });
  it('rejects unsafe project paths and unsupported or corrupt inline content', async () => {
    const f = await fixture();
    expect(() => f.store.saveMediaToFile(f.dataUrl, '../escape')).toThrow(PluginError);
    expect(() => f.store.saveMediaToFile('data:image/png;base64,YmFk', 'project')).toThrow();
    expect(() => f.store.saveMediaToFile('data:text/plain;base64,YmFk', 'project')).toThrow();
  });
  it('does not return a successful URL when project metadata cannot be written', async () => {
    const f = await fixture();
    const write = fs.writeFileSync.bind(fs);
    vi.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
      if (String(file).endsWith('.json')) throw new Error('disk full');
      return write(file, ...args);
    });
    expect(() => f.store.saveMediaToFile(f.dataUrl, 'project')).toThrow(PluginError);
    expect(fs.readdirSync(path.join(f.libraryDirectory, 'media/project/images'))).toEqual([]);
  });
  it('deduplicates thumbnails and rejects paths outside the local library', async () => {
    const f = await fixture();
    const saved = f.store.saveMediaToFile(f.dataUrl, 'project');
    const cache = createThumbnailCache({ libraryDir: f.libraryDirectory });
    const [first, second] = await Promise.all([cache.get(saved.url, 128), cache.get(saved.url, 128)]);
    expect(first).toEqual(second);
    expect(first.kind).toBe('thumbnail');
    expect((await sharp(path.join(f.libraryDirectory, '.cache', 'thumbnails', `${first.id}.webp`)).metadata()).width).toBe(128);
    await expect(cache.get('/library/../escape.png')).rejects.toMatchObject({ code: ERRORS.invalidMedia, status: 403 });
    await expect(cache.get('https://example.test/image.png')).rejects.toMatchObject({ code: ERRORS.invalidMedia });
    await expect(cache.get('/library/media/project/images/missing.png')).rejects.toMatchObject({ code: ERRORS.mediaNotFound, status: 404 });
  });
});

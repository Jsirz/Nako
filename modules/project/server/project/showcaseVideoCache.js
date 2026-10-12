import crypto from 'node:crypto';
import path from 'node:path';
import { showcaseVideoSource } from '../../../contracts/showcaseVideo.js';
import { PROJECT_ERRORS, ProjectError } from '../../../contracts/projectErrors.js';

const keyFor = source => crypto.createHash('sha256').update(source).digest('hex');
const failure = (code, message, status) => new ProjectError(code, message, { status,
  context: { operation: 'cacheShowcaseVideo' } });

/** The injected ProjectFileStore owns all downloads and filesystem operations. */
export function createShowcaseVideoCache({ files, shareDirectory, cacheDirectory, maxVideoBytes = 2 * 1024 ** 3,
  acquire = () => () => {} }) {
  const pending = new Map();
  async function catalogSources() {
    let catalog;
    try { catalog = JSON.parse(await files.readText(path.join(shareDirectory, 'index.json'))); }
    catch { throw failure(PROJECT_ERRORS.videoMissing, '案例列表读取失败。', 500); }
    if (!Array.isArray(catalog)) throw failure(PROJECT_ERRORS.videoMissing, '案例列表无效。', 500);
    return catalog.map(item => showcaseVideoSource(item?.video)).filter(Boolean);
  }
  async function prepare(source, key) {
    const directory = path.join(cacheDirectory, key), filename = path.join(directory, 'video.bin');
    if (files.exists(directory)) {
      try {
        const metadata = JSON.parse(await files.readText(path.join(directory, 'video.json')));
        const size = await files.size(filename);
        if (metadata.source === source && ['video/mp4', 'video/webm'].includes(metadata.contentType)
          && size > 0 && size <= maxVideoBytes && size === metadata.size) {
          return { key, directory, filename, contentType: metadata.contentType };
        }
      } catch { /* Incomplete caches are replaced; they are never served. */ }
      await files.remove(directory, { recursive: true, force: true });
    }
    await files.mkdir(cacheDirectory, { recursive: true });
    const staging = await files.createTemporaryDirectory('.download-', cacheDirectory);
    const downloaded = path.join(staging, 'video.bin');
    try {
      let contentType;
      if (source.startsWith('/share/')) {
        const original = path.join(shareDirectory, ...source.slice('/share/'.length).split('/').map(decodeURIComponent));
        const size = await files.size(original);
        if (!size || size > maxVideoBytes) throw failure(PROJECT_ERRORS.videoTooLarge, '视频文件为空或超过缓存大小限制。', 413);
        await files.copy(original, downloaded, { force: false, errorOnExist: true });
        contentType = source.endsWith('.webm') ? 'video/webm' : 'video/mp4';
      } else contentType = await files.downloadVideo(source, downloaded, maxVideoBytes);
      const size = await files.size(downloaded);
      if (!size || size > maxVideoBytes) throw failure(PROJECT_ERRORS.videoTooLarge, '视频文件为空或超过缓存大小限制。', 413);
      await files.writeText(path.join(staging, 'video.json'), JSON.stringify({ source, contentType, size }));
      await files.move(staging, directory);
      return { key, directory, filename, contentType };
    } catch (error) {
      if (error instanceof ProjectError) throw error;
      throw failure(PROJECT_ERRORS.videoDownload, '视频缓存失败，请重试。', 500);
    } finally { await files.remove(staging, { recursive: true, force: true }); }
  }
  function cached(source) {
    const key = keyFor(source);
    if (!pending.has(key)) {
      const download = prepare(source, key);
      pending.set(key, download);
      void download.finally(() => pending.delete(key)).catch(() => {});
    }
    return pending.get(key);
  }
  return {
    acquire,
    async get(value) {
      const release = acquire();
      try {
        const source = showcaseVideoSource(value);
        if (!source) throw failure(PROJECT_ERRORS.videoInvalid, '视频地址无效。', 400);
        if (!(await catalogSources()).includes(source)) throw failure(PROJECT_ERRORS.videoMissing, '视频不在作品展示列表中。', 404);
        return await cached(source);
      } finally { release(); }
    },
    async resolve(key) {
      const release = acquire();
      try {
        if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw failure(PROJECT_ERRORS.videoMissing, '视频缓存不存在。', 404);
        const source = (await catalogSources()).find(value => keyFor(value) === key);
        if (!source) throw failure(PROJECT_ERRORS.videoMissing, '视频不在作品展示列表中。', 404);
        return await cached(source);
      } finally { release(); }
    },
  };
}

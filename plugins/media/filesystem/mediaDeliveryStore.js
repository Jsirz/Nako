import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { ERRORS, PluginError } from '../../../modules/contracts/index.js';

const MIME_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.bmp': 'image/bmp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.heic': 'image/heic', '.heif': 'image/heif', '.tif': 'image/tiff', '.tiff': 'image/tiff',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg', '.aac': 'audio/aac', '.flac': 'audio/flac', '.json': 'application/json',
};
const PUBLIC_PREFIXES = ['assets/', 'media/', 'prompts/previews/', 'workflows/covers/'];
const missing = () => new PluginError(ERRORS.mediaNotFound, '媒体文件不存在', {
  status: 404, context: { moduleId: 'media.filesystem', operation: 'open' },
});

function assertPublic(relative) {
  const normalized = relative.split(path.sep).join('/');
  if (normalized.split('/').some(segment => !segment || segment.startsWith('.') || /[\\:\0]/.test(segment))
    || !(normalized === 'prompts/prompt.json' || PUBLIC_PREFIXES.some(prefix => normalized.startsWith(prefix)))) {
    throw missing();
  }
}

function relativeReference(reference) {
  if (reference?.kind === 'thumbnail' && /^[a-f0-9]{64}$/.test(reference.id)) {
    return `.cache/thumbnails/${reference.id}.webp`;
  }
  if (reference?.kind !== 'library' || typeof reference.url !== 'string' || !reference.url.startsWith('/library/')) throw missing();
  const raw = reference.url.slice('/library/'.length).split(/[?#]/, 1)[0];
  if (/%(?:2f|5c)/i.test(raw)) throw missing();
  let relative;
  try { relative = decodeURIComponent(raw); } catch { throw missing(); }
  assertPublic(relative);
  return relative;
}

function assertInside(root, filename) {
  const relative = path.relative(root, filename);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw missing();
  return relative;
}

/** @returns {import('../../../modules/contracts/mediaDelivery.js').MediaDeliveryStore} */
export function createMediaDeliveryStore({ libraryDirectory }) {
  return {
    async open(reference) {
      let handle;
      try {
        const relative = relativeReference(reference);
        const root = await realpath(libraryDirectory);
        const filename = await realpath(path.resolve(root, relative));
        const actual = assertInside(root, filename);
        // Also enforce visibility on symlink targets, not just the requested URL.
        if (reference.kind === 'library') assertPublic(actual);
        else if (actual.split(path.sep).join('/') !== relative) throw missing();
        handle = await open(filename, 'r');
        const stats = await handle.stat();
        if (!stats.isFile()) throw missing();
        return {
          contentType: MIME_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream',
          byteLength: stats.size,
          etag: `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`,
          lastModified: stats.mtime.toUTCString(),
          read: range => handle.createReadStream({ autoClose: false, ...(range || {}) }),
          close: () => handle.close(),
        };
      } catch (cause) {
        await handle?.close();
        if (cause instanceof PluginError) throw cause;
        if (['ENOENT', 'ENOTDIR', 'EACCES', 'ELOOP'].includes(cause.code)) throw missing();
        throw new PluginError(ERRORS.mediaStorage, '媒体文件读取失败', {
          status: 500, cause, context: { moduleId: 'media.filesystem', operation: 'open' },
        });
      }
    },
  };
}

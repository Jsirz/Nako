import fs from 'node:fs';
import path from 'node:path';
import { ERRORS, PluginError } from '../../../modules/contracts/errors.js';

export function assertInside(root, target, operation) {
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new PluginError(ERRORS.invalidMedia, '媒体位置超出存储目录', {
      status: 400, context: { moduleId: 'media.filesystem', operation },
    });
  }
  return target;
}

export function resolveLocalPath(input, libraryDirectory) {
  if (typeof input !== 'string' || !input) return null;
  try {
    const pathname = new URL(input, 'http://localhost').pathname;
    if (!pathname.startsWith('/library/')) return null;
    const root = path.resolve(libraryDirectory);
    const target = assertInside(root, path.resolve(root, decodeURIComponent(pathname.slice(9))), 'resolveLocalPath');
    if (fs.existsSync(target)) assertInside(fs.realpathSync(root), fs.realpathSync(target), 'resolveLocalPath');
    return target;
  } catch {
    return null;
  }
}

export function resolveImageToBase64(input, libraryDirectory, logger) {
  if (typeof input !== 'string' || !input) return null;
  if (input.startsWith('data:')) return input;
  const target = resolveLocalPath(input, libraryDirectory);
  if (target && fs.existsSync(target)) {
    try {
      const mimeType = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
        '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
      }[path.extname(target).toLowerCase()] || 'image/png';
      return `data:${mimeType};base64,${fs.readFileSync(target).toString('base64')}`;
    } catch (error) {
      logger.error('Media conversion failed', { operation: 'imageBase64', error });
      return null;
    }
  }
  // A missing or rejected local reference must not become an external request.
  try {
    const url = new URL(input);
    if (['http:', 'https:'].includes(url.protocol) && !url.pathname.startsWith('/library/')) return input;
  } catch { /* Not a remote URL. */ }
  logger.warn('Media source could not be resolved', { operation: 'imageBase64' });
  return null;
}

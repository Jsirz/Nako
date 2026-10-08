import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { providerError, PROVIDER_ERRORS } from '../../../modules/contracts/providerErrors.js';
export function ecloudInputError(message) {
  return providerError(message, {
    providerId: 'ecloud', operation: 'validate-input', code: PROVIDER_ERRORS.ecloudInput,
    status: 400, retryable: false, expose: true,
  });
}
export function publicMediaUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw ecloudInputError('移动云需要有效的公网素材 URL。');
  }
  const host = url.hostname.toLowerCase();
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.startsWith('[') ||
    /^(?:127|10|0)\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    throw ecloudInputError('移动云无法读取本机或内网素材地址，请使用公网 URL 或支持的图片输入。');
  }
  return url.href;
}
const array = (value) =>
  value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
export function inputAssets(params) {
  return {
    images: array(params.images ?? params.imageBase64),
    videos: array(params.videos ?? params.videoUrl),
    audios: array(params.audios ?? params.audioBase64),
  };
}
const mimeByExtension = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
};

// Only the current project's media directory can become an inline upload.
export async function inlineMedia(value, kind, params, config, maxMb) {
  if (typeof value !== 'string' || !value.trim()) throw ecloudInputError('参考素材为空。');
  value = value.trim();
  if (/^https?:\/\//i.test(value)) return publicMediaUrl(value);
  let data = value;
  if (!data.startsWith('data:')) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(params.projectId || '') || !config.LIBRARY_DIR)
      throw ecloudInputError('请使用当前项目中已保存的参考素材。');
    let decoded;
    try {
      decoded = decodeURIComponent(value.split('?')[0]);
    } catch {
      throw ecloudInputError('素材路径无效。');
    }
    const directory = kind === 'image' ? 'images' : kind === 'audio' ? 'audios' : 'videos';
    const prefix = `/library/media/${params.projectId}/${directory}/`;
    const filename = decoded.slice(prefix.length);
    if (
      !decoded.startsWith(prefix) ||
      !filename ||
      filename.startsWith('.') ||
      /[\\/:%?#\x00-\x1f]/.test(filename)
    )
      throw ecloudInputError('只能使用当前项目的参考素材。');
    const root = await realpath(config.LIBRARY_DIR);
    const expected = path.join(root, 'media', params.projectId, directory, filename);
    const resolved = await realpath(expected);
    if (
      process.platform === 'win32'
        ? resolved.toLowerCase() !== expected.toLowerCase()
        : resolved !== expected
    )
      throw ecloudInputError('素材路径不能指向其他目录。');
    const meta = await stat(resolved);
    if (!meta.isFile() || meta.size > maxMb * 1024 * 1024)
      throw ecloudInputError(`素材大小不能超过 ${maxMb} MB。`);
    const mime = mimeByExtension[path.extname(filename).toLowerCase()];
    if (!mime?.startsWith(`${kind}/`)) throw ecloudInputError('参考素材格式不支持。');
    data = `data:${mime};base64,${(await readFile(resolved)).toString('base64')}`;
  }
  const match = data.match(/^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (
    !match ||
    !match[1].startsWith(`${kind}/`) ||
    !Object.values(mimeByExtension).includes(match[1])
  )
    throw ecloudInputError('参考素材的 Base64 格式无效。');
  if (Buffer.byteLength(match[2], 'base64') > maxMb * 1024 * 1024)
    throw ecloudInputError(`素材大小不能超过 ${maxMb} MB。`);
  return data;
}

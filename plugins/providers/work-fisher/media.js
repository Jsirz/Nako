import { realpath, stat } from 'node:fs/promises';
import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { boundedBytes, boundedSignal, failure } from './client.js';
import { ROOT } from './protocol.js';
import { mediaRuntime } from '../../../modules/kernel/server.js';
const createMediaMetadataProbe = (...args) => mediaRuntime().createMetadataProbe(...args);
const probeMedia = (...args) => createMediaMetadataProbe()(...args);
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
};
export function publicUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw failure('Work-Fisher 素材地址无效。', { status: 400 });
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
  )
    throw failure('Work-Fisher 无法读取本机或内网素材地址。', { status: 400 });
  return url.href;
}
const array = (value) =>
  value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
export function inputs(params) {
  return {
    images: array(params.images ?? params.imageBase64),
    videos: array(params.videos ?? params.videoUrl),
    audios: array(params.audios ?? params.audioBase64),
  };
}
export async function uploadInput(value, kind, params, config, client, durationRange) {
  if (typeof value !== 'string' || !value.trim()) throw failure('参考素材为空。', { status: 400 });
  if (/^https?:\/\//i.test(value)) return publicUrl(value);
  if (value.startsWith('data:')) {
    const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);
    if (
      !match ||
      !match[1].startsWith(kind + '/') ||
      !Object.values(MIME).includes(match[1]) ||
      Buffer.byteLength(match[2], 'base64') > 50 * 1024 * 1024
    )
      throw failure('参考素材 Base64 格式或大小无效。', { status: 400 });
    const form = new FormData();
    const extension = Object.entries(MIME).find(([, mime]) => mime === match[1])[0];
    form.append(
      'file',
      new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }),
      'reference' + extension,
    );
    return publicUrl(
      (
        await client(ROOT + '/v1/files/upload', {
          apiKey: config.WORK_FISHER_API_KEY,
          signal: params.signal,
          form,
        })
      ).url,
    );
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(params.projectId || '') || !config.LIBRARY_DIR)
    throw failure('请使用当前项目中已保存的参考素材。', { status: 400 });
  let decoded;
  try {
    decoded = decodeURIComponent(value.split('?')[0]);
  } catch {
    throw failure('素材路径无效。', { status: 400 });
  }
  const directory = kind + 's',
    prefix = '/library/media/' + params.projectId + '/' + directory + '/';
  const filename = decoded.slice(prefix.length);
  if (
    !decoded.startsWith(prefix) ||
    !filename ||
    filename.startsWith('.') ||
    /[\\\/:%?#\x00-\x1f]/.test(filename)
  )
    throw failure('只能使用当前项目的参考素材。', { status: 400 });
  const root = await realpath(config.LIBRARY_DIR),
    expected = path.join(root, 'media', params.projectId, directory, filename);
  const resolved = await realpath(expected);
  if (
    process.platform === 'win32'
      ? resolved.toLowerCase() !== expected.toLowerCase()
      : resolved !== expected
  )
    throw failure('素材路径不能指向其他目录。', { status: 400 });
  const meta = await stat(resolved);
  if (!meta.isFile() || meta.size > 50 * 1024 * 1024)
    throw failure('上传素材不能超过 50 MB。', { status: 400 });
  const mime = MIME[path.extname(filename).toLowerCase()];
  if (!mime?.startsWith(kind + '/')) throw failure('参考素材格式不支持。', { status: 400 });
  if (kind === 'video' && durationRange) {
    const metadata = await probeMedia(resolved, 'videos');
    if (
      !Number.isFinite(metadata.duration) ||
      metadata.duration < durationRange.min ||
      metadata.duration > durationRange.max
    )
      throw failure(
        `视频编辑的参考视频须为 ${durationRange.min}～${durationRange.max} 秒，请先裁剪或更换素材。`,
        { status: 400 },
      );
  }
  const form = new FormData();
  form.append('file', await openAsBlob(resolved, { type: mime }), filename);
  const payload = await client(ROOT + '/v1/files/upload', {
    apiKey: config.WORK_FISHER_API_KEY,
    signal: params.signal,
    form,
  });
  return publicUrl(payload.url);
}
export async function download(fetcher, value, kind, signal, params = {}) {
  const response = await fetcher(publicUrl(value), {
    redirect: 'error',
    signal: boundedSignal(signal, 120000),
  });
  if (!response.ok) throw failure('Work-Fisher 结果下载失败（HTTP ' + response.status + '）。');
  const buffer = await boundedBytes(
    response,
    kind === 'video' ? 512 * 1024 * 1024 : 100 * 1024 * 1024,
  );
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const webp =
    buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  const mp4 = buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
  const wav =
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE';
  const ogg = buffer.toString('ascii', 0, 4) === 'OggS',
    flac = buffer.toString('ascii', 0, 4) === 'fLaC';
  const mp3 =
    buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  const requested = String(params.format || 'mp3')
    .toLowerCase()
    .replace('ogg_opus', 'ogg');
  const audio = { wav, ogg, flac, mp3, pcm: requested === 'pcm' && buffer.length > 0 };
  if (
    !(kind === 'video'
      ? mp4
      : kind === 'audio'
        ? Object.values(audio).some(Boolean)
        : png || jpeg || webp)
  )
    throw failure('Work-Fisher 返回的媒体文件格式无效。');
  const audioFormat = Object.keys(audio).find((key) => audio[key]);
  return {
    buffer,
    format:
      kind === 'video'
        ? 'mp4'
        : kind === 'audio'
          ? audioFormat
          : png
            ? 'png'
            : jpeg
              ? 'jpg'
              : 'webp',
  };
}

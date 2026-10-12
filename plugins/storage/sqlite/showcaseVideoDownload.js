import fs from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PROJECT_ERRORS, ProjectError } from '../../../modules/contracts/projectErrors.js';

/** Stream directly to the caller's temporary file, never buffer the whole video. */
export async function downloadShowcaseVideo(url, filename, limit) {
  const signal = AbortSignal.timeout(10 * 60 * 1000);
  let response;
  const failure = (code, message, status = 502) => new ProjectError(code, message, {
    status, context: { operation: 'downloadShowcaseVideo' },
  });
  try {
    response = await fetch(url, { signal, redirect: 'error' });
    if (response.status !== 200 || !response.body)
      throw failure(PROJECT_ERRORS.videoDownload, '视频下载失败，请检查视频地址或访问权限。');
    const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    const extension = new URL(url).pathname.match(/\.(mp4|webm)$/i)?.[1]?.toLowerCase();
    const contentType = ['video/mp4', 'video/webm'].includes(mime) ? mime
      : (!mime || mime === 'application/octet-stream') && extension ? `video/${extension}` : '';
    if (!contentType) throw failure(PROJECT_ERRORS.videoInvalid, '视频地址未返回 MP4 或 WebM 文件。');
    const expected = Number(response.headers.get('content-length') || 0);
    if (expected > limit) throw failure(PROJECT_ERRORS.videoTooLarge, '视频超过本地缓存大小限制。', 413);
    let received = 0;
    const guard = new Transform({ transform(chunk, _encoding, callback) {
      received += chunk.length;
      callback(received > limit ? failure(PROJECT_ERRORS.videoTooLarge, '视频超过本地缓存大小限制。', 413) : null, chunk);
    } });
    await pipeline(Readable.fromWeb(response.body), guard, fs.createWriteStream(filename, { flags: 'wx' }), { signal });
    if (!received || (expected && !response.headers.get('content-encoding') && received !== expected))
      throw failure(PROJECT_ERRORS.videoDownload, '视频下载不完整，请重试。');
    return contentType;
  } catch (error) {
    await response?.body?.cancel().catch(() => {});
    if (error instanceof ProjectError) throw error;
    throw failure(PROJECT_ERRORS.videoDownload, '视频下载中断或超时，请重试。');
  }
}

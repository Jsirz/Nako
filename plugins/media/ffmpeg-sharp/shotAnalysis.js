import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, realpath, stat, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { platformPaths } from '../../../modules/kernel/server.js';
import { ERRORS } from '../../../modules/contracts/errors.js';
import { NODE_ERROR } from '../../../modules/contracts/nodeExecution.js';
import { SHOT_ANALYSIS_LIMITS, analysisChoices, parseShotAnalysis, shotAnalysisError, shotAnalysisPrompt } from '../../../modules/contracts/shotAnalysis.js';

const execute = promisify(execFile);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
const fileUrl = (projectId, type, name) => `/library/media/${projectId}/${type}s/${encodeURIComponent(name)}`;

/** Local processing adapter. Model text can select validated times, never commands or paths. */
export function createShotAnalysisProcessor({ libraryDirectory, logger, run = execute, binDirectory } = {}) {
  const bin = () => binDirectory || platformPaths().runtime.BIN_DIR;
  const fail = (message, projectId, options = {}) => shotAnalysisError(message, { projectId, operation: 'processShotAnalysis', ...options });
  async function command(name, args, projectId, signal) {
    signal?.throwIfAborted();
    try {
      return await run(path.join(bin(), name + (process.platform === 'win32' ? '.exe' : '')), args,
        { windowsHide: true, signal, timeout: 300000, maxBuffer: 1024 * 1024 });
    } catch (cause) {
      if (signal?.aborted) throw fail('拉片已停止。', projectId, { code: NODE_ERROR.CANCELLED, status: 499 });
      throw fail('视频处理失败，请确认本地 FFmpeg 可用、视频可播放且磁盘空间充足。', projectId,
        { code: ERRORS.mediaStorage, status: 500, cause });
    }
  }
  async function sourceFor(projectId, url, signal) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId || '')) throw fail('项目无效。', projectId);
    let decoded;
    try { decoded = decodeURIComponent(String(url || '').split(/[?#]/)[0]); } catch { throw fail('视频地址无效。', projectId); }
    const prefix = `/library/media/${projectId}/videos/`, name = decoded.slice(prefix.length);
    if (!decoded.startsWith(prefix) || !name || name.startsWith('.') || /[\\/:%?#\x00-\x1f]/.test(name))
      throw fail('只能使用当前项目中已保存的视频。', projectId, { code: ERRORS.permission, status: 403 });
    try {
      const root = await realpath(libraryDirectory), expected = path.join(root, 'media', projectId, 'videos', name);
      const file = await realpath(expected);
      if (!samePath(file, expected)) throw fail('视频路径超出项目范围。', projectId, { code: ERRORS.permission, status: 403 });
      const details = await stat(file);
      if (!details.isFile()) throw fail('视频不存在。', projectId, { code: ERRORS.mediaNotFound, status: 404 });
      const output = await command('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', file], projectId, signal);
      const probe = JSON.parse(output.stdout), video = probe.streams?.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
      const duration = Number(probe.format?.duration), width = Number(video?.width), height = Number(video?.height);
      const [a, b] = String(video?.avg_frame_rate || '0/1').split('/').map(Number), fps = b ? a / b : 0;
      if (!video || !Number.isFinite(duration) || duration <= 0 || duration > SHOT_ANALYSIS_LIMITS.duration ||
        !width || !height || width > 8192 || height > 8192) throw fail('视频无效、分辨率过大或时长超过 20 分钟，请先裁剪。', projectId);
      return { file, source: { url, type: 'video', duration, width, height, fps: Number.isFinite(fps) ? fps : 0,
        hasAudio: probe.streams.some(s => s.codec_type === 'audio'), fingerprint: digest([name, details.size, details.mtimeMs]) } };
    } catch (cause) {
      if (cause?.code && cause?.context) throw cause;
      throw fail('视频不存在或无法读取，请重新选择。', projectId, { code: ERRORS.mediaNotFound, status: 404, cause });
    }
  }
  async function outputAsset(projectId, source, type, extension, key, args, signal, extra = {}) {
    const id = 'shot-' + digest([source.fingerprint, key]).slice(0, 48), filename = id + extension;
    const expected = path.resolve(libraryDirectory, 'media', projectId, type + 's');
    await mkdir(expected, { recursive: true });
    const root = await realpath(libraryDirectory), directory = await realpath(expected);
    if (!samePath(directory, path.join(root, 'media', projectId, type + 's')))
      throw fail('输出目录超出项目范围。', projectId, { code: ERRORS.permission, status: 403 });
    const target = path.join(directory, filename), metadataFile = path.join(directory, id + '.json');
    const asset = { assetId: id, type, url: fileUrl(projectId, type, filename), projectId, ...extra };
    try {
      const cached = JSON.parse(await readFile(metadataFile, 'utf8'));
      if (cached.sourceFingerprint === source.fingerprint && (await stat(target)).size > 0) return asset;
    } catch { /* Missing or incomplete cache is regenerated from the original. */ }
    const temporary = path.join(directory, id + '-' + randomUUID() + '.part' + extension), tempMetadata = temporary + '.json';
    try {
      await command('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-protocol_whitelist', 'file,pipe', ...args, temporary], projectId, signal);
      signal?.throwIfAborted();
      const size = (await stat(temporary)).size;
      if (!size || (key === 'proxy-v1' && size > SHOT_ANALYSIS_LIMITS.uploadBytes))
        throw fail('分析视频仍超过上传限制，请缩短视频后重试。', projectId);
      await writeFile(tempMetadata, JSON.stringify({ id, filename, projectId, type: type + 's', url: asset.url,
        createdAt: new Date().toISOString(), model: 'FFmpeg', prompt: '视频拉片', operation: 'shot-analysis',
        sourceUrl: source.url, sourceFingerprint: source.fingerprint, width: source.width, height: source.height, ...extra }), 'utf8');
      await rename(temporary, target);
      await rename(tempMetadata, metadataFile);
      return asset;
    } finally {
      for (const file of [temporary, tempMetadata]) await rm(file, { force: true }).catch(error =>
        logger?.warn('Shot analysis temporary cleanup failed', { operation: 'cleanupShotAnalysis', projectId, error }));
    }
  }
  async function prepareAnalysis({ projectId, url, choices, includeProxy = true, signal }) {
    const { file, source } = await sourceFor(projectId, url, signal);
    analysisChoices(choices);
    const prompt = shotAnalysisPrompt(source, choices);
    if (!includeProxy) return { source, prompt };
    // Normalize codecs and keep the original time axis; only the proxy is uploaded.
    const bitrate = Math.min(1800000, Math.floor(SHOT_ANALYSIS_LIMITS.uploadBytes * 8 * 0.85 / source.duration) - 64000);
    const video = await outputAsset(projectId, source, 'video', '.mp4', 'proxy-v1', [
      '-i', file, '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='max(2,trunc(iw*min(1,768/max(iw,ih))/2)*2)':'max(2,trunc(ih*min(1,768/max(iw,ih))/2)*2)',fps=12",
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', String(bitrate), '-maxrate', String(bitrate), '-bufsize', String(bitrate * 2), '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '64k', '-ac', '2', '-movflags', '+faststart',
    ], signal);
    return { source, video, prompt };
  }
  async function extractAnalysis({ projectId, url, choices, analysis, fingerprint, signal }) {
    const { file, source } = await sourceFor(projectId, url, signal), selected = analysisChoices(choices);
    if (fingerprint && fingerprint !== source.fingerprint) throw fail('源视频已经变化，请重新分析。', projectId);
    const parsed = parseShotAnalysis(analysis, source.duration, source.hasAudio), shots = [];
    for (const shot of parsed.shots) {
      signal?.throwIfAborted();
      const result = { ...shot, frames: [] };
      if (selected.storyboard) for (const time of shot.keyframes) result.frames.push(await outputAsset(projectId, source, 'image', '.png', ['frame-v1', time],
        ['-ss', String(time), '-i', file, '-map', '0:v:0', '-frames:v', '1', '-an', '-threads', '1'], signal, { time }));
      const range = ['-ss', String(shot.start), '-i', file, '-t', String(shot.end - shot.start)];
      if (selected.motion) result.clip = await outputAsset(projectId, source, 'video', '.mp4', ['clip-v1', shot.start, shot.end],
        [...range, '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='max(2,trunc(iw/2)*2)':'max(2,trunc(ih/2)*2)'", '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart'], signal,
        { duration: shot.end - shot.start });
      if (selected.sound && source.hasAudio) result.audio = await outputAsset(projectId, source, 'audio', '.mp3', ['audio-v1', shot.start, shot.end],
        [...range, '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-q:a', '2'], signal, { duration: shot.end - shot.start });
      shots.push(result);
    }
    return { id: randomUUID(), source, choices: selected, analysis: parsed, shots };
  }
  const guarded = (operation, handler) => async input => {
    try { return await handler(input); }
    catch (cause) {
      if (cause?.code && cause?.context) throw cause;
      if (input.signal?.aborted) throw fail('拉片已停止。', input.projectId, { code: NODE_ERROR.CANCELLED, status: 499, operation });
      throw fail('拉片素材处理失败，请检查视频与磁盘空间。', input.projectId, { code: ERRORS.mediaStorage, status: 500, cause, operation });
    }
  };
  return Object.freeze({ prepareAnalysis: guarded('prepareAnalysis', prepareAnalysis), extractAnalysis: guarded('extractAnalysis', extractAnalysis) });
}

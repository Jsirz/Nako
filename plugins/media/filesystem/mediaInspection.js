import { mediaError } from '../../../modules/contracts/mediaDelivery.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, realpath, readFile, rm, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { RUNTIME_PATHS } from '../../../modules/project/api/server/workspace/runtimePaths.js';
import { resolveMediaArtifact } from '../../../modules/asset-media/api/server/media/mediaArtifact.js';

const execute = promisify(execFile);
const suffix = process.platform === 'win32' ? '.exe' : '';
export async function resolveInspectionSource(libraryDirectory, projectId, url, type) {
  if (!['audio', 'video', 'image'].includes(type) || !/^[A-Za-z0-9_-]{1,128}$/.test(projectId || '')) throw mediaError('素材项目无效', { moduleId: 'media.filesystem', operation: 'inspect' });
  const prefix = `/library/media/${projectId}/${type}s/`;
  const decoded = decodeURIComponent(String(url).split('?')[0]);
  if (!decoded.startsWith(prefix)) throw mediaError('只能解析当前项目中的素材', { moduleId: 'media.filesystem', operation: 'inspect' });
  const name = decoded.slice(prefix.length);
  // eslint-disable-next-line no-control-regex -- Reject control bytes in project asset paths.
  if (!name || name.startsWith('.') || /[\\/:\x00-\x1f]/.test(name)) throw mediaError('素材路径无效', { moduleId: 'media.filesystem', operation: 'inspect' });
  const root = await realpath(libraryDirectory);
  const expected = path.join(root, 'media', projectId, `${type}s`, name);
  const file = await realpath(expected);
  if ((process.platform === 'win32' ? file.toLowerCase() !== expected.toLowerCase() : file !== expected)) throw mediaError('素材链接超出项目范围', { moduleId: 'media.filesystem', operation: 'inspect' });
  return file;
}

/** Only typed local inspection operations; model text is never a shell command. */
export function createMediaInspector({ libraryDirectory, run = execute, binDirectory = RUNTIME_PATHS.BIN_DIR,
  python = process.env.NAKO_ASR_PYTHON || 'python', transcribe } = {}) {
  return async function inspect({ projectId, url, type, times, speech = true, signal }) {
    const file = await resolveInspectionSource(libraryDirectory, projectId, url, type);
    const handle = await open(file, 'r');
    const prefix = Buffer.alloc(32);
    try { await handle.read(prefix, 0, 32, 0); } finally { await handle.close(); }
    const artifact = resolveMediaArtifact({ filename: file, prefix, requireRecognizedContent: true });
    if (artifact.kind !== type) throw mediaError('素材内容与类型不一致', { moduleId: 'media.filesystem', operation: 'inspect' });
    const options = { windowsHide: true, timeout: 0, maxBuffer: Infinity, signal };
    const probe = JSON.parse((await run(path.join(binDirectory, `ffprobe${suffix}`), ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', file], options)).stdout);
    const duration = Number(probe.format?.duration || 0);
    if (!Number.isFinite(duration) || duration <= 0) throw mediaError('音视频时长无效', { moduleId: 'media.filesystem', operation: 'inspect' });
    const selected = times ?? (type === 'video' ? [0.05, 0.35, 0.65, 0.95].map(r => duration * r) : []);
    if (!Array.isArray(selected) || selected.length > 20 || selected.some(t => !Number.isFinite(t) || t < 0 || t >= duration)) throw mediaError('抽帧时间超出范围', { moduleId: 'media.filesystem', operation: 'inspect' });
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'nako-inspect-'));
    try {
      const frames = [];
      for (const [index, time] of selected.entries()) {
        const output = path.join(temporary, `frame-${index}.jpg`);
        await run(path.join(binDirectory, `ffmpeg${suffix}`), ['-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', 'scale=768:768:force_original_aspect_ratio=decrease', '-q:v', '4', output], options);
        frames.push({ time, dataUrl: `data:image/jpeg;base64,${(await readFile(output)).toString('base64')}` });
      }
      const audio = probe.streams?.find(stream => stream.codec_type === 'audio');
      let transcript = '', speechStatus = audio ? 'not_requested' : 'no_audio';
      if (audio && speech) {
        const wav = path.join(temporary, 'speech.wav');
        await run(path.join(binDirectory, `ffmpeg${suffix}`), ['-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-i', file, '-vn', '-ac', '1', '-ar', '16000', wav], options);
        try {
          const cache = path.join(RUNTIME_PATHS.DATA_DIR, 'speech-models');
          await mkdir(cache, { recursive: true });
          const result = transcribe ? await transcribe(wav, signal) : JSON.parse((await run(python,
            [path.join(RUNTIME_PATHS.MODULES_DIR, 'agent', 'server', 'agent', 'tools', 'transcribe.py'), wav, cache], options)).stdout);
          transcript = String(result.text || '');
          speechStatus = 'complete';
        } catch (error) {
          if (signal?.aborted) throw error;
          speechStatus = 'unavailable';
        }
      }
      return { duration, width: Number(probe.streams?.find(s => s.codec_type === 'video')?.width || 0),
        height: Number(probe.streams?.find(s => s.codec_type === 'video')?.height || 0), channels: Number(audio?.channels || 0),
        frames, transcript, speechStatus };
    } finally { await rm(temporary, { recursive: true, force: true }); }
  };
}

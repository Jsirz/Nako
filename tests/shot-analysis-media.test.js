import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { createShotAnalysisProcessor } from '../plugins/media/ffmpeg-sharp/shotAnalysis.js';
import { analysis, source } from './fixtures/shot-analysis.js';

const execute = promisify(execFile), binDirectory = path.resolve('bin');
const binary = name => path.join(binDirectory, name + (process.platform === 'win32' ? '.exe' : ''));
const available = ['ffmpeg', 'ffprobe'].every(name => existsSync(binary(name)));

describe.skipIf(!available)('shot analysis with bundled FFmpeg', () => {
  let directory;
  afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
  it('encodes a portrait proxy and extracts playable media from odd-sized input', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'nako-shot-codecs-'));
    const videos = path.join(directory, 'media/p/videos');
    await mkdir(videos, { recursive: true });
    await execute(binary('ffmpeg'), ['-hide_banner', '-v', 'error', '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=97x161:rate=6', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv444p', '-c:a', 'aac', path.join(videos, 'input.mp4')],
    { windowsHide: true, timeout: 15000 });
    const processor = createShotAnalysisProcessor({ libraryDirectory: directory, binDirectory });
    const input = { projectId: 'p', url: source().url };
    const local = asset => path.join(directory, 'media', 'p', asset.type + 's', decodeURIComponent(asset.url.split('/').at(-1)));
    const probe = async asset => JSON.parse((await execute(binary('ffprobe'), ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', local(asset)],
      { windowsHide: true, timeout: 10000 })).stdout);
    const prepared = await processor.prepareAnalysis(input);
    const proxy = await probe(prepared.video), video = proxy.streams.find(stream => stream.codec_type === 'video');
    expect(video).toMatchObject({ codec_name: 'h264', pix_fmt: 'yuv420p', width: 96, height: 160 });
    expect(Math.max(video.width, video.height)).toBeLessThanOrEqual(768);
    expect(proxy.streams.find(stream => stream.codec_type === 'audio').codec_name).toBe('aac');
    const result = await processor.extractAnalysis({ ...input, analysis: analysis(), fingerprint: prepared.source.fingerprint });
    for (const shot of result.shots) {
      expect((await probe(shot.frames[0])).streams[0].codec_name).toBe('png');
      const clip = await probe(shot.clip);
      expect(clip.streams.find(stream => stream.codec_type === 'video')).toMatchObject({ codec_name: 'h264', width: 96, height: 160 });
      expect(Number(clip.format.duration)).toBeCloseTo(shot.end - shot.start, 0);
      expect((await probe(shot.audio)).streams[0].codec_name).toBe('mp3');
    }
    const before = (await stat(local(prepared.video))).mtimeMs;
    expect((await processor.prepareAnalysis(input)).video).toEqual(prepared.video);
    expect((await stat(local(prepared.video))).mtimeMs).toBe(before);
  }, 30000);
});

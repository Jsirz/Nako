import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { checkMediaRuntime } from './runtime/mediaRuntime.mjs';
import { createServerPluginHost } from '../modules/desktop-shell-observability/api/serverHost.js';
import { createMediaAssetRouter } from '../modules/asset-media/api/server/media/mediaAssetRouter.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.verification/media-upload');
const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-media-upload-'));
const execute = promisify(execFile);
let host, server;
try {
  const versions = await checkMediaRuntime(path.join(root, 'bin'));
  await mkdir(output, { recursive: true });
  const video = path.join(output, 'fixture.mp4');
  const audio = path.join(output, 'fixture.wav');
  const binary = path.join(root, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  const options = { windowsHide: true, timeout: 30000 };
  await execute(binary, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=12',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '1', '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', video], options);
  await execute(binary, ['-v', 'error', '-y', '-i', video, '-vn', '-c:a', 'pcm_s16le', audio], options);
  host = await createServerPluginHost({ libraryDirectory: path.join(directory, 'library'),
    readSecret: () => '', configuration: { disabled: [], options: {} } });
  const app = express();
  app.use('/api', createMediaAssetRouter({ mediaStore: host.services.get('media.operations') }));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const uploaded = [];
  for (const [type, file, mime] of [['videos', video, 'video/mp4'], ['audios', audio, 'audio/wav']]) {
    const response = await fetch(`${origin}/api/assets/upload/${type}`, { method: 'POST',
      headers: { 'content-type': mime, 'x-project-id': 'media-smoke', 'x-filename': path.basename(file) },
      body: await readFile(file) });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.ok(body.asset.duration > 0);
    if (type === 'videos') { assert.equal(body.asset.width, 320); assert.equal(body.asset.height, 180); }
    uploaded.push(body);
  }
  const imported = await fetch(`${origin}/api/assets/import/videos`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: video,
      projectId: 'media-smoke', filename: 'fixture.mp4' }) });
  assert.equal(imported.status, 200);
  const inspection = await host.services.get('media.agent').inspect({ projectId: 'media-smoke',
    url: uploaded[0].url, type: 'video', times: [0.25, 0.75], speech: false });
  assert.equal(inspection.frames.length, 2);
  assert.ok(inspection.frames.every(frame => frame.dataUrl.startsWith('data:image/jpeg;base64,')));
  const corrupt = await fetch(`${origin}/api/assets/upload/videos`, { method: 'POST',
    headers: { 'content-type': 'video/mp4', 'x-project-id': 'media-smoke', 'x-filename': 'broken.mp4' },
    body: 'not a video' });
  assert.equal(corrupt.status, 415);
  assert.equal((await corrupt.json()).code, 'INVALID_MEDIA_CONTENT');
  const result = { ok: true, versions, checks: ['video upload', 'audio upload', 'desktop file import',
    'duration and resolution metadata', 'Agent frame extraction', 'corrupt video rejected'],
    video: uploaded[0].asset, audio: uploaded[1].asset, frames: inspection.frames.length };
  await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log('Media smoke passed:', result.checks.join('; '));
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await host?.stop();
  if (path.dirname(directory) !== os.tmpdir()) throw new Error('Invalid smoke directory');
  await rm(directory, { recursive: true, force: true });
}

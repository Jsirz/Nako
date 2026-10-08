import { expect, it } from 'vitest';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMediaMetadataProbe } from '../modules/asset-media/server/media/mediaMetadataProbe.js';
import { ensureMediaRuntime } from '../scripts/runtime/mediaRuntime.mjs';

it('reports a missing probe as a component failure rather than an invalid video', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-missing-probe-'));
  try {
    const probe = createMediaMetadataProbe({ ffprobePath: path.join(directory, 'ffprobe.exe') });
    await expect(probe(path.join(directory, 'video.mp4'), 'videos')).rejects.toMatchObject({
      status: 503, code: 'MEDIA_STORAGE_FAILED', cause: { code: 'ENOENT' },
      context: { operationCode: 'BUNDLED_MEDIA_PROBE_UNAVAILABLE' },
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it.skipIf(process.platform !== 'win32' || process.arch !== 'x64')('checks missing components without downloading or modifying the installation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-media-check-'));
  try {
    await expect(ensureMediaRuntime({ appRoot: directory, checkOnly: true })).rejects.toThrow('media:setup');
    expect(await readdir(directory)).toEqual([]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it.skipIf(process.platform !== 'win32' || process.arch !== 'x64')('rejects a damaged archive before extracting or installing executables', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-media-checksum-'));
  try {
    const archive = path.join(directory, 'damaged.zip');
    await writeFile(archive, 'not the pinned release');
    await expect(ensureMediaRuntime({ appRoot: directory, archive })).rejects.toThrow('SHA-256 mismatch');
    expect(await readdir(directory)).toEqual(['damaged.zip']);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

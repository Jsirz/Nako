import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { installMacosMedia } from './macosMediaRuntime.mjs';

const execute = promisify(execFile);
export const MEDIA_RUNTIME = Object.freeze({
  version: '9.0.1',
  directory: 'ffmpeg-9.0.1-essentials_build',
  url: 'https://github.com/GyanD/codexffmpeg/releases/download/9.0.1/ffmpeg-9.0.1-essentials_build.zip',
  sha256: 'fec81ae03971d9dd4be3ebe02e263bd2ec1d789483f931bdba5f5715e65da2e9',
});

export async function verifyMediaArchive(archive) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  if (hash.digest('hex') !== MEDIA_RUNTIME.sha256)
    throw new Error('Media archive SHA-256 mismatch; installation was not changed.');
}

export async function checkMediaRuntime(binDirectory) {
  const versions = {};
  for (const name of ['ffmpeg', 'ffprobe']) {
    const file = path.join(binDirectory, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
    const { stdout } = await execute(file, ['-version'], {
      windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
    });
    const match = stdout.match(new RegExp(`^${name} version (\\S+)`));
    if (!match) throw new Error(`Invalid media component: ${name}`);
    versions[name] = match[1];
  }
  return versions;
}

async function downloadArchive(file) {
  const response = await fetch(MEDIA_RUNTIME.url, { signal: AbortSignal.timeout(600000) });
  if (!response.ok || !response.body) throw new Error(`Media download failed: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(file, { flags: 'wx' }));
}

async function installArchive(appRoot, archive, staging) {
  await verifyMediaArchive(archive);
  const prefix = MEDIA_RUNTIME.directory;
  await execute('tar.exe', ['-xf', archive, '-C', staging,
    `${prefix}/bin/ffmpeg.exe`, `${prefix}/bin/ffprobe.exe`, `${prefix}/LICENSE`, `${prefix}/README.txt`],
  { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
  const extracted = path.join(staging, prefix);
  await checkMediaRuntime(path.join(extracted, 'bin'));
  const binDirectory = path.join(appRoot, 'bin');
  await mkdir(binDirectory, { recursive: true });
  for (const [source, target] of [
    ['bin/ffmpeg.exe', 'ffmpeg.exe'], ['bin/ffprobe.exe', 'ffprobe.exe'],
    ['LICENSE', 'FFmpeg-LICENSE.txt'], ['README.txt', 'FFmpeg-README.txt'],
  ]) {
    const temporary = path.join(staging, target);
    await copyFile(path.join(extracted, source), temporary);
    await rename(temporary, path.join(binDirectory, target));
  }
  return checkMediaRuntime(binDirectory);
}

export async function ensureMediaRuntime({ appRoot, archive, checkOnly = false } = {}) {
  if (!((process.platform === 'win32' && process.arch === 'x64')
    || (process.platform === 'darwin' && ['x64', 'arm64'].includes(process.arch))))
    throw new Error('The media runtime requires Windows x64 or macOS x64/arm64.');
  const root = path.resolve(appRoot);
  try { return await checkMediaRuntime(path.join(root, 'bin')); }
  catch (cause) {
    if (checkOnly) throw new Error('Media components are unavailable. Run npm run media:setup.', { cause });
  }
  if (process.platform === 'darwin') {
    if (archive) throw new Error('macOS media setup uses pinned npm archives.');
    await installMacosMedia(root);
    return checkMediaRuntime(path.join(root, 'bin'));
  }
  // Only installer-owned staging is removed; existing application files are never recursively deleted.
  const staging = await mkdtemp(path.join(root, '.media-setup-'));
  try {
    const source = archive ? path.resolve(archive) : path.join(staging, 'media.zip');
    if (!archive) await downloadArchive(source);
    return await installArchive(root, source, staging);
  } finally {
    if (path.dirname(staging) !== root) throw new Error('Invalid media staging directory.');
    await rm(staging, { recursive: true, force: true });
  }
}

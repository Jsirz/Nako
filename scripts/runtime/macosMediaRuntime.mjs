import { createHash } from 'node:crypto';
import { chmod, copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { x as extract } from 'tar';

const packages = {
  arm64: [
    ['ffmpeg', '4.1.5', 'hYqTiP63mXz7wSQfuqfFwfLOfwwFChUedeCVKkBtl/cliaTM7/ePI9bVzfZ2c+dWu3TqCwLDRWNSJ5pqZl8otA=='],
    ['ffprobe', '5.0.1', 'vwNCNjokH8hfkbl6m95zICHwkSzhEvDC3GVBcUp5HX8+4wsX10SP3B+bGur7XUzTIZ4cQpgJmEIAx6TUwRepMg=='],
  ],
  x64: [
    ['ffmpeg', '4.1.0', 'Z4EyG3cIFjdhlY8wI9aLUXuH8nVt7E9SlMVZtWvSPnm2sm37/yC2CwjUzyCQbJbySnef1tQwGG2Sx+uWhd9IAw=='],
    ['ffprobe', '5.1.0', 'J+YGscZMpQclFg31O4cfVRGmDpkVsQ2fZujoUdMAAYcP0NtqpC49Hs3SWJpBdsGB4VeqOt5TTm1vSZQzs1NkhA=='],
  ],
};

async function installComponent(root, architecture, [name, version, integrity]) {
  const staging = await mkdtemp(path.join(root, `.media-setup-${name}-`));
  try {
    const url = `https://registry.npmjs.org/@${name}-installer/darwin-${architecture}/-/darwin-${architecture}-${version}.tgz`;
    const response = await fetch(url, { signal: AbortSignal.timeout(600000) });
    if (!response.ok) throw new Error(`Media download failed: ${response.status}`);
    const archive = Buffer.from(await response.arrayBuffer());
    if (createHash('sha512').update(archive).digest('base64') !== integrity)
      throw new Error(`Media integrity mismatch: ${name}`);
    const file = path.join(staging, 'archive.tgz');
    await writeFile(file, archive);
    await extract({ file, cwd: staging, strict: true });
    const binary = path.join(root, 'bin', name);
    await copyFile(path.join(staging, 'package', name), binary);
    await chmod(binary, 0o755);
    for (const entry of await readdir(path.join(staging, 'package'))) {
      if (/^(license|copying|readme)/i.test(entry))
        await copyFile(path.join(staging, 'package', entry), path.join(root, 'bin', `${name}-${entry}`));
    }
  } finally {
    if (path.dirname(staging) !== root) throw new Error('Invalid media staging path');
    await rm(staging, { recursive: true, force: true });
  }
}

export async function installMacosMedia(root) {
  if (!packages[process.arch]) throw new Error('Unsupported macOS architecture');
  await mkdir(path.join(root, 'bin'), { recursive: true });
  for (const specification of packages[process.arch]) await installComponent(root, process.arch, specification);
}

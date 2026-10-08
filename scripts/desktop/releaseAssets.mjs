import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const releasePlatforms = [
  { target: 'win', arch: 'x64', feed: 'windows-x64', metadata: 'latest.yml' },
  { target: 'mac', arch: 'arm64', feed: 'mac-arm64', metadata: 'appcast.xml' },
  { target: 'mac', arch: 'x64', feed: 'mac-x64', metadata: 'appcast.xml' },
];

export async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function prepareRelease(directory, version, platforms = releasePlatforms) {
  assert.match(version, /^[0-9]+[.][0-9]+[.][0-9]+$/);
  const output = path.join(directory, 'publish');
  await mkdir(output, { recursive: true });
  const assets = [];
  for (const platform of platforms) {
    const { target, arch, metadata } = platform;
    const source = path.join(directory, `Nako-${target}-${arch}`);
    const installers = target === 'win'
      ? [`Nako-${version}-windows-x64-setup.exe`, `Nako-${version}-win-x64.zip`]
      : ['dmg', 'zip'].map(extension => `Nako-${version}-mac-${arch}.${extension}`);
    const checksumName = `SHA256SUMS-${target}-${arch}.txt`;
    const files = await readdir(source);
    const deltas = target === 'mac' ? files.filter(name => name.endsWith('.delta')) : [];
    for (const name of deltas) assert.match(name, /^[a-zA-Z0-9._-]+\.delta$/, 'Invalid delta filename');
    const downloads = [...installers, ...deltas];
    for (const name of [...installers, metadata, checksumName])
      assert.ok(files.includes(name), `Missing release asset: ${target}-${arch}/${name}`);
    const entries = (await readFile(path.join(source, checksumName), 'utf8')).trim().split('\n');
    assert.equal(entries.length, downloads.length, `Incomplete checksum manifest: ${checksumName}`);
    const verified = new Set();
    for (const entry of entries) {
      const [checksum, name, extra] = entry.trim().split('  ');
      assert.ok(!extra && downloads.includes(name) && !verified.has(name), `Invalid checksum entry: ${entry}`);
      assert.match(checksum, /^[a-f0-9]{64}$/);
      assert.equal(await sha256(path.join(source, name)), checksum, `Checksum mismatch: ${name}`);
      verified.add(name);
    }
    const info = await readFile(path.join(source, metadata), 'utf8');
    if (target === 'win') {
      assert.equal(info.split('\n')[0].trim(), `version: ${version}`, `Wrong update version: ${source}`);
    } else {
      assert.ok(info.includes(`<sparkle:version>${version}</sparkle:version>`), `Wrong update version: ${source}`);
      assert.ok(info.includes('sparkle:edSignature=') && info.includes('<!-- sparkle-signatures:'),
        `Unsigned Sparkle metadata: ${source}`);
      for (const name of deltas) assert.ok(info.includes(name), `Unreferenced delta: ${name}`);
    }
    assert.ok(info.includes(installers.find(name => name.endsWith(target === 'win' ? '.exe' : '.zip'))),
      `Update metadata does not reference the correct installer: ${source}`);
    const names = [...downloads, checksumName, metadata,
      ...files.filter(name => installers.some(installer => name === `${installer}.blockmap`))];
    for (const name of names) {
      // Architecture-specific appcasts retain their original name in Actions artifacts.
      const destinationName = target === 'mac' && name === metadata ? `appcast-mac-${arch}.xml` : name;
      const destination = path.join(output, destinationName);
      assert.ok(!assets.includes(destination), `Duplicate release asset: ${destinationName}`);
      await copyFile(path.join(source, name), destination);
      assets.push(destination);
    }
  }
  return assets;
}

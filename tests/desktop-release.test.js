import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareRelease, releasePlatforms, sha256 } from '../scripts/desktop/releaseAssets.mjs';

const directories = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-release-'));
  directories.push(directory);
  for (const { target, arch, metadata } of releasePlatforms) {
    const source = path.join(directory, `Nako-${target}-${arch}`);
    await mkdir(source);
    const installers = target === 'win'
      ? ['Nako-1.5.5-windows-x64-setup.exe', 'Nako-1.5.5-win-x64.zip']
      : ['dmg', 'zip'].map(extension => `Nako-1.5.5-mac-${arch}.${extension}`);
    const lines = [];
    for (const name of installers) {
      await writeFile(path.join(source, name), name);
      lines.push(`${await sha256(path.join(source, name))}  ${name}`);
    }
    await writeFile(path.join(source, `SHA256SUMS-${target}-${arch}.txt`), lines.join('\n') + '\n');
    await writeFile(path.join(source, metadata), target === 'win'
      ? `version: 1.5.5\nfiles:\n${installers.join('\n')}\n`
      : `<sparkle:version>1.5.5</sparkle:version>\n${installers.join('\n')}\nsparkle:edSignature="fixture"\n<!-- sparkle-signatures: -->`);
  }
  return directory;
}

it('publishes both Mac update manifests without overwriting the original files', async () => {
  const directory = await fixture();
  const assets = await prepareRelease(directory, '1.5.5');
  expect(assets).toHaveLength(12);
  for (const arch of ['arm64', 'x64']) {
    const original = await readFile(path.join(directory, `Nako-mac-${arch}/appcast.xml`), 'utf8');
    expect(await readFile(path.join(directory, `publish/appcast-mac-${arch}.xml`), 'utf8')).toBe(original);
    expect(original).toContain(`mac-${arch}.zip`);
  }
});

it('rejects missing platforms before publishing', async () => {
  const directory = await fixture();
  await rm(path.join(directory, 'Nako-mac-x64/appcast.xml'));
  await expect(prepareRelease(directory, '1.5.5')).rejects.toThrow('Missing release asset');
});

it('rejects modified installers before publishing', async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, 'Nako-win-x64/Nako-1.5.5-windows-x64-setup.exe'), 'corrupted');
  await expect(prepareRelease(directory, '1.5.5')).rejects.toThrow('Checksum mismatch');
});

it('rejects metadata for the wrong version', async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, 'Nako-mac-arm64/appcast.xml'), '<sparkle:version>1.5.4</sparkle:version>');
  await expect(prepareRelease(directory, '1.5.5')).rejects.toThrow('Wrong update version');
});

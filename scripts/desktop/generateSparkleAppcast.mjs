import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir, copyFile, readdir, appendFile, rename } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPrivateKey, createPublicKey, verify } from 'node:crypto';
import { updateFeed } from './updateFeed.cjs';
import configuration from '../../config/desktop-updates.json' with { type: 'json' };
import metadata from '../../package.json' with { type: 'json' };
import { readSparkleAppcast } from '../../modules/desktop-shell-observability/api/desktop/sparkleUpdater.mjs';
import semver from 'semver';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { sha256 } from './releaseAssets.mjs';

assert.equal(process.platform, 'darwin');
const secret = process.env.SPARKLE_ED_PRIVATE_KEY;
assert.ok(secret, 'SPARKLE_ED_PRIVATE_KEY is required');
const seed = Buffer.from(secret, 'base64');
assert.equal(seed.length, 32, 'Expected Sparkle Ed25519 seed format');
const key = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
  format: 'der', type: 'pkcs8' });
assert.equal(createPublicKey(key).export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64'),
  configuration.sparklePublicKey, 'Signing key does not match the bundled public key');
const temp = await mkdtemp(path.join(os.tmpdir(), 'nako-sparkle-'));
const privateFile = path.join(temp, 'seed');
try {
  await writeFile(privateFile, secret, { mode: 0o600 });
  const tools = path.resolve('.packaging/app/node_modules/electron-sparkle-updater/native/vendor/bin');
  const archive = path.join(temp, 'archives');
  await mkdir(archive);
  const zipName = `Nako-${metadata.version}-mac-${process.arch}.zip`;
  await copyFile(path.resolve('release', zipName), path.join(archive, zipName));
  const repo = process.env.GH_REPO;
  assert.ok(repo && process.env.GH_TOKEN, 'GitHub repository/token required to fetch delta bases');
  const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const releases = JSON.parse(gh(['api', `repos/${repo}/releases?per_page=100`]));
  const bases = releases.filter(release => !release.draft && !release.prerelease
    && /^v\d+\.\d+\.\d+$/.test(release.tag_name)
    && semver.lt(release.tag_name.slice(1), metadata.version)
    && release.assets.some(asset => asset.name === `appcast-mac-${process.arch}.xml`)
    && release.assets.some(asset => asset.name === `Nako-${release.tag_name.slice(1)}-mac-${process.arch}.zip`))
    .sort((a, b) => semver.rcompare(a.tag_name.slice(1), b.tag_name.slice(1))).slice(0, 2);
  for (const base of bases) {
    const baseDirectory = path.join(temp, base.tag_name);
    await mkdir(baseDirectory);
    const baseZip = `Nako-${base.tag_name.slice(1)}-mac-${process.arch}.zip`;
    const baseFeed = `appcast-mac-${process.arch}.xml`;
    gh(['release', 'download', base.tag_name, '--repo', repo, '--dir', baseDirectory,
      '--pattern', baseZip, '--pattern', baseFeed]);
    const info = readSparkleAppcast(await readFile(path.join(baseDirectory, baseFeed)), configuration.sparklePublicKey, '0.0.0');
    assert.equal(info.version, base.tag_name.slice(1), 'Delta base version mismatch');
    assert.ok(verify(null, await readFile(path.join(baseDirectory, baseZip)), createPublicKey(key),
      Buffer.from(info.enclosure['@_sparkle:edSignature'], 'base64')), 'Delta base signature did not verify');
    await copyFile(path.join(baseDirectory, baseZip), path.join(archive, baseZip));
  }
  execFileSync(path.join(tools, 'generate_appcast'), ['--ed-key-file', privateFile,
    '--download-url-prefix', updateFeed(), '--versions', metadata.version,
    '--maximum-deltas', '2', '--maximum-versions', '1',
    archive], { stdio: 'inherit' });
  const xmlOptions = { ignoreAttributes: false, parseTagValue: false, cdataPropName: '__cdata' };
  const generatedFeed = new XMLParser(xmlOptions).parse(await readFile(path.join(archive, 'appcast.xml'), 'utf8'));
  const generatedDeltas = generatedFeed.rss.channel.item['sparkle:deltas']?.enclosure;
  // Sparkle's default delta names omit CPU architecture, but both architectures share a GitHub release.
  for (const enclosure of generatedDeltas ? (Array.isArray(generatedDeltas) ? generatedDeltas : [generatedDeltas]) : []) {
    const url = new URL(enclosure['@_url']);
    const original = decodeURIComponent(url.pathname.split('/').at(-1));
    assert.match(original, /^[a-zA-Z0-9._-]+\.delta$/);
    const name = original.replace(/\.delta$/, `-mac-${process.arch}.delta`);
    await rename(path.join(archive, original), path.join(archive, name));
    url.pathname = path.posix.join(path.posix.dirname(url.pathname), name);
    enclosure['@_url'] = url.href;
  }
  await writeFile('release/appcast.xml', new XMLBuilder({ ...xmlOptions, format: true }).build(generatedFeed));
  // SURequireSignedFeed validates both the prompt's metadata and the native download check.
  execFileSync(path.join(tools, 'sign_update'), ['--ed-key-file', privateFile,
    path.resolve('release/appcast.xml')], { stdio: 'inherit' });
  const xml = await readFile('release/appcast.xml', 'utf8');
  assert.ok(xml.includes(`Nako-${metadata.version}-mac-${process.arch}.zip`));
  assert.ok(xml.includes('sparkle-signatures:'));
  const info = readSparkleAppcast(Buffer.from(xml), configuration.sparklePublicKey, '0.0.0');
  assert.equal(info.version, metadata.version);
  const zip = await readFile(`release/Nako-${metadata.version}-mac-${process.arch}.zip`);
  assert.ok(verify(null, zip, createPublicKey(key), Buffer.from(info.enclosure['@_sparkle:edSignature'], 'base64')),
    'Generated ZIP signature did not verify');
  const deltas = (await readdir(archive)).filter(name => name.endsWith('.delta'));
  const item = new XMLParser({ ignoreAttributes: false }).parse(xml).rss.channel.item;
  const raw = item['sparkle:deltas']?.enclosure;
  const enclosures = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  assert.equal(deltas.length, enclosures.length, 'Generated delta files must match appcast enclosures');
  for (const name of deltas) {
    const enclosure = enclosures.find(entry => decodeURIComponent(new URL(entry['@_url']).pathname.split('/').at(-1)) === name);
    assert.ok(enclosure, `Delta not referenced by appcast: ${name}`);
    assert.ok(verify(null, await readFile(path.join(archive, name)), createPublicKey(key),
      Buffer.from(enclosure['@_sparkle:edSignature'], 'base64')), `Delta signature did not verify: ${name}`);
    await copyFile(path.join(archive, name), path.resolve('release', name));
    await appendFile(`release/SHA256SUMS-mac-${process.arch}.txt`, `${await sha256(path.join(archive, name))}  ${name}\n`);
  }
  console.log(`Sparkle signed feed and ZIP verified; ${deltas.length} delta packages from ${bases.length} signed bases`);
} finally {
  await rm(temp, { recursive: true, force: true });
}

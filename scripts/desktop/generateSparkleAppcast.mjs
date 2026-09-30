import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPrivateKey, createPublicKey, verify } from 'node:crypto';
import { updateFeed } from './updateFeed.cjs';
import configuration from '../../config/desktop-updates.json' with { type: 'json' };
import metadata from '../../package.json' with { type: 'json' };
import { readSparkleAppcast } from '../../modules/desktop-shell-observability/api/desktop/sparkleUpdater.mjs';

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
  execFileSync(path.join(tools, 'generate_appcast'), ['--ed-key-file', privateFile,
    '--download-url-prefix', updateFeed(), '--maximum-deltas', '0', '--maximum-versions', '1',
    archive], { stdio: 'inherit' });
  await copyFile(path.join(archive, 'appcast.xml'), path.resolve('release/appcast.xml'));
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
  console.log('Sparkle feed and ZIP signatures verified against the bundled public key');
} finally {
  await rm(temp, { recursive: true, force: true });
}

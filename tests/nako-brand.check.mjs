import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { convertPreferences } from '../scripts/maintenance/convert-preferences.mjs';
import { createProviderCredentialStore } from '../modules/identity-account/api/server/credentials/providerCredentialStore.mjs';
import { APP_ORIGIN, createAppProtocolHandler } from '../apps/desktop/src/appProtocol.mjs';
import { resolveInstallation } from '../apps/desktop/src/installation.mjs';
import { RELEASE_CONTRACT, installerPackageName } from '../scripts/release/releaseNaming.mjs';

const original = { schemaVersion: 1, browserImported: true, values: {
  'fisherai-local-avatar': 'old', 'nako-local-avatar': 'new',
  'aifisher.canvas.appearance.v1': '{"theme":"light"}', 'other': 'AIFISHER user prompt',
} };
assert.deepEqual(convertPreferences(original).values, {
  'nako-local-avatar': 'new', 'nako.canvas.appearance.v1': '{"theme":"light"}', other: 'AIFISHER user prompt',
});
assert.equal(original.values['fisherai-local-avatar'], 'old');
assert.throws(() => convertPreferences({ ...original, values: { 'aifisher:theme': 'a', 'fisherai:theme': 'b' } }), /Conflicting/);
const temporary = await mkdtemp(path.join(os.tmpdir(), 'nako-brand-'));
try {
  const store = createProviderCredentialStore({ filePath: path.join(temporary, 'keys.dpapi'),
    allowedKeys: ['OPENAI_API_KEY'], protector: {
      protect: async (bytes) => Buffer.from(bytes), unprotect: async (bytes) => Buffer.from(bytes),
    } });
  await store.update({ OPENAI_API_KEY: 'synthetic-only' });
  assert.equal((await readFile(store.filePath)).subarray(0,8).toString(), 'NKPCDP01');
  assert.deepEqual(await store.read(), { OPENAI_API_KEY: 'synthetic-only' });
} finally { await rm(temporary, { recursive: true, force: true }); }

const logo = await readFile('public/nako-logo.png');
assert.equal(createHash('sha256').update(logo).digest('hex'), '7c0f41f90d07178b7078b2872463089961a97ff6d5f4d04ad46ccba4a663ba13');
const ico = await readFile('public/nako-app.ico');
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 8);
for(const layout of ['mark','lockup-horizontal','lockup-vertical']) for(const theme of ['white','black']) {
  const svg = await readFile(`public/nako-${layout}-${theme}.svg`, 'utf8');
  assert.ok(svg.includes(logo.toString('base64')));
  assert.ok(!svg.includes('<path'));
}
const handler = createAppProtocolHandler({ backend: {}, distDirectory: path.resolve('public'), launcherDirectory: path.resolve('apps/desktop/launcher') });
const response = await handler(new Request(`${APP_ORIGIN}/nako-logo.png`));
assert.equal(response.status, 200);
assert.deepEqual(Buffer.from(await response.arrayBuffer()), logo);
assert.equal(APP_ORIGIN, 'nako://app');
assert.equal(RELEASE_CONTRACT.format, 'nako-portable-release');
assert.equal(installerPackageName('2.0.7'), 'Nako-Canvas-2.0.7-Setup.exe');
const installation = resolveInstallation({ packaged: true, executablePath: path.resolve('release/Nako.exe'),
  resourcesPath: path.resolve('release/resources'), platform: 'win32',
  environment: { LOCALAPPDATA: path.resolve('local') } });
assert.ok(installation.icon.endsWith(path.join('app','dist','nako-app.ico')));
assert.ok((await readFile('apps/desktop/launcher/src/StartupStatus.tsx', 'utf8')).includes('src="/nako-logo.png"'));

async function checkSource(dir) {
  for(const e of await readdir(dir, {withFileTypes:true})) {
    if(['node_modules','dist'].includes(e.name)) continue;
    const p = path.join(dir,e.name);
    if(e.isDirectory()) await checkSource(p);
    else if(/\.(?:[cm]?js|tsx?|css|html|json|py|ps1)$/.test(p)) {
      const text = await readFile(p,'utf8');
      assert.doesNotMatch(text, /aifisher|fisherai|noko|(?<!work)fisher-|__fisher/i, p);
    }
  }
}
for(const dir of ['apps','modules','plugins','integrations']) await checkSource(dir);
console.log('Nako brand checks passed: protocol, assets, credential format, preferences, release naming, source identifiers.');

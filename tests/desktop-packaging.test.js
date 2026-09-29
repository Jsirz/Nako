import { expect, it } from 'vitest';
import path from 'node:path';
import { resolveInstallation } from '../apps/desktop/src/installation.mjs';
import { createMacosKeychainProtector } from '../modules/identity-account/api/server/credentials/macosCredentialProtector.mjs';

it.each(['win32', 'darwin'])('keeps %s packaged user data outside the read-only application', (platform) => {
  const root = path.resolve('fixture-install');
  const resources = path.join(root, 'resources');
  const home = path.resolve('fixture-profile');
  const installation = resolveInstallation({ packaged: true, platform, resourcesPath: resources,
    executablePath: path.join(root, 'Nako'), homeDirectory: home, environment: { LOCALAPPDATA: home } });
  expect(installation.code).toBe(path.join(resources, 'app'));
  expect(installation.data.startsWith(home + path.sep)).toBe(true);
  expect(installation.data.startsWith(root + path.sep)).toBe(false);
  expect(installation.launcher).toBe(path.join(resources, 'app/apps/desktop/launcher/dist'));
  expect(installation.tools).toBe(path.join(resources, 'app/scripts/release'));
});

it('uses the macOS Keychain key for authenticated encryption across processes', async () => {
  let stored;
  const calls = [];
  const runSecurity = async (args) => {
    calls.push(args[0]);
    if (args[0] === 'add-generic-password') { stored = args.at(-1); return ''; }
    if (!stored) throw Object.assign(new Error('missing'), { missing: true });
    return stored;
  };
  const first = createMacosKeychainProtector({ runSecurity });
  const plaintext = Buffer.from('test-only-fake-key');
  const encrypted = await first.protect(plaintext);
  expect(encrypted.includes(plaintext)).toBe(false);
  const second = createMacosKeychainProtector({ runSecurity });
  expect(await second.unprotect(encrypted)).toEqual(plaintext);
  const modified = Buffer.from(encrypted); modified[modified.length - 1] ^= 1;
  await expect(second.unprotect(modified)).rejects.toMatchObject({ code: 'CREDENTIAL_DECRYPT_FAILED' });
  expect(calls.filter((call) => call === 'add-generic-password')).toHaveLength(1);
});

it('does not replace an unavailable key when decrypting existing macOS credentials', async () => {
  const calls = [];
  const protector = createMacosKeychainProtector({ runSecurity: async (args) => {
    calls.push(args[0]); throw Object.assign(new Error('missing'), { missing: true });
  } });
  await expect(protector.unprotect(Buffer.alloc(40))).rejects.toMatchObject({ code: 'CREDENTIAL_DECRYPT_FAILED' });
  expect(calls).toEqual(['find-generic-password']);
});

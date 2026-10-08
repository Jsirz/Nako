import path from 'node:path';
import { USER_PROVIDER_SECRET_KEYS } from '../../../contracts/providerSecrets.js';
import { createProviderCredentialStore, createPlatformCredentialProtector, PROVIDER_CREDENTIAL_FILE_NAME } from './providerCredentialStore.mjs';

/** Core settings service; providers still receive only host-scoped credential getters. */
export function createProviderCredentialManager({ applicationDirectory, privateDirectory }) {
  let store;
  const credentials = () => store ||= createProviderCredentialStore({
    filePath: process.env.NAKO_PROVIDER_CREDENTIAL_PATH || path.join(privateDirectory, PROVIDER_CREDENTIAL_FILE_NAME),
    allowedKeys: USER_PROVIDER_SECRET_KEYS,
    protector: createPlatformCredentialProtector({
      helperPath: process.env.NAKO_PROVIDER_CREDENTIAL_HELPER || path.join(applicationDirectory, 'modules', 'identity-account', 'server', 'credentials', 'providerCredentialBridge.ps1'),
    }),
  });
  return Object.freeze({ read: () => credentials().read(), update: patch => credentials().update(patch) });
}

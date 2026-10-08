import express from 'express';
import { defineApplicationPlugin } from '../kernel/application.js';
import {
  createPreferenceRouter,
  createPreferenceStore,
} from './server/preferences/preferenceStore.js';
import { createBackgroundRouter } from './server/appearance/backgroundRouter.js';
import { createBackgroundStore } from './server/appearance/backgroundStore.js';
import { fetchExternalUrl } from './server/security/externalUrlPolicy.js';
import { createProviderCredentialManager } from './server/credentials/providerCredentialManager.mjs';
import { createSafeProxyRouter } from './server/security/safeProxyRouter.js';
import { createPublicLibraryGuard } from './server/security/publicLibraryGuard.js';
import { denyPrivateLibraryPath } from './server/security/privateLibraryGuard.js';
import { getAuthenticatedRequest } from './server/security/localAuthentication.js';
export default defineApplicationPlugin({
  id: 'module.identity-account',
  provides: ['preferences.repository', 'identity.providerCredentials', 'identity.externalUrlFetch', 'identity.httpSecurity'],
  activate(context) {
    const { paths } = context.services.get('host.runtime');
    const router = express.Router();
    const preferences = createPreferenceStore(paths.PRIVATE_DIR);
    context.services.register('preferences.repository', preferences);
    context.services.register('identity.providerCredentials', createProviderCredentialManager({ applicationDirectory: paths.APP_DIR, privateDirectory: paths.PRIVATE_DIR }));
    context.services.register('identity.externalUrlFetch', Object.freeze({ fetch: fetchExternalUrl }));
    context.services.register('identity.httpSecurity', Object.freeze({
      createProxyRouter: () => createSafeProxyRouter({ logger: context.logger }),
      createPublicLibraryGuard, denyPrivateLibraryPath,
      getAuthenticatedScope: request => getAuthenticatedRequest(request).scope,
    }));
    router.use('/api/preferences', createPreferenceRouter(preferences));
    router.use(
      '/api/appearance/background',
      createBackgroundRouter(createBackgroundStore(paths.PRIVATE_DIR)),
    );
    context.services.get('http.routes').contribute(context, router);
  },
});

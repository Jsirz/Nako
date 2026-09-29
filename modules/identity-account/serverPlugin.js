import express from 'express';
import { defineApplicationPlugin } from '../kernel/application.js';
import {
  createPreferenceRouter,
  createPreferenceStore,
} from './server/preferences/preferenceStore.js';
import { createBackgroundRouter } from './server/appearance/backgroundRouter.js';
import { createBackgroundStore } from './server/appearance/backgroundStore.js';
export default defineApplicationPlugin({
  id: 'module.identity-account',
  provides: ['preferences.repository'],
  activate(context) {
    const { paths } = context.services.get('host.runtime');
    const router = express.Router();
    const preferences = createPreferenceStore(paths.PRIVATE_DIR);
    context.services.register('preferences.repository', preferences);
    router.use('/api/preferences', createPreferenceRouter(preferences));
    router.use(
      '/api/appearance/background',
      createBackgroundRouter(createBackgroundStore(paths.PRIVATE_DIR)),
    );
    context.services.get('http.routes').contribute(context, router);
  },
});

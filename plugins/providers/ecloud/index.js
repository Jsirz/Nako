import { defineProviderPlugin } from '../../../modules/generation-providers/index.js';
import manifest from './manifest.json' with { type: 'json' };
export default defineProviderPlugin(
  manifest,
  manifest.providers,
  () => import('./implementation.js'),
);

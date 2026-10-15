import { defineProviderPlugin } from '../../../modules/generation-providers/index.js';
import manifest from './manifest.json' with { type: 'json' };
export default defineProviderPlugin(manifest, manifest.providers, async (context) => {
  const { createSeedVr2Provider } = await import('./implementation.js');
  const executors = context.services.get('workflow.executors');
  return { SeedVr2ImageProvider: createSeedVr2Provider({
    clientFactory: options => executors.createClient('runninghub-webapp', options),
  }) };
});

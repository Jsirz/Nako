import { generationProviders } from './providerRegistry.js';
export default {
  manifest: {
    id: 'generation-core',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    services: { provides: ['generation.providers'] },
  },
  activate(context) {
    context.services.register('generation.providers', generationProviders);
  },
};

import { matchesRemoteTask, remoteTaskReference } from './server/generation/generationTaskRecovery.js';
import { generationProviders } from './providerRegistry.js';
import { loadModelCatalog } from './server/config/modelCatalog.js';
export default {
  manifest: {
    id: 'generation-core',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    services: { provides: ['generation.providers', 'generation.receipts', 'generation.modelCatalog'] },
  },
  activate(context) {
    context.services.register('generation.providers', generationProviders);
    context.services.register('generation.receipts', Object.freeze({ matchesRemoteTask, remoteTaskReference }));
    /** @type {import('../contracts/generationCatalog').GenerationModelCatalogService} */
    const catalog = Object.freeze({ read: () => structuredClone(loadModelCatalog()) });
    context.services.register('generation.modelCatalog', catalog);
  },
};

import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { createTextGenerationService } from './service.js';
import { AGENT_TEXT_GENERATION_SERVICE } from '../../../modules/contracts/agentTextGeneration.js';
export default {
  manifest: { id: 'platform.text-transport', version: '1.0.0', apiVersion: '^1.0.0', type: 'platform',
    dependencies: { 'generation-core': '^1.0.0' },
    credentials: ['provider.doubao', 'provider.openai', 'provider.deepseek', 'provider.official-text', 'provider.ecloud', 'provider.work-fisher'],
    services: { requires: ['generation.modelCatalog'], provides: [AGENT_TEXT_GENERATION_SERVICE] }, capabilities: ['generation.chat-stream'], reloadRequired: true },
  activate(context) {
    const catalog = context.services.get('generation.modelCatalog');
    context.services.register(AGENT_TEXT_GENERATION_SERVICE, createTextGenerationService({
      credentials: context.credentials,
      modelCatalog: () => catalog.read(),
      fetcher: BaseProvider.fetch.bind(BaseProvider),
      configureProxy: BaseProvider.injectProxy.bind(BaseProvider),
    }));
  },
};

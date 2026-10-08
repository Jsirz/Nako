import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { loadModelCatalog } from '../../../modules/generation-core/api/server/config/modelCatalog.js';
import { createTextGenerationService } from './service.js';
import { AGENT_TEXT_GENERATION_SERVICE } from '../../../modules/contracts/agentTextGeneration.js';
export default {
  manifest: { id: 'platform.text-transport', version: '1.0.0', apiVersion: '^1.0.0', type: 'platform',
    credentials: ['provider.doubao', 'provider.openai', 'provider.deepseek', 'provider.official-text', 'provider.ecloud', 'provider.work-fisher'],
    services: { provides: [AGENT_TEXT_GENERATION_SERVICE] }, capabilities: ['generation.chat-stream'], reloadRequired: true },
  activate(context) {
    context.services.register(AGENT_TEXT_GENERATION_SERVICE, createTextGenerationService({
      credentials: context.credentials,
      modelCatalog: loadModelCatalog,
      fetcher: BaseProvider.fetch.bind(BaseProvider),
      configureProxy: BaseProvider.injectProxy.bind(BaseProvider),
    }));
  },
};

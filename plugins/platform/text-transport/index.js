import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { submitOpenAiChatWithLogs } from '../../../modules/generation-providers/api/server/providers/providerKit.js';
export default {
  manifest: { id: 'platform.text-transport', version: '1.0.0', apiVersion: '^1.0.0', type: 'platform',
    credentials: ['provider.doubao', 'provider.openai', 'provider.deepseek', 'provider.official-text', 'provider.ecloud', 'provider.work-fisher'],
    services: { provides: ['generation.textTransport'] }, capabilities: ['generation.chat-stream'], reloadRequired: true },
  activate(context) {
    context.services.register('generation.textTransport', Object.freeze({
      fetcher: BaseProvider.fetch.bind(BaseProvider),
      configureProxy: BaseProvider.injectProxy.bind(BaseProvider),
      submitChat: submitOpenAiChatWithLogs,
      credentials(providerName) {
        const owners = { DoubaoTextProvider: 'provider.doubao', GptTextProvider: 'provider.openai', DeepSeekProvider: 'provider.deepseek', GlmTextProvider: 'provider.official-text', KimiTextProvider: 'provider.official-text', EcloudTextProvider: 'provider.ecloud', WorkFisherTextProvider: 'provider.work-fisher' };
        const owner = owners[providerName];
        if (!owner) throw new Error('Unsupported text credential source');
        return context.credentials.get(owner);
      },
    }));
  },
};

import { createDefaultModelsClient } from './ui/generation/defaultModelsClient';
import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installGenerationScheduler } from './ui/generation/generationScheduler';
import { installGenerationRecovery } from './ui/generation/generationRecovery';
import { installWorkflowRecoveryFetch } from './ui/generation/workflowRecoveryBoundary';
import { installImageModeAdapter } from './ui/generation/imageMode';
import { installMidjourneyReferenceAdapter } from './ui/generation/midjourneyReferences';
import { installImageResultHistory } from './ui/generation/imageResultHistory';
import { installAgentModelAvailability } from './ui/generation/agentModelAvailability';
import { installModelPricing } from './ui/generation/modelPicker';
import { createSourceSettingsClient } from './ui/generation/sourceSettingsClient';
import { installVideoModeAdapter } from './ui/generation/videoMode';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.generation-core',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.identity-account': '^1.0.0' },
    capabilities: ['ui.generation-core'],
    services: { provides: ['generation.defaults'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      const originalFetch = window.fetch;
      const recoveryFetch = installWorkflowRecoveryFetch();
      context.onDispose(() => {
        if (window.fetch === recoveryFetch) window.fetch = originalFetch;
      });
      const defaults = createDefaultModelsClient();
      context.services.register('generation.defaults', defaults);
      await defaults.read().catch(() => {});
      const sourceSettingsClient = createSourceSettingsClient();
      trackBrowserResource(context, installAgentModelAvailability(sourceSettingsClient));
      trackBrowserResource(context, installImageModeAdapter());
      trackBrowserResource(context, installMidjourneyReferenceAdapter());
      trackBrowserResource(context, installVideoModeAdapter());
      trackBrowserResource(context, installImageResultHistory());
      trackBrowserResource(context, installGenerationScheduler());
      trackBrowserResource(context, installGenerationRecovery());
      trackBrowserResource(context, installModelPricing(sourceSettingsClient));
    });
  },
};
export default plugin;

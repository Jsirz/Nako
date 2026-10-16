import { createDefaultModelsClient } from './ui/generation/defaultModelsClient';
import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installGenerationScheduler } from './ui/generation/generationScheduler';
import { interruptedGenerationPatch, installGenerationRecovery } from './ui/generation/generationRecovery';
import { registerWorkflowRecoveryOwner, installWorkflowRecoveryFetch } from './ui/generation/workflowRecoveryBoundary';
import { installImageModeAdapter } from './ui/generation/imageMode';
import { installMidjourneyReferenceAdapter } from './ui/generation/midjourneyReferences';
import { installImageResultHistory } from './ui/generation/imageResultHistory';
import { installAgentModelAvailability } from './ui/generation/agentModelAvailability';
import { mountModelPicker, installModelPricing } from './ui/generation/modelPicker';
import { createSourceSettingsClient } from './ui/generation/sourceSettingsClient';
import { installVideoModeAdapter } from './ui/generation/videoMode';
import { generateImage, getGenerationConcurrency } from './ui/generation/generationClient';
import { mountSourceSettings } from './ui/generation/sourceSettings';
import type { GenerationUiService } from '../contracts/browserCapabilities';
import type { ModelCatalogService, GenerationPreparationService, GenerationInteractionService } from '../contracts/generationCapabilities';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, AUDIO_MODELS } from './models/catalog';
import { modelDisplayName } from './models/modelDisplayName';
import { prepareCanvasGenerationRequest } from './ui/generation/canvasGenerationPreparation';

import { externalReferenceMedia } from './ui/generation/canvasGenerationRequests';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.generation-core',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.identity-account': '^1.0.0' },
    capabilities: ['ui.generation-core'],
    services: { provides: ['generation.defaults', 'ui.generation', 'ui.generation.catalog', 'ui.generation.preparation', 'ui.generation.interaction'] },
  },
  async activate(context) {
    const catalogs = { image: IMAGE_MODELS, video: VIDEO_MODELS, text: TEXT_MODELS, audio: AUDIO_MODELS };
    context.services.register<ModelCatalogService>('ui.generation.catalog', Object.freeze<ModelCatalogService>({
      list: (kind) => structuredClone(catalogs[kind]), displayName: modelDisplayName,
    }));
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
      const availability = trackBrowserResource(context, installAgentModelAvailability(sourceSettingsClient));
      context.services.register<GenerationPreparationService>('ui.generation.preparation', Object.freeze<GenerationPreparationService>({
        prepare: prepareCanvasGenerationRequest,
        sources: (options) => sourceSettingsClient.getBlocks(options),
        availability: () => availability,
      }));
      context.services.register<GenerationUiService>('ui.generation', Object.freeze({
        concurrency: getGenerationConcurrency,
        mountSettings: (host: HTMLElement) => mountSourceSettings(host, sourceSettingsClient),
      }));
      const imageModes = trackBrowserResource(context, installImageModeAdapter());
      const videoModes = trackBrowserResource(context, installVideoModeAdapter());
      const imageReferences = trackBrowserResource(context, installMidjourneyReferenceAdapter());
      context.services.register<GenerationInteractionService>('ui.generation.interaction', Object.freeze<GenerationInteractionService>({
        imageModes: () => imageModes,
        videoModes: () => videoModes,
        imageReferences: () => imageReferences,
        mountModelPicker: (host, options) => mountModelPicker(host, sourceSettingsClient, { ...options, currentName: options.currentName ?? '' }),
        externalReferences: externalReferenceMedia, generateImage,
        interruptedPatch: interruptedGenerationPatch, registerWorkflowRecoveryOwner,
      }));
      trackBrowserResource(context, installImageResultHistory());
      trackBrowserResource(context, installGenerationScheduler());
      trackBrowserResource(context, installGenerationRecovery());
      trackBrowserResource(context, installModelPricing(sourceSettingsClient));
    });
  },
};
export default definePlugin(plugin);

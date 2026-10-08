import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installPromptAssistant } from './ui/prompt/promptAssistant';
import { installPromptExpand } from './ui/prompt/promptExpand';
import { installPromptPresets, expandPromptTags } from './ui/prompt/promptPresets';
import { composeCreativePrompt } from './ui/prompt/creativePresets';
import { imageAnglePrompt } from './ui/prompt/imageAngle';
import type { PromptCompositionService } from '../contracts/browserCapabilities';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.prompt',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.project': '^1.0.0' },
    capabilities: ['ui.prompt'],
    services: { provides: ['ui.prompt.composition'] },
  },
  async activate(context) {
    context.services.register<PromptCompositionService>('ui.prompt.composition', Object.freeze({
      compose: composeCreativePrompt,
      imageAngle: imageAnglePrompt,
      expandTags: expandPromptTags,
    }));
    await activateBrowserModule(context, async () => {
      trackBrowserResource(context, installPromptAssistant());
      trackBrowserResource(context, installPromptExpand());
      trackBrowserResource(context, installPromptPresets());
    });
  },
};
export default definePlugin(plugin);

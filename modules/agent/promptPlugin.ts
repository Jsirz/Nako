import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installPromptAssistant } from './ui/prompt/promptAssistant';
import { installPromptExpand } from './ui/prompt/promptExpand';
import { installPromptPresets } from './ui/prompt/promptPresets';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.prompt',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.project': '^1.0.0' },
    capabilities: ['ui.prompt'],
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      trackBrowserResource(context, installPromptAssistant());
      trackBrowserResource(context, installPromptExpand());
      trackBrowserResource(context, installPromptPresets());
    });
  },
};
export default plugin;

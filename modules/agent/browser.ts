import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installAgentClient } from './ui/agent/agentClient';
import { createAgentConversation } from './ui/agent/agentConversation';
import { installDramaCanvasBridge } from './ui/agent/dramaCanvasBridge';
import { installDramaConversationShortcut } from './ui/agent/dramaConversationShortcut';
import { installDramaConversationTools } from './ui/agent/dramaConversationTools';
import { installStoryboardClient } from './ui/storyboard/storyboardClient';
import { installAgentSkillClient } from './ui/skills/skillClient';
import { installSkillCommunity } from './ui/skills/skillCommunity';

import { agentSurfaces } from './ui/agent/surfaces';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.agent',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.project': '^1.0.0' },
    capabilities: ['ui.agent'],
    services: { provides: ['ui.agent.surfaces'] },
  },
  async activate(context) {
    context.services.register('ui.agent.surfaces', agentSurfaces);
    await activateBrowserModule(context, async () => {
      const dramaCanvasBridge = trackBrowserResource(context, installDramaCanvasBridge());
      trackBrowserResource(context, installAgentClient());
      const agentSkillClient = trackBrowserResource(context, installAgentSkillClient());
      trackBrowserResource(context, installSkillCommunity(agentSkillClient));
      const agentConversation = createAgentConversation(() => dramaCanvasBridge.projectId());
      trackBrowserResource(
        context,
        installDramaConversationShortcut(dramaCanvasBridge, agentConversation),
      );
      trackBrowserResource(
        context,
        installDramaConversationTools(dramaCanvasBridge, agentConversation),
      );
      trackBrowserResource(context, installStoryboardClient());
    });
  },
};
export default plugin;

import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
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
import { agentCanvasService } from './ui/agent/canvasWorkspaceService';

import { readAgentDocument } from './ui/agent/agentDocuments';
import type { AgentDocumentService } from '../contracts/agentDocuments';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.agent',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.project': '^1.0.0' },
    capabilities: ['ui.agent'],
    services: { provides: ['ui.agent.surfaces', 'ui.agent.canvas', 'ui.agent.documents'], requires: ['ui.generation', 'ui.generation.catalog', 'ui.generation.preparation', 'ui.nodes.runs', 'ui.canvas.editing', 'ui.canvas.presentation', 'ui.project.catalog', 'ui.media.canvas', 'ui.local-runtime'] },
  },
  async activate(context) {
    context.services.register<AgentDocumentService>('ui.agent.documents', Object.freeze({ read: readAgentDocument }));
    context.services.register('ui.agent.canvas', agentCanvasService);
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
export default definePlugin(plugin);

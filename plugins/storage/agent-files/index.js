import path from 'node:path';
import {createPromptPresetStore} from './promptPresetStore.js';
import { createHarnessSessionStore } from './harnessSessionStore.js';
import { createDramaExecutionStore } from './dramaExecutionStore.js';
import { createAgentSkillLibrary } from './agentSkillLibrary.js';
import { readOfficialDramaInstructions } from './skillInstructions.js';
import { createAgentWorkspaceStore, createAgentWorkspaceRouter } from './agentWorkspaceStore.js';
import { createGenerationPlanStore, createGenerationPlanRouter } from './generationPlanStore.js';
import { createGenerationBudgetStore, createGenerationBudgetRouter } from './generationBudgetStore.js';
import { createDramaPlanStore } from './dramaPlanStore.js';
export function createAgentPersistencePlugin({ libraryDirectory, privateDirectory }) {
  return {
    manifest: { id: 'storage.agent-files', version: '1.0.0', apiVersion: '^1.0.0', type: 'storage',
      services: { provides: ['agent.persistence', 'agent.skills'] }, capabilities: ['agent.persistence', 'agent.skills'], reloadRequired: true },
    async activate(context) {
      const skills = createAgentSkillLibrary({ libraryDirectory, privateDirectory });
      await skills.initialize();
      context.services.register('agent.skills', skills);
      context.services.register('agent.persistence', Object.freeze({
        createAgentWorkspaceStore, createAgentWorkspaceRouter,
        createGenerationPlanStore, createGenerationPlanRouter,
        createGenerationBudgetStore, createGenerationBudgetRouter, createDramaPlanStore,
        createPromptPresetStore: () => createPromptPresetStore({libraryDirectory}),
        createSessionStore: () => createHarnessSessionStore({ privateDirectory: privateDirectory || path.join(path.dirname(libraryDirectory), 'private') }),
        readOfficialInstructions: readOfficialDramaInstructions,
        createExecutionStore: () => createDramaExecutionStore({ libraryDirectory,
          executionDirectory: path.join(privateDirectory || path.join(path.dirname(libraryDirectory), 'private'), 'agent-drama-executions') }),
      }));
    },
  };
}

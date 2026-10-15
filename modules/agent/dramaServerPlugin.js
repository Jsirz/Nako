import express from 'express';
import { defineApplicationPlugin } from '../kernel/application.js';
import { createDramaPlanRouter } from './server/agent/drama/dramaPlanRouter.js';
import { createDramaExecutionService } from './server/agent/drama/dramaExecutionService.js';
import { createDramaModelGenerator } from './server/agent/drama/dramaModelGenerator.js';
import { createDramaConversationService } from './server/agent/drama/dramaConversation.js';
import { compileDramaSegment, assertDramaObject, assertDramaPlanReviewable, requireDramaPlanId,
  requireDramaProjectId, requireDramaRevision, validateDramaPlan } from './server/agent/drama/dramaPlan.js';
import { createDramaScriptImportRouter } from './server/agent/drama/dramaScriptImport.js';
export default defineApplicationPlugin({
  id: 'module.agent.drama',
  dependencies: ['module.workflow-runtime', 'storage.agent-files', 'media.filesystem'],
  requires: [
    'workflow.execution',
    'agent.persistence',
    'media.generation',
    'media.agent',
    'generation.runtime',
    'generation.defaults',
    'generation.textTransport',
  ],
  provides: ['agent.drama'],
  activate(context) {
    const { paths: RUNTIME_PATHS, applicationContext } = context.services.get('host.runtime');
    const { createDramaPlanStore } = context.services.get('agent.persistence');
    const generationRuntime = context.services.get('generation.runtime');
    const executionWorkflowRuntime = context.services.get('workflow.execution');
    const dramaPlanStore = createDramaPlanStore({
      libraryDirectory: RUNTIME_PATHS.LIBRARY_DIR,
      validation: { assertDramaObject, assertDramaPlanReviewable, requireDramaPlanId,
        requireDramaProjectId, requireDramaRevision, validateDramaPlan },
    });

    const dramaExecutionService = createDramaExecutionService({
      saveMedia: context.services.get('media.generation').saveBuffer,
      planStore: dramaPlanStore,
      libraryDirectory: RUNTIME_PATHS.LIBRARY_DIR,
      executionStore: context.services.get('agent.persistence').createExecutionStore(),
      ...executionWorkflowRuntime.services,
      generationCoordinator: generationRuntime.coordinator,
      compileSegment: compileDramaSegment,
      appContext: applicationContext,
    });

    /** @type {import('../contracts/agentDrama').AgentDramaService} */
    const dramaService = Object.freeze({
      createConversation: (sessionStore) =>
        createDramaConversationService({
          sessionStore,
          planStore: dramaPlanStore,
          executionService: dramaExecutionService,
        }),
    });
    context.services.register('agent.drama', dramaService);
    const limited = express.Router();
    limited.use(createDramaScriptImportRouter());

    limited.use(
      '/api/agent/drama',
      createDramaPlanRouter({
        defaultModels: context.services.get('generation.defaults'),
        readInstructions: context.services.get('agent.persistence').readOfficialInstructions,
        libraryDirectory: RUNTIME_PATHS.LIBRARY_DIR,
        store: dramaPlanStore,
        generatePlan: createDramaModelGenerator({
          readImages: context.services.get('media.agent').imageContent,
          textTransport: context.services.get('generation.textTransport'),
          defaultModels: context.services.get('generation.defaults'),
        }),
        executionService: dramaExecutionService,
        applicationContext,
      }),
    );

    context.services.get('http.routes').contribute(context, limited, { phase: 10, order: 20 });
  },
});

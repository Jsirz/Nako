import { defineApplicationPlugin } from '../kernel/application.js';
import { USER_PROVIDER_SECRET_KEYS } from '../contracts/providerSecrets.js';
import express from 'express';
import crypto from 'crypto';
import { createAgentRouter } from './server/agent/agentRouter.js';
import { createNodeToolDispatch } from './server/harness/nodeTools.js';
import { createAgentArchiveService } from './server/harness/archive.js';
import { createAgentSkillRouter } from './server/agent/agentSkillRouter.js';
import { getWorkspacePaths } from '../project/api/server/workspace/workspacePaths.js';

export default defineApplicationPlugin({
  ...{
    id: 'module.agent',
    provides: ['agent.archive'],
    dependencies: ['module.agent.drama', 'storage.agent-files', 'media.filesystem', 'module.nodes'],
    requires: [
      'agent.drama',
      'generation.defaults',
      'agent.persistence',
      'agent.skills',
      'media.agent',
      'generation.textTransport',
      'nodes.runtime', 'node.registry',
    ],
  },
  async activate(context) {
    const {
      createAgentWorkspaceStore,
      createAgentWorkspaceRouter,
      createGenerationPlanStore,
      createGenerationPlanRouter,
      createGenerationBudgetStore,
      createGenerationBudgetRouter,
    } = context.services.get('agent.persistence');
    const { paths: RUNTIME_PATHS, applicationContext } = context.services.get('host.runtime');
    const routes = context.services.get('http.routes');
    const app = express.Router();
    routes.contribute(context, app);

    const agentSkillLibrary = context.services.get('agent.skills');
    const workspaceStore = createAgentWorkspaceStore(RUNTIME_PATHS.PRIVATE_DIR);
    const sessionStore = context.services.get('agent.persistence').createSessionStore();
    context.services.register('agent.archive', createAgentArchiveService({
      sessions: sessionStore, workspaces: workspaceStore,
    }));

    const getAgentCredentials = (providerName) =>
      context.services.get('generation.textTransport').credentials(providerName);

    app.use(
      '/api/agent/workspace',
      createAgentWorkspaceRouter(workspaceStore),
    );

    const generationPlans = createGenerationPlanStore(RUNTIME_PATHS.PRIVATE_DIR);

    app.use('/api/agent/plans', createGenerationPlanRouter(generationPlans));

    applicationContext.GENERATION_BUDGETS = createGenerationBudgetStore(RUNTIME_PATHS.PRIVATE_DIR, {
      getSourceFingerprint: () =>
        crypto
          .createHash('sha256')
          .update(
            JSON.stringify(
              [
                ...new Set([
                  ...USER_PROVIDER_SECRET_KEYS,
                  ...Object.keys(process.env).filter((key) =>
                    /(?:_BASE_URL|^RUNNINGHUB_|^TOS_)/.test(key),
                  ),
                ]),
              ]
                .sort()
                .map((key) => [key, process.env[key] || '']),
            ),
          )
          .digest('hex'),
    });

    app.use(
      '/api/agent/budgets',
      createGenerationBudgetRouter(applicationContext.GENERATION_BUDGETS),
    );

    app.use(
      createAgentRouter({
        dispatchNode: createNodeToolDispatch({ runs: context.services.get('nodes.runtime'), registry: context.services.get('node.registry'), scope: context.services.get('host.runtime').activeUserContext.identity.opaqueUserId }),
        mediaService: context.services.get('media.agent'),
        sessionStore,
        textTransport: context.services.get('generation.textTransport'),
        defaultModels: context.services.get('generation.defaults'),
        libraryDirectory: getWorkspacePaths().LIBRARY_DIR,
        skillLibrary: agentSkillLibrary,
        createDramaConversation: context.services.get('agent.drama').createConversation,
        applicationContext,
        getCredentials: getAgentCredentials,
        onHarness: (harness) => context.onDispose(() => harness.close()),
      }),
    );

    const parsers = express.Router();
    parsers.use('/api/agent', express.json({ limit: '32mb' }));
    routes.contribute(context, parsers, { phase: 10, order: 30 });
    const limited = express.Router();
    limited.use(createAgentSkillRouter({ skillLibrary: agentSkillLibrary }));

    routes.contribute(context, limited, { phase: 10, order: 20 });
  },
});

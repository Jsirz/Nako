import { defineApplicationPlugin } from '../kernel/application.js';
import { createGenerationService } from './server/generation/generationService.js';
import { createNodeModelService, createNodeModelObserver } from './server/generation/nodeModelService.js';
import { createGenerationRecoveryService } from './server/generation/generationRecoveryService.js';
import express from 'express';
import { createConfigRouter } from './server/routes/config.js';
import {
  createGenerationRouter,
  createImageGenerationService,
} from './server/routes/generation.js';
import { createModelSourceRouter } from './server/generation/modelSourceRouter.js';
import {
  createDefaultModelsService,
  createDefaultModelsRouter,
} from './server/generation/defaultModels.js';
import { createGenerationRuntime, publicGenerationTasks } from './server/generation/generationRuntime.js';
import { parseTimeToMs } from './timing.js';
import { getWorkspacePaths } from '../project/api/server/workspace/workspacePaths.js';

export default defineApplicationPlugin({
  ...{
    id: 'module.generation',
    dependencies: [
      'module.local-runtime',
      'module.identity-account',
      'storage.task-journal',
      'media.filesystem',
    ],
    requires: [
      'local.runtime',
      'generation.taskStore',
      'media.generation',
      'preferences.repository',
      'identity.providerCredentials',
    ],
    provides: ['generation.runtime', 'generation.defaults'],
  },
  async activate(context) {
    const {
      paths: RUNTIME_PATHS,
      applicationContext,
    } = context.services.get('host.runtime');
    const LOGS_DIR = RUNTIME_PATHS.LOGS_DIR;
    const routes = context.services.get('http.routes');
    const app = express.Router();
    routes.contribute(context, app);
    app.use('/api/config', createConfigRouter({ credentialStore: context.services.get('identity.providerCredentials'), logger: context.logger }));
    /** @type {import('../contracts/localRuntimeService').LocalRuntimeService} */
    const localRuntime = context.services.get('local.runtime');
    const getProviderConfiguration = (_request, options) => localRuntime.providerConfiguration(options);
    const defaultModels = createDefaultModelsService({
      repository: context.services.get('preferences.repository'),
      getProviderConfiguration,
    });
    context.services.register('generation.defaults', defaultModels);
    app.use('/api', createDefaultModelsRouter(defaultModels));
    const generationRuntime = createGenerationRuntime({
      taskStore: context.services.get('generation.taskStore'),
      parseTimeToMs: (timeEstimate) => parseTimeToMs(timeEstimate),
      logger: context.logger,
    });
    context.onDispose(() => generationRuntime.coordinator.dispose());

    applicationContext.LOGS_DIR = LOGS_DIR;


    applicationContext.TOS_BUCKET = process.env.TOS_BUCKET;

    applicationContext.TOS_ENDPOINT = process.env.TOS_ENDPOINT;

    applicationContext.TOS_REGION = process.env.TOS_REGION;

    applicationContext.HTTPS_PROXY = process.env.HTTPS_PROXY;

    Object.defineProperty(applicationContext, 'LIBRARY_DIR', {
      get: () => getWorkspacePaths().LIBRARY_DIR,
    });

    Object.defineProperty(applicationContext, 'LIBRARY_MEDIA_DIR', {
      get: () => getWorkspacePaths().LIBRARY_MEDIA_DIR,
    });

    const recoverTask = createGenerationRecoveryService({ generationCoordinator: generationRuntime.coordinator,
      mediaService: context.services.get('media.generation') });
    app.use(
      '/api',
      createGenerationRouter({
        mediaService: context.services.get('media.generation'),
        applicationContext,
        generationCoordinator: generationRuntime.coordinator,
        defaultModels,
        recoverTask,
      }),
    );

    app.use(
      '/api',
      createModelSourceRouter({
        getProviderConfiguration,
        logger: context.logger,
      }),
    );
    context.services.register(
      'generation.runtime',
      Object.freeze({
        ...publicGenerationTasks(generationRuntime),
        observeNode: createNodeModelObserver({ coordinator: generationRuntime.coordinator, recoverTask, applicationContext }),
        generateNode: createNodeModelService({ defaults: defaultModels, generate: createGenerationService({ applicationContext, mediaService: context.services.get('media.generation'), generationCoordinator: generationRuntime.coordinator, defaultModels }) }),
        generate: createGenerationService({ applicationContext, mediaService: context.services.get('media.generation'), generationCoordinator: generationRuntime.coordinator, defaultModels }),
        generateImage: createImageGenerationService({
          applicationContext,
          mediaService: context.services.get('media.generation'),
          generationCoordinator: generationRuntime.coordinator,
          defaultModels,
        }),
      }),
    );
  },
});

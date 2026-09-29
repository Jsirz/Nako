import { defineApplicationPlugin } from '../kernel/application.js';
import { createGenerationService } from './server/generation/generationService.js';
import { createNodeModelService, createNodeModelObserver } from './server/generation/nodeModelService.js';
import { createGenerationRecoveryService } from './server/generation/generationRecoveryService.js';
import { USER_PROVIDER_SECRET_KEYS } from '../contracts/providerSecrets.js';
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
import { createGenerationRuntime } from './server/generation/generationRuntime.js';
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
    app.use('/api/config', createConfigRouter());
    const { dreaminaCliInstaller, libTvCli } = context.services.get('local.runtime');
    const getProviderConfiguration = async (_request, { waitForFresh = true } = {}) => {
      if (waitForFresh)
        await Promise.all([dreaminaCliInstaller.isAuthenticated(), libTvCli.isAuthenticated()]);
      return {
        LibTvCliImageProvider: libTvCli.getCachedAuthentication(),
        LibTvCliVideoProvider: libTvCli.getCachedAuthentication(),
        DreaminaCliImageProvider: dreaminaCliInstaller.getCachedAuthentication(),
        DreaminaCliVideoProvider: dreaminaCliInstaller.getCachedAuthentication(),
      };
    };
    const defaultModels = createDefaultModelsService({
      repository: context.services.get('preferences.repository'),
      getProviderConfiguration,
    });
    context.services.register('generation.defaults', defaultModels);
    app.use('/api', createDefaultModelsRouter(defaultModels));
    const generationRuntime = createGenerationRuntime({
      taskStore: context.services.get('generation.taskStore'),
      parseTimeToMs: (timeEstimate) => parseTimeToMs(timeEstimate),
    });

    applicationContext.LOGS_DIR = LOGS_DIR;

    for (const key of USER_PROVIDER_SECRET_KEYS) {
      Object.defineProperty(applicationContext, key, { get: () => process.env[key] });
    }

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
      }),
    );
    context.services.register(
      'generation.runtime',
      Object.freeze({
        ...generationRuntime,
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

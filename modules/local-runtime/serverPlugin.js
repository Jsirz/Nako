import { defineApplicationPlugin } from '../kernel/application.js';
import { createLibTvCliRuntime, createLibTvCliRouter } from './server/local/libTvCliRuntime.js';
import { RUNTIME_PATHS } from '../project/api/server/workspace/runtimePaths.js';
import express from 'express';
import path from 'path';
import { comfyClient } from './server/comfyui/comfyClient.js';
import { WORKFLOW_REGISTRY } from './server/comfyui/workflowRegistry.js';
import { createComfyWorkflowRouter } from './server/comfyui/comfyWorkflowRouter.js';
import { createLegacyComfyGenerationRouter } from './server/comfyui/legacyComfyGenerationRouter.js';
import { createLocalRuntimeRouter } from './server/local/localRuntimeRouter.js';
import {
  probeComfyReady,
  probeComfyServer,
  probeNvidiaGpu,
} from './server/local/localRuntimeProbes.js';
import { createComfyProcessController } from './server/local/comfyProcess.js';
import { createComfyExtensionInstaller } from './server/local/comfyExtensionInstaller.js';
import { createDreaminaCliInstaller } from './server/local/dreaminaCliInstaller.js';
import {
  BASE_LIBRARY_DIR,
  getWorkspacePaths,
  getUrlPrefix,
} from '../project/api/server/workspace/workspacePaths.js';

export default defineApplicationPlugin({
  ...{
    id: 'module.local-runtime',
    dependencies: ['module.asset-media'],
    requires: ['media.projectFiles'],
    provides: ['local.runtime'],
  },
  async activate(context) {
    const {
      paths: RUNTIME_PATHS,
      applicationContext,
      version: PRODUCT_VERSION,
      port: PORT,
      authentication: authenticationConfiguration,
      activeUserContext,
    } = context.services.get('host.runtime');
    const BASE_LIBRARY_DIR = RUNTIME_PATHS.LIBRARY_DIR;
    const LOGS_DIR = RUNTIME_PATHS.LOGS_DIR;
    const routes = context.services.get('http.routes');
    const app = express.Router();
    routes.contribute(context, app);
    const { saveMediaToFile } = context.services.get('media.projectFiles');
    const comfyProcessController = createComfyProcessController({
      // 就绪判定只看 /system_stats：ComfyUI 刚起来时 /object_info 要 6 秒、5.7MB，
      // 拿它判存活会把「已就绪」误判成「未运行」。
      probeComfy: (serverUrl) => probeComfyReady(serverUrl),
    });

    const comfyExtensionInstaller = createComfyExtensionInstaller({
      sourceDirectory: path.join(RUNTIME_PATHS.INTEGRATIONS_DIR, 'comfyui', 'nako_node_ids'),
      detectInstallation: () => comfyProcessController.detect(),
      getProcessState: () => comfyProcessController.getState(),
    });

    const dreaminaCliInstaller = createDreaminaCliInstaller({
      // CLI 和 OAuth 状态都跟随服务端选定的 opaque user id，不能落到共享 app/ 或全局 HOME。
      installRoot: path.join(RUNTIME_PATHS.PRIVATE_DIR, 'tools', 'dreamina-cli'),
    });

    applicationContext.DREAMINA_CLI = dreaminaCliInstaller;

    const libTvCli = createLibTvCliRuntime({
      privateDirectory: path.join(RUNTIME_PATHS.PRIVATE_DIR, 'tools', 'libtv-cli'),
    });

    applicationContext.LIBTV_CLI = libTvCli;

    app.use('/api/local-runtime/libtv-cli', createLibTvCliRouter(libTvCli));

    app.use(
      '/api',
      createLocalRuntimeRouter({
        modelsDirectory: process.env.LOCAL_MODELS_DIR || RUNTIME_PATHS.MODELS_DIR,
        workflowRegistry: WORKFLOW_REGISTRY,
        getComfyServerUrl: () => process.env.COMFYUI_SERVER_URL || '127.0.0.1:8188',
        probeGpu: () => probeNvidiaGpu(),
        probeComfy: (serverUrl) => probeComfyServer(serverUrl),
        comfyProcess: comfyProcessController,
        comfyExtensionInstaller,
        dreaminaCliInstaller,
      }),
    );

    app.use(
      '/api',
      createComfyWorkflowRouter({
        libraryDirectory: getWorkspacePaths().LIBRARY_DIR,
        workflowRegistry: WORKFLOW_REGISTRY,
        comfyClient,
      }),
    );

    app.use(
      createLegacyComfyGenerationRouter({
        workflowRegistry: WORKFLOW_REGISTRY,
        comfyProcessController,
        comfyClient,
        saveMediaToFile,
        logger: context.logger,
      }),
    );
    /** @type {import('../contracts/localRuntimeService').LocalRuntimeService} */
    const localRuntime = Object.freeze({
      async providerConfiguration({ waitForFresh = true } = {}) {
        if (waitForFresh)
          await Promise.all([dreaminaCliInstaller.isAuthenticated(), libTvCli.isAuthenticated()]);
        return {
          LibTvCliImageProvider: libTvCli.getCachedAuthentication(),
          LibTvCliVideoProvider: libTvCli.getCachedAuthentication(),
          DreaminaCliImageProvider: dreaminaCliInstaller.getCachedAuthentication(),
          DreaminaCliVideoProvider: dreaminaCliInstaller.getCachedAuthentication(),
        };
      },
    });
    context.services.register('local.runtime', localRuntime);
    context.onDispose(async () => {
      await comfyProcessController.stop();
      delete applicationContext.DREAMINA_CLI;
      delete applicationContext.LIBTV_CLI;
    });
  },
});

import { defineApplicationPlugin } from '../kernel/application.js';
import express from 'express';
import { createExecutionWorkflowRuntime } from './server/workflowRuntime/executionWorkflowRuntime.js';

export default defineApplicationPlugin({
  ...{
    id: 'module.workflow-runtime',
    dependencies: ['module.generation', 'workflow-runtime'],
    requires: ['generation.runtime', 'workflow.executors', 'platform.paths', 'media.runtime', 'identity.externalUrlFetch', 'local.runtime'],
    provides: ['workflow.execution'],
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
    const generationRuntime = context.services.get('generation.runtime');
    const executionWorkflowRuntime = await createExecutionWorkflowRuntime({
      libraryDirectory: BASE_LIBRARY_DIR,
      privateDirectory: RUNTIME_PATHS.PRIVATE_DIR,
      generationRuntime,
      executorRegistry: context.services.get('workflow.executors'),
    });
    routes.contribute(context, executionWorkflowRuntime.router, { phase: 10, order: 10 });
    context.services.register('workflow.execution', executionWorkflowRuntime);
  },
});

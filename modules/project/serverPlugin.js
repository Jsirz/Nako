import { defineApplicationPlugin } from '../kernel/application.js';
import { RUNTIME_PATHS } from './server/workspace/runtimePaths.js';
import express from 'express';
import path from 'path';
import { createWorkflowRouter } from './server/workflow/workflowRouter.js';
import { createWorkflowSnapshotWriter } from './server/workflow/workflowSnapshot.js';
import { createFolderRouter } from './server/project/folderRouter.js';
import { createProjectTransferRouter } from './server/project/projectTransferRouter.js';
import {
  BASE_LIBRARY_DIR,
  getWorkspacePaths,
  getUrlPrefix,
} from './server/workspace/workspacePaths.js';

export default defineApplicationPlugin({
  ...{
    id: 'module.project',
    dependencies: ['storage.sqlite', 'module.asset-media'],
    requires: ['project.repository', 'media.projectFiles'],
    provides: ['project.snapshots'],
    optional: ['agent.archive'],
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
    const workflowStore = context.services.get('project.repository');
    const { sanitizeWorkflowNodes } = context.services.get('media.projectFiles');
    const writeProjectJsonSnapshot = createWorkflowSnapshotWriter({
      mediaDirectory: path.join(BASE_LIBRARY_DIR, 'media'),
    });

    async function syncFolderProjectCounts() {
      await workflowStore.syncFolderProjectCounts();
    }

    app.use(
      '/api/workflows',
      createWorkflowRouter({
        store: workflowStore,
        sanitizeNodes: (nodes, projectId) => sanitizeWorkflowNodes(nodes, projectId),
        writeSnapshot: writeProjectJsonSnapshot,
        syncFolderProjectCounts,
      }),
    );

    app.use(
      '/api/folders',
      createFolderRouter({
        store: workflowStore,
        writeSnapshot: writeProjectJsonSnapshot,
      }),
    );

    app.use(
      '/api',
      createProjectTransferRouter({
        getAgentArchive: () => context.services.optional('agent.archive'),
        store: workflowStore,
        libraryDirectory: getWorkspacePaths().LIBRARY_DIR,
        mediaDirectory: getWorkspacePaths().LIBRARY_MEDIA_DIR,
        writeSnapshot: writeProjectJsonSnapshot,
        sanitizeNodes: (nodes, projectId) => sanitizeWorkflowNodes(nodes, projectId),
        syncFolderProjectCounts,
      }),
    );
    await writeProjectJsonSnapshot.initialize?.();
    context.services.register('project.snapshots', writeProjectJsonSnapshot);
  },
});

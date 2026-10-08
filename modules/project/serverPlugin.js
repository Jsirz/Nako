import { defineApplicationPlugin } from '../kernel/application.js';
import express from 'express';
import path from 'path';
import { createWorkflowRouter } from './server/workflow/workflowRouter.js';
import { createWorkflowSnapshotWriter } from './server/workflow/workflowSnapshot.js';
import { createFolderRouter } from './server/project/folderRouter.js';
import { createProjectTransferRouter } from './server/project/projectTransferRouter.js';
import { createShowcaseArchiveCache } from './server/project/showcaseArchiveCache.js';
import { DEFAULT_MAX_ARCHIVE_BYTES, DEFAULT_MAX_ARCHIVE_ENTRIES } from './server/project/archiveCommon.js';
import { getWorkspacePaths } from './server/workspace/workspacePaths.js';

export default defineApplicationPlugin({
  ...{
    id: 'module.project',
    dependencies: ['storage.sqlite', 'module.asset-media'],
    requires: ['project.repository', 'project.directories', 'project.recovery', 'project.transactions', 'project.files', 'media.projectFiles'],
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
    const directories = context.services.get('project.directories');
    const recovery = context.services.get('project.recovery');
    const transactions = context.services.get('project.transactions');
    const files = context.services.get('project.files');
    const showcaseArchives = createShowcaseArchiveCache({
      files,
      shareDirectory: path.join(RUNTIME_PATHS.PUBLIC_DIR, 'share'),
      cacheDirectory: path.join(path.dirname(RUNTIME_PATHS.PRIVATE_DIR), 'cache', 'showcase'),
      maxArchiveBytes: DEFAULT_MAX_ARCHIVE_BYTES,
      maxArchiveEntries: DEFAULT_MAX_ARCHIVE_ENTRIES,
    });
    const { sanitizeWorkflowNodes } = context.services.get('media.projectFiles');
    const writeProjectJsonSnapshot = createWorkflowSnapshotWriter({
      mediaDirectory: path.join(BASE_LIBRARY_DIR, 'media'),
      files,
      logger: context.logger,
    });

    async function syncFolderProjectCounts() {
      await directories.syncFolderProjectCounts();
    }

    app.use(
      '/api/workflows',
      createWorkflowRouter({
        store: workflowStore,
        recovery,
        sanitizeNodes: (nodes, projectId) => sanitizeWorkflowNodes(nodes, projectId),
        writeSnapshot: writeProjectJsonSnapshot,
        syncFolderProjectCounts,
        logger: context.logger,
      }),
    );

    app.use(
      '/api/folders',
      createFolderRouter({
        store: workflowStore,
        directories,
        writeSnapshot: writeProjectJsonSnapshot,
        logger: context.logger,
      }),
    );

    app.use(
      '/api',
      createProjectTransferRouter({
        showcaseArchives,
        getAgentArchive: () => context.services.optional('agent.archive'),
        store: workflowStore,
        directories,
        transactions,
        files,
        libraryDirectory: getWorkspacePaths().LIBRARY_DIR,
        mediaDirectory: getWorkspacePaths().LIBRARY_MEDIA_DIR,
        writeSnapshot: writeProjectJsonSnapshot,
        sanitizeNodes: (nodes, projectId) => sanitizeWorkflowNodes(nodes, projectId),
        syncFolderProjectCounts,
        logger: context.logger,
      }),
    );
    await writeProjectJsonSnapshot.initialize?.();
    context.services.register('project.snapshots', writeProjectJsonSnapshot);
  },
});

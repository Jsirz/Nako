import { createProjectRepository } from '../../../modules/project/index.js';
import path from 'node:path';
export function createSqlitePlugin(options) {
  return {
    manifest: { id: 'storage.sqlite', version: '1.0.0', apiVersion: '^1.0.0', type: 'storage',
      services: { provides: ['project.repository'] }, capabilities: ['project.persistence'], reloadRequired: true },
    async activate(context) {
      const { SQLiteWorkflowStore } = await import('./workflowStore.js');
      const store = new SQLiteWorkflowStore({ ...options, dbPath: options.dbPath || path.join(options.libraryDir, 'workflows.db') });
      context.onDispose(() => store.close());
      await store.init();
      context.services.register('project.repository', createProjectRepository(store));
    },
  };
}

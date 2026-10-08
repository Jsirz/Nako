import { createSqliteProjectServices } from './projectRepository.js';
import path from 'node:path';
export function createSqlitePlugin(options) {
  return {
    manifest: { id: 'storage.sqlite', version: '1.0.0', apiVersion: '^1.0.0', type: 'storage',
      services: { provides: ['project.repository', 'project.directories', 'project.recovery', 'project.transactions', 'project.files'] }, capabilities: ['project.persistence'], reloadRequired: true },
    async activate(context) {
      const { SQLiteWorkflowStore } = await import('./workflowStore.js');
      const store = new SQLiteWorkflowStore({ ...options, dbPath: options.dbPath || path.join(options.libraryDir, 'workflows.db') });
      context.onDispose(() => store.close());
      await store.init();
      const services = createSqliteProjectServices(store);
      context.services.register('project.repository', services.repository);
      context.services.register('project.directories', services.directories);
      context.services.register('project.recovery', services.recovery);
      context.services.register('project.transactions', services.transactions);
      const { createProjectFileStore } = await import('./projectFileStore.js');
      context.services.register('project.files', createProjectFileStore());
    },
  };
}

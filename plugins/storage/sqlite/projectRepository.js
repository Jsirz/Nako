import { AsyncLocalStorage } from 'node:async_hooks';
import { PluginError } from '../../../modules/contracts/index.js';
import { ProjectError, PROJECT_ERRORS } from '../../../modules/contracts/projectErrors.js';

/** Serialize access to the shared connection, including atomic catalog imports. */
export function createSqliteProjectServices(store) {
  const active = new AsyncLocalStorage();
  let queue = Promise.resolve();
  function execute(operation, task) {
    const run = async () => {
      try {
        return await task();
      } catch (cause) {
        if (cause instanceof PluginError) throw cause;
        throw new ProjectError(PROJECT_ERRORS.storage, '项目存储操作失败。', {
          cause, context: { moduleId: 'storage.sqlite', operation }
        });
      }
    };
    if (active.getStore()?.open) return run();
    const result = queue.then(() => {
      const scope = { open: true };
      return active.run(scope, () => run().finally(() => { scope.open = false; }));
    });
    queue = result.catch(() => undefined);
    return result;
  }
  return {
    repository: Object.freeze({
      get: id => execute('get', () => store.getWorkflowById(id)),
      list: () => execute('list', () => store.listWorkflows()),
      save: project => execute('save', () => store.saveWorkflow(project)),
      delete: id => execute('delete', async () => { await store.deleteWorkflow(id); }),
    }),
    directories: Object.freeze({
      listFolders: () => execute('listFolders', () => store.listFolders()),
      getFolderById: id => execute('getFolderById', () => store.getFolderById(id)),
      saveFolder: folder => execute('saveFolder', () => store.saveFolder(folder)),
      deleteFolder: id => execute('deleteFolder', () => store.deleteFolder(id)),
      clearFolderReferences: id => execute('clearFolderReferences', () => store.clearFolderReferences(id)),
      syncFolderProjectCounts: () => execute('syncFolderProjectCounts', () => store.syncFolderProjectCounts()),
    }),
    recovery: Object.freeze({
      createWorkflowRecoveryPoint: (id, reason) => execute('createRecovery', () => store.createWorkflowRecoveryPoint(id, reason)),
      listWorkflowRecoveryPoints: id => execute('listRecovery', () => store.listWorkflowRecoveryPoints(id)),
      restoreWorkflowRecoveryPoint: (id, point) => execute('restoreRecovery', () => store.restoreWorkflowRecoveryPoint(id, point)),
      getStartupRecoveryReport: () => store.getStartupRecoveryReport(),
      listWorkflowQuarantine: () => execute('listQuarantine', () => store.listWorkflowQuarantine()),
    }),
    transactions: Object.freeze({
      runInTransaction: operation => execute('catalogTransaction', () => store.runInTransaction(operation)),
    }),
  };
}

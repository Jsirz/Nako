/** Public project repository; the application never sees a SQLite connection. */
export function createProjectRepository(store, { sanitizeNodes = nodes => nodes } = {}) {
  const extensions = ['init', 'close', 'getWorkflowById', 'saveWorkflow', 'deleteWorkflow', 'listWorkflows',
    'createWorkflowRecoveryPoint', 'getStartupRecoveryReport', 'listWorkflowQuarantine', 'renameWorkflow',
    'moveWorkflow', 'updateWorkflowCover', 'listWorkflowRecoveryPoints', 'restoreWorkflowRecoveryPoint',
    'syncFolderProjectCounts', 'getSchemaVersion', 'listFolders', 'createFolder', 'updateFolder', 'deleteFolder',
    'getFolderById', 'renameFolder', 'moveFolder', 'saveFolder', 'getProjectReferences',
    'clearFolderReferences', 'exportLibraryCatalog', 'runInTransaction'];
  const repository = {
    get: id => store.getWorkflowById(id), list: () => store.listWorkflows(),
    save: project => store.saveWorkflow(project, { sanitizeNodes }),
    delete: async id => { await store.deleteWorkflow(id); },
  };
  for (const name of extensions) if (typeof store[name] === 'function') repository[name] = store[name].bind(store);
  return Object.freeze(repository);
}

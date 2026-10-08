import { ERRORS, PluginError } from '../../../contracts/index.js';

export function validateSharedProject(workflow) {
  const invalid = () => {
    throw new PluginError(ERRORS.invalidProjectArchive, '画布工作流节点或分组数据无效。', {
      context: { moduleId: 'project', operation: 'validateSharedProject', projectId: workflow.id },
    });
  };
  if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.groups)) invalid();
  for (const collection of [workflow.nodes, workflow.groups]) {
    const ids = new Set();
    for (const item of collection) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id)) invalid();
      ids.add(item.id);
    }
  }
  for (const node of workflow.nodes) {
    if (typeof node.type !== 'string' || !node.type || !Number.isFinite(node.x) || !Number.isFinite(node.y)) invalid();
    if (node.parentIds !== undefined && (!Array.isArray(node.parentIds) || node.parentIds.some(id => typeof id !== 'string'))) invalid();
  }
  for (const group of workflow.groups) {
    if (group.nodeIds !== undefined && (!Array.isArray(group.nodeIds) || group.nodeIds.some(id => typeof id !== 'string'))) invalid();
  }
  if (workflow.viewport !== undefined) {
    const v = workflow.viewport;
    if (!v || ![v.x, v.y, v.zoom].every(Number.isFinite) || v.zoom <= 0) invalid();
  }
}

// Imported graphs are new work, never authorization to observe or resume the sender's runs.
export function resetSharedProject(workflow, projectId) {
  validateSharedProject(workflow);
  const result = structuredClone(workflow);
  const sourceId = workflow.id;
  const rehome = value => {
    if (!value || typeof value !== 'object') return;
    if (value.projectId === sourceId) value.projectId = projectId;
    for (const child of Object.values(value)) rehome(child);
  };
  rehome(result);
  result.id = projectId;
  result.revision = 0;
  result.folderId = null;
  result.status = 'work';
  for (const key of ['createdAt', 'updatedAt', 'lastSavedAt', 'lastSavedBy', 'createBackup']) delete result[key];
  result.nodes = result.nodes.map(node => {
    node.projectId = projectId;
    for (const key of ['nodeRunId', 'nodeRequestId', 'generationAttemptId', 'generationStartedAt', 'generationStartTime',
      'generationDiagnosticCode', 'localWorkflowOperationId', 'mediaOperationId', 'uploadPending', 'errorMessage']) delete node[key];
    if (node.executionState) node.executionState = { status: 'idle' };
    if (typeof node.resultUrl === 'string' && node.resultUrl.startsWith('blob:')) delete node.resultUrl;
    if (['loading', 'queued'].includes(node.status)) node.status = node.resultUrl ? 'success' : 'idle';
    return node;
  });
  return result;
}

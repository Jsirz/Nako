import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import type { CanvasWorkflowProps, WorkflowRecord } from '../../../contracts/projectWorkflow';
import type { LoadedCanvasProject } from '../../../contracts/canvasServiceBindings';

export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export function content(document: WorkflowRecord) {
  return {
    title: document.title,
    nodes: document.nodes,
    groups: document.groups,
    viewport: document.viewport,
    isMinimapOpen: document.isMinimapOpen,
  };
}
export function stale(): ProjectError {
  return new ProjectError(PROJECT_ERRORS.stale, '画布已切换，忽略旧保存结果。', {
    context: { operation: 'workflowEpoch' },
  });
}
export function validateDocument(value: unknown, id?: string): LoadedCanvasProject {
  const invalid = (message: string, field: string) => new ProjectError(PROJECT_ERRORS.invalidDocument, message, {
    context: { operation: 'validateWorkflow', projectId: id, field },
  });
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid('项目数据格式无效。', 'document');
  const doc = value as LoadedCanvasProject;
  const revision = Number(doc.revision ?? 0);
  if (!Number.isSafeInteger(revision) || revision < 0) throw invalid('项目版本号无效。', 'revision');
  doc.revision = revision;
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.groups) || (id && doc.id !== id))
    throw invalid('项目数据或编号不匹配。', 'identity');
  for (const collection of [doc.nodes, doc.groups]) {
    const ids = new Set<string>();
    for (const item of collection) {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id))
        throw invalid('项目节点或分组编号无效。', 'id');
      ids.add(item.id);
    }
  }
  if (doc.viewport !== undefined) {
    const view = doc.viewport as CanvasWorkflowProps['viewport'];
    if (!view || ![view.x, view.y, view.zoom].every(Number.isFinite) || view.zoom <= 0)
      throw invalid('项目视口无效。', 'viewport');
  }
  return doc;
}
export async function request(url: string, init?: RequestInit): Promise<WorkflowRecord> {
  let response: Response;
  let body: WorkflowRecord;
  try {
    response = await fetch(url, init);
    body = await response.json();
  } catch (cause) {
    throw new ProjectError(PROJECT_ERRORS.request, '项目保存或读取失败。', {
      cause, context: { operation: 'workflowRequest', url },
    });
  }
  if (!response.ok) {
    throw new ProjectError(response.status === 409 ? PROJECT_ERRORS.revisionConflict : PROJECT_ERRORS.request,
      typeof body.error === 'string' ? body.error : '项目保存或读取失败。', {
        status: response.status, context: { operation: 'workflowRequest', url },
      });
  }
  return body;
}

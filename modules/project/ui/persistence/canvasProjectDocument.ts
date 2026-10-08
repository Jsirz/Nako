import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import { canvasProjectUi } from '../projectUiServices';
import type { ProjectDocument } from '../../../contracts/projectWorkflow';
export type { ProjectDocument } from '../../../contracts/projectWorkflow';
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A project file is a copy, never permission to resume the original paid run. */
export function parseProjectDocument(text: string, filename: string): ProjectDocument {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch (cause) {
    throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目 JSON 格式不正确。', { cause, context: { operation: 'parseProjectDocument', filename } });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目 JSON 格式不正确。', { context: { operation: 'parseProjectDocument', filename } });
  const doc = value as ProjectDocument;
  if (!Array.isArray(doc.nodes)) throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目 JSON 格式不正确：缺少 nodes 数组。', { context: { operation: 'parseProjectDocument', filename, field: 'nodes' } });
  if (doc.groups === undefined) doc.groups = [];
  if (!Array.isArray(doc.groups)) throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目分组数据无效。', { context: { operation: 'parseProjectDocument', filename, field: 'groups' } });
  for (const collection of [doc.nodes, doc.groups]) {
    const ids = new Set<string>();
    for (const item of collection) {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        typeof item.id !== 'string' ||
        !item.id ||
        ids.has(item.id)
      )
        throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目节点或分组编号无效。', { context: { operation: 'parseProjectDocument', filename, field: 'id' } });
      ids.add(item.id);
    }
  }
  for (const node of doc.nodes) {
    if (
      typeof node.type !== 'string' ||
      !node.type ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      (node.parentIds !== undefined &&
        (!Array.isArray(node.parentIds) || !node.parentIds.every((id) => typeof id === 'string')))
    )
      throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目节点数据无效。', { context: { operation: 'parseProjectDocument', filename, nodeId: node.id } });
  }
  for (const group of doc.groups) {
    if (
      group.nodeIds !== undefined &&
      (!Array.isArray(group.nodeIds) || !group.nodeIds.every((id) => typeof id === 'string'))
    )
      throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目分组成员无效。', { context: { operation: 'parseProjectDocument', filename, groupId: group.id } });
  }
  if (doc.viewport !== undefined) {
    const viewport = doc.viewport as { x: number; y: number; zoom: number };
    if (
      !viewport ||
      ![viewport.x, viewport.y, viewport.zoom].every(Number.isFinite) ||
      viewport.zoom <= 0
    )
      throw new ProjectError(PROJECT_ERRORS.invalidDocument, '项目视口无效。', { context: { operation: 'parseProjectDocument', filename, field: 'viewport' } });
  }
  doc.title =
    typeof doc.title === 'string' && doc.title.trim()
      ? doc.title.trim()
      : filename.replace(/\.json$/i, '') || 'Untitled';
  return doc;
}

export function copyProjectGraph(
  document: ProjectDocument,
  projectId: string | undefined,
  translation: { x: number; y: number },
  createId?: () => string,
) {
  const source = copy(document);
  const nodeIds = new Map<string, string>();
  const groupIds = new Map(
    source.groups.map((group) => [String(group.id), createId ? createId() : String(group.id)]),
  );
  let index = 0;
  const area = source.nodes.reduce(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.x),
      maxX: Math.max(bounds.maxX, node.x),
      minY: Math.min(bounds.minY, node.y),
      maxY: Math.max(bounds.maxY, node.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  // Use the same graph remapping as SKILL insertion. Zero-sized bounds express
  // the exact old import translation without requiring rendered node geometry.
  const nodes = source.nodes.length
    ? canvasProjectUi().instantiateWorkflowPreset(
        source.nodes,
        projectId,
        {
          x: (area.minX + area.maxX) / 2 + translation.x,
          y: (area.minY + area.maxY) / 2 + translation.y,
        },
        { width: () => 0, height: () => 0 },
        () => {
          const old = source.nodes[index++].id;
          const id = createId ? createId() : old;
          nodeIds.set(old, id);
          return id;
        },
      )
    : [];
  nodes.forEach((node, position) => {
    const groupId = source.nodes[position].groupId;
    node.groupId = typeof groupId === 'string' ? groupIds.get(groupId) : undefined;
  });
  const groups = source.groups.map((group) => ({
    ...group,
    id: groupIds.get(String(group.id))!,
    label: typeof group.label === 'string' ? group.label : '',
    nodeIds: Array.isArray(group.nodeIds)
      ? group.nodeIds.flatMap((id) => (nodeIds.has(String(id)) ? [nodeIds.get(String(id))!] : []))
      : nodes
          .filter((node) => node.groupId === groupIds.get(String(group.id)))
          .map((node) => node.id),
  }));
  // Normalize before recording history, avoiding a second cleanup edit for a
  // collapsed imported group after the document reaches the canvas.
  return canvasProjectUi().cleanupCanvasGroups({ nodes, groups });
}

export function freshProjectDocument(document: ProjectDocument, id: string): ProjectDocument {
  const result: ProjectDocument = {
    ...copy(document),
    ...copyProjectGraph(document, id, { x: 0, y: 0 }, () => crypto.randomUUID()),
    id,
    revision: 0,
    status: 'work',
    folderId: null,
  };
  for (const key of ['createdAt', 'updatedAt', 'lastSavedAt', 'lastSavedBy', 'createBackup'])
    delete result[key];
  return result;
}

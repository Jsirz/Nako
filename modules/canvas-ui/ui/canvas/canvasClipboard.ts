import { canvasError } from '../../../contracts/canvasErrors.js';
import { browserServices } from '../../../kernel/browser';
import { remapCanvasNodeReferences } from './canvasNodeReferences';
import { disconnectCanvasNodes } from './canvasConnections';

export interface CanvasClipboardNode {
  id: string;
  type: string;
  x: number;
  y: number;
  parentIds?: string[];
  groupId?: string;
  [key: string]: unknown;
}

export interface CloneCanvasNodesOptions {
  offset: number;
  createId: () => string;
  preserveParentConnections?: boolean;
  targetPoint?: { x: number; y: number };
}

export interface CanvasClipboardViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasClipboardBounds {
  left: number;
  top: number;
}

export interface InsertClonedCanvasNodesOptions {
  preserveChildConnections?: boolean;
}

export interface ClonedCanvasNodes<TNode extends CanvasClipboardNode> {
  newNodes: TNode[];
  idMap: Map<string, string>;
}

export interface StableCanvasClipboardAdapter {
  clone<TNode extends CanvasClipboardNode>(
    nodes: readonly TNode[],
    options: CloneCanvasNodesOptions,
  ): ClonedCanvasNodes<TNode>;
  insert<TNode extends CanvasClipboardNode>(
    nodes: readonly TNode[],
    newNodes: readonly TNode[],
    idMap: ReadonlyMap<string, string>,
    options?: InsertClonedCanvasNodesOptions,
  ): TNode[];
  delete<TNode extends CanvasClipboardNode>(
    nodes: readonly TNode[],
    nodeIds: readonly string[],
  ): TNode[];
  getDiagnostics(): { cloneCalls: number; deleteCalls: number; insertCalls: number };
}

declare global {
  interface Window {
    __NAKO_CANVAS_CLIPBOARD__?: StableCanvasClipboardAdapter;
  }
}

export const GENERATING_COPY_MESSAGE = '正在生成，请在生成后复制。';

export function hasGeneratingCanvasNodes(nodes: readonly CanvasClipboardNode[]): boolean {
  return nodes.some((node) => ['loading', 'queued'].includes(String(node.status)));
}

function isDetachedCopyNode(node: Pick<CanvasClipboardNode, 'type'> & Record<string, unknown>): boolean {
  return (
    node.type === 'Text' ||
    node.type.startsWith('Upload ') ||
    node.kind === 'asset' ||
    node.category === 'asset'
  );
}

function preservesExternalUpstream(node: Pick<CanvasClipboardNode, 'type'>): boolean {
  return node.type === 'Image' || node.type === 'Video';
}

function sourcePortIndexAt(node: CanvasClipboardNode, index: number): number {
  const sourcePortIndices = node.sourcePortIndices;
  if (!Array.isArray(sourcePortIndices)) return 0;
  const value = Number(sourcePortIndices[index]);
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function cloneParentConnections(
  node: CanvasClipboardNode,
  idMap: ReadonlyMap<string, string>,
  preserveInternalConnections: boolean,
  detachedSourceIds: ReadonlySet<string>,
): Pick<CanvasClipboardNode, 'parentIds'> & Record<string, unknown> {
  const parentIds = node.parentIds ?? [];
  if (isDetachedCopyNode(node)) {
    return {
      parentIds: [],
      ...(node.sourcePortIndices !== undefined ? { sourcePortIndices: [] } : {}),
    };
  }
  const copiedParentId = (parentId: string) => {
    const mappedId = idMap.get(parentId);
    return mappedId && !detachedSourceIds.has(parentId)
      ? mappedId
      : undefined;
  };
  if (node.type === 'ComfyUI') {
    const nextParentIds = parentIds.map((parentId) =>
      preserveInternalConnections ? copiedParentId(parentId) ?? '' : '',
    );
    return {
      parentIds: nextParentIds,
      // ComfyUI input slots are positional, so external parents become empty slots.
      sourcePortIndices: nextParentIds.map((parentId, index) =>
        parentId ? sourcePortIndexAt(node, index) : 0,
      ),
    };
  }

  const retainedParents = preserveInternalConnections
    ? parentIds.flatMap((parentId, index) => {
        const mappedId = copiedParentId(parentId);
        const retainedId = mappedId || (preservesExternalUpstream(node) ? parentId : undefined);
        return retainedId
          ? [{ id: retainedId, sourcePortIndex: sourcePortIndexAt(node, index) }]
          : [];
      })
    : [];
  const result: Pick<CanvasClipboardNode, 'parentIds'> & Record<string, unknown> = {
    parentIds: retainedParents.map((parent) => parent.id),
  };
  if (node.sourcePortIndices !== undefined)
    result.sourcePortIndices = retainedParents.map((parent) => parent.sourcePortIndex);
  return result;
}

function cloneChildConnections<TNode extends CanvasClipboardNode>(
  node: TNode,
  idMap: ReadonlyMap<string, string>,
): TNode {
  if (isDetachedCopyNode(node)) return node;
  if (Array.isArray(node.inputLinks)) {
    const inputLinks = node.inputLinks as Array<Record<string, unknown>>;
    const copiedLinks = inputLinks.flatMap((link, index) => {
      const sourceNodeId = typeof link.sourceNodeId === 'string' ? link.sourceNodeId : undefined;
      const copiedSourceNodeId = sourceNodeId ? idMap.get(sourceNodeId) : undefined;
      return copiedSourceNodeId
        ? [{ link: { ...link, sourceNodeId: copiedSourceNodeId }, sourcePortIndex: sourcePortIndexAt(node, index) }]
        : [];
    });
    if (!copiedLinks.length) return node;
    const nextLinks = [...inputLinks, ...copiedLinks.map((item) => item.link)];
    return {
      ...node,
      inputLinks: nextLinks,
      parentIds: nextLinks.flatMap((link) =>
        typeof link.sourceNodeId === 'string' ? [link.sourceNodeId] : [],
      ),
      sourcePortIndices: [
        ...inputLinks.map((_, index) => sourcePortIndexAt(node, index)),
        ...copiedLinks.map((item) => item.sourcePortIndex),
      ],
    };
  }

  const parentIds = node.parentIds ?? [];
  const copiedParents = parentIds.flatMap((parentId, index) => {
    const copiedParentId = idMap.get(parentId);
    return copiedParentId && !parentIds.includes(copiedParentId)
      ? [{ id: copiedParentId, sourcePortIndex: sourcePortIndexAt(node, index) }]
      : [];
  });
  if (!copiedParents.length) return node;
  const nextParentIds = [...parentIds, ...copiedParents.map((parent) => parent.id)];
  return {
    ...node,
    parentIds: nextParentIds,
    ...(node.sourcePortIndices !== undefined
      ? {
          sourcePortIndices: [
            ...parentIds.map((_, index) => sourcePortIndexAt(node, index)),
            ...copiedParents.map((parent) => parent.sourcePortIndex),
          ],
        }
      : {}),
  };
}

export function cloneCanvasNodes<TNode extends CanvasClipboardNode>(
  nodes: readonly TNode[],
  options: CloneCanvasNodesOptions,
): ClonedCanvasNodes<TNode> {
  if (hasGeneratingCanvasNodes(nodes)) throw canvasError(GENERATING_COPY_MESSAGE, 'clipboard.clone');
  const idMap = new Map(nodes.map((node) => [node.id, options.createId()]));
  const detachedSourceIds = new Set(nodes.filter(isDetachedCopyNode).map((node) => node.id));
  const origin = nodes.reduce(
    (current, node) => ({
      x: Math.min(current.x, node.x),
      y: Math.min(current.y, node.y),
    }),
    { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
  );
  const targetPoint = options.targetPoint;
  const translation =
    targetPoint && Number.isFinite(targetPoint.x) && Number.isFinite(targetPoint.y)
      ? { x: targetPoint.x - origin.x, y: targetPoint.y - origin.y }
      : { x: options.offset, y: options.offset };
  const newNodes = nodes.map((node) => {
    const clonedNode = {
      ...node,
      ...(node.localWorkflowOperationId || node.generationAttemptId || node.nodeRunId || node.nodeRequestId ||
      ['loading', 'queued'].includes(String(node.status))
        ? {
            localWorkflowOperationId: undefined,
            generationAttemptId: undefined,
            nodeRunId: undefined, nodeRequestId: undefined,
            generationStartTime: undefined,
            generationDiagnosticCode: undefined,
            progress: undefined,
            status: node.resultUrl ? 'success' : 'idle',
            errorMessage: undefined,
          }
        : {}),
      ...remapCanvasNodeReferences(node, id =>
        options.preserveParentConnections
          ? idMap.get(id) && !detachedSourceIds.has(id)
            ? idMap.get(id)
            : preservesExternalUpstream(node)
              ? id
              : undefined
          : undefined,
      ),
      id: idMap.get(node.id)!,
      x: node.x + translation.x,
      y: node.y + translation.y,
      ...cloneParentConnections(
        node,
        idMap,
        options.preserveParentConnections === true,
        detachedSourceIds,
      ),
    };
    delete clonedNode.groupId;
    return clonedNode;
  });
  return { newNodes, idMap };
}

export function pointerToCanvasPoint(
  pointer: { clientX: number; clientY: number } | undefined,
  viewport: CanvasClipboardViewport,
  bounds: CanvasClipboardBounds = { left: 0, top: 0 },
): { x: number; y: number } | undefined {
  if (!pointer || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return undefined;
  return {
    x: (pointer.clientX - bounds.left - viewport.x) / viewport.zoom,
    y: (pointer.clientY - bounds.top - viewport.y) / viewport.zoom,
  };
}

export function insertClonedCanvasNodes<TNode extends CanvasClipboardNode>(
  nodes: readonly TNode[],
  newNodes: readonly TNode[],
  idMap: ReadonlyMap<string, string>,
  options: InsertClonedCanvasNodesOptions = {},
): TNode[] {
  const copiedSourceIds = new Set(
    newNodes.filter((node) => !isDetachedCopyNode(node)).map((node) => node.id),
  );
  const childConnectionMap = new Map(
    [...idMap.entries()].filter(([, copiedId]) => copiedSourceIds.has(copiedId)),
  );
  const existingNodes = options.preserveChildConnections
    ? nodes.map((node) => cloneChildConnections(node, childConnectionMap))
    : nodes;
  return [...existingNodes, ...newNodes];
}

export function deleteCanvasNodes<TNode extends CanvasClipboardNode>(
  nodes: readonly TNode[],
  nodeIds: readonly string[],
): TNode[] {
  const deletedNodeIds = new Set(nodeIds);
  if (!nodes.some((node) => deletedNodeIds.has(node.id))) return nodes as TNode[];

  let remaining = nodes.filter((node) => !deletedNodeIds.has(node.id));
  for (const node of remaining) {
    for (const parentId of new Set(node.parentIds ?? [])) {
      if (deletedNodeIds.has(parentId))
        remaining = disconnectCanvasNodes(remaining, { parentId, childId: node.id });
    }
  }
  return remaining;
}

export function installStableCanvasClipboard(): StableCanvasClipboardAdapter {
  if (browserServices.__NAKO_CANVAS_CLIPBOARD__) return browserServices.__NAKO_CANVAS_CLIPBOARD__;
  let cloneCalls = 0;
  let deleteCalls = 0;
  let insertCalls = 0;
  const adapter: StableCanvasClipboardAdapter = {
    clone(nodes, options) {
      const cloned = cloneCanvasNodes(nodes, options);
      if (cloned.newNodes.length > 0) cloneCalls += 1;
      return cloned;
    },
    insert(nodes, newNodes, idMap, options) {
      const nextNodes = insertClonedCanvasNodes(nodes, newNodes, idMap, options);
      if (newNodes.length > 0) insertCalls += 1;
      return nextNodes;
    },
    delete(nodes, nodeIds) {
      const nextNodes = deleteCanvasNodes(nodes, nodeIds);
      if (nextNodes !== nodes) deleteCalls += 1;
      return nextNodes;
    },
    getDiagnostics() {
      return { cloneCalls, deleteCalls, insertCalls };
    },
  };
  Object.freeze(adapter);
  browserServices.__NAKO_CANVAS_CLIPBOARD__ = adapter;
  return adapter;
}

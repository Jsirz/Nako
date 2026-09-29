import { remapCanvasNodeReferences } from './canvasNodeReferences';
import type * as React from 'react';
import type { CanvasNode } from '../nodes/canvasNodeOperations';
import type { CanvasViewport } from './canvasNavigation';
import { interruptedMediaNode } from '../../../asset-media/api/ui/media/mediaOperationRecovery';

type Hooks = Pick<typeof React, 'useRef' | 'useEffect'>;
type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
interface PresetOptions {
  viewport: CanvasViewport;
  projectId?: string;
  enabled: boolean;
  setNodes: Setter<CanvasNode[]>;
  setSelectedNodeIds: Setter<string[]>;
  closeWorkflowPresetPanel: () => void;
}
interface PresetRuntime {
  width: (node: CanvasNode) => number;
  height: (node: CanvasNode) => number;
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function bounds(nodes: CanvasNode[], runtime: Pick<PresetRuntime, 'width' | 'height'>) {
  const minX = Math.min(...nodes.map((node) => node.x)),
    minY = Math.min(...nodes.map((node) => node.y));
  return {
    minX,
    minY,
    width: Math.max(...nodes.map((node) => node.x + runtime.width(node))) - minX,
    height: Math.max(...nodes.map((node) => node.y + runtime.height(node))) - minY,
  };
}
/** A preset is a fresh graph: remap every known reference, preserve fixed input holes,
 * and never borrow an in-flight task identity from the original project. */
export function instantiateWorkflowPreset(
  input: unknown,
  projectId: string | undefined,
  center: { x: number; y: number },
  runtime: Pick<PresetRuntime, 'width' | 'height'>,
  createId: () => string = () => crypto.randomUUID(),
): CanvasNode[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error('工作流内容为空');
  const nodes = copy(input) as CanvasNode[];
  const ids = new Set<string>();
  for (const node of nodes) {
    if (
      !node ||
      typeof node.id !== 'string' ||
      !node.id ||
      ids.has(node.id) ||
      typeof node.type !== 'string' ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y)
    )
      throw new Error('工作流节点数据无效');
    ids.add(node.id);
  }
  const area = bounds(nodes, runtime),
    translation = {
      x: center.x - area.minX - area.width / 2,
      y: center.y - area.minY - area.height / 2,
    };
  const idMap = new Map(nodes.map((node) => [node.id, createId()]));
  return nodes.map((source) => {
    const node = interruptedMediaNode(source);
    const parents = Array.isArray(node.parentIds) ? node.parentIds : [];
    const indexed = node.type === 'ComfyUI' || node.kind === 'workflow';
    const indices = parents
      .map((_, index) => index)
      .filter((index) => indexed || idMap.has(parents[index]));
    const result: CanvasNode = {
      ...node,
      id: idMap.get(node.id)!,
      projectId,
      groupId: undefined,
      x: node.x + translation.x,
      y: node.y + translation.y,
      parentIds: indices.map((index) => idMap.get(parents[index]) || ''),
      sourcePortIndices: Array.isArray(node.sourcePortIndices)
        ? indices.map((index) =>
            idMap.has(parents[index]) ? (node.sourcePortIndices![index] ?? 0) : 0,
          )
        : undefined,
      ...remapCanvasNodeReferences(node, id => idMap.get(id)),
      generationAttemptId: undefined,
      nodeRunId: undefined, nodeRequestId: undefined,
      localWorkflowOperationId: undefined,
      generationStartedAt: undefined,
      generationStartTime: undefined,
      generationDiagnosticCode: undefined,
      executionState: node.kind === 'workflow' ? { status: 'idle' } : node.executionState,
      status:
        node.status === 'loading' || node.status === 'queued'
          ? node.resultUrl
            ? 'success'
            : 'idle'
          : node.status || 'success',
    };
    return result;
  });
}

export function useCanvasWorkflowPresets(
  hooks: Hooks,
  options: PresetOptions,
  runtime: PresetRuntime,
) {
  const live = hooks.useRef(options);
  live.current = options;
  const epochRef = hooks.useRef(0);
  hooks.useEffect(() => {
    epochRef.current++;
    return () => {
      epochRef.current++;
    };
  }, [options.enabled, options.projectId]);
  const valid = (epoch: number, projectId: string | undefined) =>
    epoch === epochRef.current && live.current.enabled && live.current.projectId === projectId;
  return {
    async handleImportWorkflowPreset(preset: { id: string }) {
      const current = live.current;
      if (!current.enabled) return;
      const epoch = epochRef.current,
        projectId = current.projectId;
      const response = await fetch('/api/library/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: preset.id, projectId }),
      });
      if (!response.ok) throw new Error('导入工作流失败');
      const data = await response.json();
      if (!valid(epoch, projectId)) return;
      const viewport = live.current.viewport;
      const nodes = instantiateWorkflowPreset(
        data.workflow?.nodes,
        projectId,
        {
          x: (window.innerWidth / 2 - viewport.x) / viewport.zoom,
          y: (window.innerHeight / 2 - viewport.y) / viewport.zoom,
        },
        runtime,
      );
      current.setNodes((existing) => [...existing, ...nodes]);
      current.setSelectedNodeIds(nodes.map((node) => node.id));
      current.closeWorkflowPresetPanel();
    },
  };
}

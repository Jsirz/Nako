import type { WorkflowCanvasNodesAdapter } from '../../../contracts/workflowCanvasNodeProtocol';

import { registerWorkflowRecoveryOwner } from '../../../generation-core/api/ui/generation/workflowRecoveryBoundary';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import { normalizeSelectParameterValues } from './workflowNodeParameters';
import { canvasRunningHubInstanceType, finiteNumber } from './workflowNodePresentation';
import { expandWorkflowStorageSlots, workflowInputSlotKey } from './workflowNodeSlots';
import type { CanvasNode } from './workflowNodeTypes';

export function createWorkflowNodeStructure(
  context: WorkflowCanvasOperationContext,
): Pick<WorkflowCanvasNodesAdapter, 'createNode' | 'updateNode' | 'reconcileNode'> {
  return {
    createNode: createNode.bind(null, context),
    updateNode: updateNode.bind(null, context),
    reconcileNode: reconcileNode.bind(null, context),
  };
}

function createNode(
  context: WorkflowCanvasOperationContext,
  ...[blueprint, position = {}]: Parameters<WorkflowCanvasNodesAdapter['createNode']>
): ReturnType<WorkflowCanvasNodesAdapter['createNode']> {
  void context;

  const slotCount = expandWorkflowStorageSlots(blueprint as unknown as CanvasNode).length;
  return {
    id: crypto.randomUUID(),
    type: 'ComfyUI',
    kind: 'workflow',
    comfyMode: 'nako-workflow',
    x: finiteNumber(position.x, 160, -1_000_000, 1_000_000),
    y: finiteNumber(position.y, 140, -1_000_000, 1_000_000),
    width: finiteNumber(blueprint.ui.width, 600, 520, 760),
    height: 520,
    title: blueprint.title,
    coverUrl: blueprint.coverUrl,
    subtitle: blueprint.subtitle,
    executionTarget:
      blueprint.executionTarget === 'cloud' ||
      (!blueprint.executionTarget && /runninghub/i.test(blueprint.subtitle))
        ? 'cloud'
        : 'local',
    ...(blueprint.executionTarget === 'cloud' || /runninghub/i.test(blueprint.subtitle)
      ? {
          runningHubInstanceType: canvasRunningHubInstanceType(blueprint.runningHubInstanceType),
        }
      : {}),
    canvasNodeHash: blueprint.canvasNodeHash,
    workflowRef: structuredClone(blueprint.workflowRef),
    inputPorts: structuredClone(blueprint.inputPorts),
    outputPorts: structuredClone(blueprint.outputPorts),
    parameterSchema: structuredClone(blueprint.parameterSchema),
    parameterValues: structuredClone(blueprint.parameterValues),
    parentIds: new Array(slotCount).fill(''),
    sourcePortIndices: new Array(slotCount).fill(0),
    status: 'idle',
    executionState: { status: 'idle' },
    workflowOutputs: [],
  };
}

function updateNode(
  context: WorkflowCanvasOperationContext,
  ...[node, blueprint]: Parameters<WorkflowCanvasNodesAdapter['updateNode']>
): ReturnType<WorkflowCanvasNodesAdapter['updateNode']> {
  const { adapter } = context;

  const next = adapter.createNode(blueprint, { x: node.x, y: node.y });
  const previousSlots = expandWorkflowStorageSlots(node as unknown as CanvasNode);
  const nextSlots = expandWorkflowStorageSlots(next as unknown as CanvasNode);
  const previousByKey = new Map(
    previousSlots.map((slot) => [workflowInputSlotKey(slot), slot.slotIndex]),
  );
  const parentIds = nextSlots.map((slot) => {
    const previousIndex = previousByKey.get(workflowInputSlotKey(slot));
    return previousIndex === undefined ? '' : node.parentIds[previousIndex] || '';
  });
  const sourcePortIndices = nextSlots.map((slot) => {
    const previousIndex = previousByKey.get(workflowInputSlotKey(slot));
    return previousIndex === undefined ? 0 : node.sourcePortIndices[previousIndex] || 0;
  });
  const parameterValues = { ...next.parameterValues };
  for (const parameter of next.parameterSchema) {
    if (Object.hasOwn(node.parameterValues || {}, parameter.key)) {
      parameterValues[parameter.key] = node.parameterValues[parameter.key];
    }
  }
  normalizeSelectParameterValues(next.parameterSchema, parameterValues);
  return {
    ...node,
    ...next,
    id: node.id,
    x: node.x,
    y: node.y,
    parentIds,
    sourcePortIndices,
    parameterValues,
    status: 'idle',
    executionState: { status: 'idle' },
    workflowOutputs: [],
    resultUrl: undefined,
    resultUrls: undefined,
    resultText: undefined,
    errorMessage: undefined,
    errorSummary: undefined,
    isWorkflowErrorDetailsOpen: false,
    ...(next.executionTarget === 'cloud'
      ? {
          runningHubInstanceType: canvasRunningHubInstanceType(
            node.runningHubInstanceType || next.runningHubInstanceType,
          ),
        }
      : {}),
    isWorkflowParametersOpen: node.isWorkflowParametersOpen,
  };
}

function reconcileNode(
  context: WorkflowCanvasOperationContext,
  ...[node]: Parameters<WorkflowCanvasNodesAdapter['reconcileNode']>
): ReturnType<WorkflowCanvasNodesAdapter['reconcileNode']> {
  const { adapter, client, reconciliations } = context;

  registerWorkflowRecoveryOwner(node.id);
  const definitionId = node.workflowRef?.definitionId;
  const bindingSetId = node.workflowRef?.bindingSetId;
  const attestationId = node.workflowRef?.attestationId;
  const deploymentId = node.workflowRef?.deploymentId;
  if (!definitionId || !bindingSetId || (!attestationId && !deploymentId)) {
    return Promise.resolve(null);
  }
  const reconciliationKey = JSON.stringify([
    definitionId,
    bindingSetId,
    attestationId,
    deploymentId,
    node.canvasNodeHash,
    node.executionTarget,
    node.title,
  ]);
  const existing = reconciliations.get(reconciliationKey);
  if (existing)
    return existing.then((blueprint) =>
      blueprint
        ? blueprint.canvasNodeHash === node.canvasNodeHash
          ? { ...node, coverUrl: blueprint.coverUrl }
          : adapter.updateNode(node, blueprint)
        : null,
    );
  const promise = (async () => {
    const bindingSets = await client.listBindingSets(definitionId);
    const bindingSetsById = new Map(bindingSets.map((bindingSet) => [bindingSet.id, bindingSet]));
    if (!bindingSetsById.has(bindingSetId)) return null;
    const isDescendant = (candidateId: string): boolean => {
      const visited = new Set<string>();
      let currentId: string | null | undefined = candidateId;
      while (currentId && !visited.has(currentId)) {
        if (currentId === bindingSetId) return true;
        visited.add(currentId);
        currentId = bindingSetsById.get(currentId)?.previousBindingSetId;
      }
      return false;
    };
    const latest = bindingSets
      .filter((bindingSet) => isDescendant(bindingSet.id))
      .sort((left, right) => right.revision - left.revision)[0];
    if (!latest) return null;
    if (latest.id === bindingSetId && node.executionTarget !== 'cloud') return null;
    const blueprint = await client.createCanvasNode(definitionId, {
      ...(attestationId ? { attestationId } : { deploymentId }),
      bindingSetId: latest.id,
      title: node.title,
    });
    if (blueprint.canvasNodeHash === node.canvasNodeHash && blueprint.coverUrl === node.coverUrl)
      return null;
    return blueprint;
  })().finally(() => reconciliations.delete(reconciliationKey));
  reconciliations.set(reconciliationKey, promise);
  return promise.then((blueprint) =>
    blueprint
      ? blueprint.canvasNodeHash === node.canvasNodeHash
        ? { ...node, coverUrl: blueprint.coverUrl }
        : adapter.updateNode(node, blueprint)
      : null,
  );
}

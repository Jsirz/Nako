import type {
  WorkflowCanvasNodeRecord,
  WorkflowCanvasNodesAdapter,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import {
  WORKFLOW_EXAMPLE_MAX_NODES,
  WORKFLOW_EXAMPLE_NODE_TYPES,
  WorkflowExampleBundle,
  WorkflowExampleInputBinding,
  WorkflowExampleNodeTemplate,
  exampleNodeData,
  saveWorkflowExampleBundles,
} from './workflowNodeExamples';
import { finiteNumber, mediaKindForNode, mediaKindsCompatible } from './workflowNodePresentation';
import { expandWorkflowStorageSlots, workflowInputSlotKey } from './workflowNodeSlots';
import type { CanvasNode } from './workflowNodeTypes';

export function createWorkflowExampleOperations(
  context: WorkflowCanvasOperationContext,
): Pick<WorkflowCanvasNodesAdapter, 'captureExample' | 'hasExample' | 'instantiateExample'> {
  return {
    captureExample: captureExample.bind(null, context),
    hasExample: hasExample.bind(null, context),
    instantiateExample: instantiateExample.bind(null, context),
  };
}

function captureExample(
  context: WorkflowCanvasOperationContext,
  ...[nodes, workflowNodeId]: Parameters<WorkflowCanvasNodesAdapter['captureExample']>
): ReturnType<WorkflowCanvasNodesAdapter['captureExample']> {
  const { exampleBundles } = context;

  const workflowNode = nodes.find(
    (node): node is CanvasNode & WorkflowCanvasNodeRecord =>
      node.id === workflowNodeId && node.kind === 'workflow',
  );
  const definitionId = workflowNode?.workflowRef?.definitionId;
  if (!workflowNode || typeof definitionId !== 'string' || !definitionId) return false;

  const templates: WorkflowExampleNodeTemplate[] = [];
  const templateIdsByNodeId = new Map<string, string>();
  const parents = Array.isArray(workflowNode.parentIds) ? workflowNode.parentIds : [];
  const sourcePortIndices = Array.isArray(workflowNode.sourcePortIndices)
    ? workflowNode.sourcePortIndices
    : [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const slots = expandWorkflowStorageSlots(workflowNode);
  const inputBindings: WorkflowExampleInputBinding[] = [];

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const parentId = parents[slotIndex];
    const parent = parentId ? byId.get(parentId) : undefined;
    if (!parent || !WORKFLOW_EXAMPLE_NODE_TYPES.has(parent.type)) continue;
    let templateId = templateIdsByNodeId.get(parent.id);
    if (!templateId) {
      if (templates.length >= WORKFLOW_EXAMPLE_MAX_NODES) break;
      templateId = `input-${templates.filter((item) => item.role === 'input').length}`;
      templateIdsByNodeId.set(parent.id, templateId);
      templates.push({
        templateId,
        role: 'input',
        type: parent.type,
        relativeX: finiteNumber(parent.x, 0, -20_000, 20_000) - workflowNode.x,
        relativeY: finiteNumber(parent.y, 0, -20_000, 20_000) - workflowNode.y,
        data: exampleNodeData(parent),
      });
    }
    inputBindings.push({
      slotKey: workflowInputSlotKey(slots[slotIndex]),
      templateId,
      sourcePortIndex: Math.max(0, Math.trunc(Number(sourcePortIndices[slotIndex]) || 0)),
    });
  }

  for (const child of nodes) {
    if (templates.length >= WORKFLOW_EXAMPLE_MAX_NODES) break;
    if (
      !WORKFLOW_EXAMPLE_NODE_TYPES.has(child.type) ||
      !Array.isArray(child.parentIds) ||
      !child.parentIds.includes(workflowNode.id) ||
      typeof child.workflowSourcePortId !== 'string'
    ) {
      continue;
    }
    templates.push({
      templateId: `output-${templates.filter((item) => item.role === 'output').length}`,
      role: 'output',
      type: child.type,
      relativeX: finiteNumber(child.x, 0, -20_000, 20_000) - workflowNode.x,
      relativeY: finiteNumber(child.y, 0, -20_000, 20_000) - workflowNode.y,
      outputPortId: child.workflowSourcePortId,
      data: exampleNodeData(child),
    });
  }

  if (templates.length === 0) return false;
  const bundle: WorkflowExampleBundle = {
    schemaVersion: 1,
    definitionId,
    capturedAt: Date.now(),
    nodes: templates,
    inputBindings,
  };
  const previous = exampleBundles.get(definitionId);
  exampleBundles.set(definitionId, bundle);
  if (!saveWorkflowExampleBundles(exampleBundles)) {
    if (previous) exampleBundles.set(definitionId, previous);
    else exampleBundles.delete(definitionId);
    return false;
  }
  return true;
}

function hasExample(
  context: WorkflowCanvasOperationContext,
  ...[definitionId]: Parameters<WorkflowCanvasNodesAdapter['hasExample']>
): ReturnType<WorkflowCanvasNodesAdapter['hasExample']> {
  const { exampleBundles } = context;

  return exampleBundles.has(definitionId);
}

function instantiateExample(
  context: WorkflowCanvasOperationContext,
  ...[blueprint, position = {}, sourceNodes = []]: Parameters<
    WorkflowCanvasNodesAdapter['instantiateExample']
  >
): ReturnType<WorkflowCanvasNodesAdapter['instantiateExample']> {
  const { adapter, exampleBundles } = context;

  const bundle = exampleBundles.get(blueprint.workflowRef.definitionId);
  const anchorX = finiteNumber(position.x, 160, -1_000_000, 1_000_000);
  const anchorY = finiteNumber(position.y, 140, -1_000_000, 1_000_000);
  if (!bundle || bundle.nodes.length === 0) {
    const node = adapter.createNode(blueprint, { x: anchorX, y: anchorY });
    const availableSources = [...sourceNodes]
      .filter((source) => source.id !== node.id && Boolean(mediaKindForNode(source)))
      .sort(
        (left, right) =>
          finiteNumber(left.y, 0, -1_000_000, 1_000_000) -
            finiteNumber(right.y, 0, -1_000_000, 1_000_000) ||
          finiteNumber(left.x, 0, -1_000_000, 1_000_000) -
            finiteNumber(right.x, 0, -1_000_000, 1_000_000),
      );
    const usedSourceIds = new Set<string>();
    for (const slot of expandWorkflowStorageSlots(node)) {
      const source = availableSources.find(
        (candidate) =>
          !usedSourceIds.has(candidate.id) &&
          mediaKindsCompatible(mediaKindForNode(candidate), slot.mediaKind),
      );
      if (!source) continue;
      node.parentIds[slot.slotIndex] = source.id;
      node.sourcePortIndices[slot.slotIndex] = 0;
      usedSourceIds.add(source.id);
    }
    return { nodes: [node], selectedNodeIds: [node.id], restoredExample: false };
  }

  const minimumX = Math.min(0, ...bundle.nodes.map((node) => node.relativeX));
  const minimumY = Math.min(0, ...bundle.nodes.map((node) => node.relativeY));
  const workflowNode = adapter.createNode(blueprint, {
    x: anchorX - minimumX,
    y: anchorY - minimumY,
  });
  const idsByTemplateId = new Map(
    bundle.nodes.map((template) => [template.templateId, crypto.randomUUID()]),
  );
  const inputNodes = bundle.nodes
    .filter((template) => template.role === 'input')
    .map((template) => ({
      ...structuredClone(template.data),
      id: idsByTemplateId.get(template.templateId)!,
      type: template.type,
      x: workflowNode.x + template.relativeX,
      y: workflowNode.y + template.relativeY,
      parentIds: [],
      sourcePortIndices: [],
    })) as CanvasNode[];
  const bindingBySlotKey = new Map(
    bundle.inputBindings.map((binding) => [binding.slotKey, binding]),
  );
  const freshSlots = expandWorkflowStorageSlots(workflowNode);
  workflowNode.parentIds = freshSlots.map((slot) => {
    const binding = bindingBySlotKey.get(workflowInputSlotKey(slot));
    return binding ? idsByTemplateId.get(binding.templateId) || '' : '';
  });
  workflowNode.sourcePortIndices = freshSlots.map((slot) => {
    const binding = bindingBySlotKey.get(workflowInputSlotKey(slot));
    return binding?.sourcePortIndex || 0;
  });

  const freshOutputPorts = new Map(workflowNode.outputPorts.map((port, index) => [port.id, index]));
  const outputNodes = bundle.nodes
    .filter((template) => template.role === 'output')
    .flatMap((template) => {
      const portIndex = template.outputPortId
        ? freshOutputPorts.get(template.outputPortId)
        : undefined;
      if (portIndex === undefined) return [];
      return [
        {
          ...structuredClone(template.data),
          id: idsByTemplateId.get(template.templateId)!,
          type: template.type,
          x: workflowNode.x + template.relativeX,
          y: workflowNode.y + template.relativeY,
          parentIds: [workflowNode.id],
          sourcePortIndices: [portIndex],
          workflowSourcePortId: template.outputPortId,
        } as CanvasNode,
      ];
    });
  const restoredNodes: CanvasNode[] = [...inputNodes, workflowNode, ...outputNodes];
  return {
    nodes: restoredNodes,
    selectedNodeIds: restoredNodes.map((node) => node.id),
    restoredExample: true,
  };
}

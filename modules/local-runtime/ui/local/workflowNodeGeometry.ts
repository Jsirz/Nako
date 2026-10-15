import type { WorkflowCanvasNodesAdapter } from '../../../contracts/workflowCanvasNodeProtocol';

import { generationInteraction } from '../../../kernel/browser';
const registerWorkflowRecoveryOwner = (nodeId: unknown) => generationInteraction().registerWorkflowRecoveryOwner(nodeId);

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import {
  finiteNumber,
  isCloudWorkflowNode,
  isTextParameter,
  mediaKindForNode,
  outputPorts,
  parameterSchema,
  workflowErrorSummary,
  workflowMediaKindLabel,
} from './workflowNodePresentation';
import {
  compatibleWorkflowInputSlots,
  expandWorkflowInputSlots,
  expandWorkflowStorageSlots,
  resolveAvailableWorkflowInputSlot,
  workflowConnectionLimitNotice,
  workflowInputLimitNotice,
} from './workflowNodeSlots';
import type { CanvasNode } from './workflowNodeTypes';

export function expandedWorkflowHeight(node: CanvasNode): number {
  const parentIds = Array.isArray(node.parentIds) ? node.parentIds : [];
  const slots = expandWorkflowInputSlots(node).filter(
    (slot) => slot.source === 'input-port' || Boolean(parentIds[slot.slotIndex]),
  );
  const allParameters = parameterSchema(node);
  const primaryCloudTextParameter = isCloudWorkflowNode(node)
    ? allParameters.find((parameter) => /^prompt$/i.test(String(parameter.key || ''))) ||
      allParameters.find((parameter) => /提示词/.test(String(parameter.label || ''))) ||
      allParameters.find((parameter) =>
        /^(text|description)$/i.test(String(parameter.key || '')),
      ) ||
      allParameters.find(isTextParameter)
    : undefined;
  const parameters = primaryCloudTextParameter
    ? allParameters.filter((parameter) => parameter !== primaryCloudTextParameter)
    : allParameters;
  const slotRows = Math.ceil(slots.length / 2);
  const slotsHeight = 26 + (slots.length ? slotRows * 62 + Math.max(0, slotRows - 1) * 8 : 38);
  const parameterFieldsHeight = parameters.reduce(
    (total, parameter) => total + (isTextParameter(parameter) ? 62 : 44),
    0,
  );
  const parametersHeight = parameters.length
    ? 26 + parameterFieldsHeight + Math.max(0, parameters.length - 1) * 9
    : 48;
  const settingsSections = 3;
  const settingsHeight =
    32 + 57 + slotsHeight + parametersHeight + Math.max(0, settingsSections - 1) * 16 + 106;
  const errorHeight = workflowErrorHeight(node);
  const promptHeight = isCloudWorkflowNode(node) ? 166 : 0;
  return Math.max(520, Math.min(100_000, 64 + promptHeight + settingsHeight + errorHeight + 66));
}

export function workflowErrorHeight(node: CanvasNode): number {
  if (typeof node.errorMessage !== 'string' || !node.errorMessage) return 0;
  return node.isWorkflowErrorDetailsOpen ? 194 : 54;
}

export function compactWorkflowPortY(
  node: CanvasNode,
  visibleIndex: number,
  visibleCount: number,
): number {
  const height = 320 + workflowErrorHeight(node);
  const top = 92;
  const bottom = height - 88;
  return Math.round(top + ((visibleIndex + 1) / (visibleCount + 1)) * (bottom - top));
}

export function createWorkflowPortOperations(
  context: WorkflowCanvasOperationContext,
): Pick<
  WorkflowCanvasNodesAdapter,
  | 'getInputSlots'
  | 'getInputCapacity'
  | 'getInputLimitNotice'
  | 'getErrorSummary'
  | 'getInputPortY'
  | 'getOutputPortY'
  | 'getMediaKindLabel'
  | 'resolveAvailableInputSlot'
  | 'getConnectionLimitNotice'
  | 'resolvePortIndex'
  | 'getNodeSize'
  | 'getOutputMediaKind'
  | 'getPrimaryMediaKind'
  | 'canConnect'
> {
  return {
    getInputSlots: getInputSlots.bind(null, context),
    getInputCapacity: getInputCapacity.bind(null, context),
    getInputLimitNotice: workflowInputLimitNotice,
    getErrorSummary: getErrorSummary.bind(null, context),
    getInputPortY: getInputPortY.bind(null, context),
    getOutputPortY: getOutputPortY.bind(null, context),
    getMediaKindLabel: workflowMediaKindLabel,
    resolveAvailableInputSlot: resolveAvailableInputSlot.bind(null, context),
    getConnectionLimitNotice: getConnectionLimitNotice.bind(null, context),
    resolvePortIndex: resolvePortIndex.bind(null, context),
    getNodeSize: getNodeSize.bind(null, context),
    getOutputMediaKind: mediaKindForNode,
    getPrimaryMediaKind: getPrimaryMediaKind.bind(null, context),
    canConnect: canConnect.bind(null, context),
  };
}

function getInputSlots(
  context: WorkflowCanvasOperationContext,
  ...[node]: Parameters<WorkflowCanvasNodesAdapter['getInputSlots']>
): ReturnType<WorkflowCanvasNodesAdapter['getInputSlots']> {
  void context;

  registerWorkflowRecoveryOwner(node.id);
  return expandWorkflowInputSlots(node);
}

function getInputCapacity(
  context: WorkflowCanvasOperationContext,
  ...[node]: Parameters<WorkflowCanvasNodesAdapter['getInputCapacity']>
): ReturnType<WorkflowCanvasNodesAdapter['getInputCapacity']> {
  void context;

  return expandWorkflowStorageSlots(node).length;
}

function getErrorSummary(
  context: WorkflowCanvasOperationContext,
  ...[node]: Parameters<WorkflowCanvasNodesAdapter['getErrorSummary']>
): ReturnType<WorkflowCanvasNodesAdapter['getErrorSummary']> {
  void context;

  return workflowErrorSummary(node.errorMessage);
}

function getInputPortY(
  context: WorkflowCanvasOperationContext,
  ...[_node, portIndex]: Parameters<WorkflowCanvasNodesAdapter['getInputPortY']>
): ReturnType<WorkflowCanvasNodesAdapter['getInputPortY']> {
  void context;

  const slots = expandWorkflowInputSlots(_node);
  const index = slots.findIndex((slot) => slot.slotIndex === Math.max(0, Math.trunc(portIndex)));
  if (index < 0) return 242;
  if (!_node.isWorkflowParametersOpen) {
    return compactWorkflowPortY(_node, index, slots.length);
  }
  const slot = slots[index];
  if (slot?.source === 'parameter') {
    const textIndex = slots
      .slice(0, index)
      .filter((candidate) => candidate.source === 'parameter').length;
    return 126 + textIndex * 38;
  }
  const assetIndex = slots
    .slice(0, index)
    .filter((candidate) => candidate.source === 'input-port').length;
  return 242 + assetIndex * 59;
}

function getOutputPortY(
  context: WorkflowCanvasOperationContext,
  ...[_node, portIndex]: Parameters<WorkflowCanvasNodesAdapter['getOutputPortY']>
): ReturnType<WorkflowCanvasNodesAdapter['getOutputPortY']> {
  void context;

  if (!_node.isWorkflowParametersOpen) {
    const outputs = outputPorts(_node);
    const index = Math.min(Math.max(0, Math.trunc(portIndex)), Math.max(0, outputs.length - 1));
    return compactWorkflowPortY(_node, index, Math.max(1, outputs.length));
  }
  return 454 + Math.max(0, Math.trunc(portIndex)) * 34;
}

function resolveAvailableInputSlot(
  context: WorkflowCanvasOperationContext,
  ...[target, source, sourcePortIndex = 0]: Parameters<
    WorkflowCanvasNodesAdapter['resolveAvailableInputSlot']
  >
): ReturnType<WorkflowCanvasNodesAdapter['resolveAvailableInputSlot']> {
  void context;

  return resolveAvailableWorkflowInputSlot(target, source, sourcePortIndex);
}

function getConnectionLimitNotice(
  context: WorkflowCanvasOperationContext,
  ...[target, source, sourcePortIndex = 0]: Parameters<
    WorkflowCanvasNodesAdapter['getConnectionLimitNotice']
  >
): ReturnType<WorkflowCanvasNodesAdapter['getConnectionLimitNotice']> {
  void context;

  return workflowConnectionLimitNotice(target, source, sourcePortIndex);
}

function resolvePortIndex(
  context: WorkflowCanvasOperationContext,
  ...[node, side, localY]: Parameters<WorkflowCanvasNodesAdapter['resolvePortIndex']>
): ReturnType<WorkflowCanvasNodesAdapter['resolvePortIndex']> {
  const { adapter } = context;

  const slots = side === 'left' ? expandWorkflowInputSlots(node) : [];
  const count = side === 'left' ? slots.length : outputPorts(node).length;
  if (count === 0) return -1;
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < count; index += 1) {
    const y =
      side === 'left'
        ? adapter.getInputPortY(node, slots[index].slotIndex)
        : adapter.getOutputPortY(node, index);
    const candidateDistance = Math.abs(localY - y);
    if (candidateDistance < distance) {
      nearest = index;
      distance = candidateDistance;
    }
  }
  return side === 'left' ? slots[nearest].slotIndex : nearest;
}

function getNodeSize(
  context: WorkflowCanvasOperationContext,
  ...[node]: Parameters<WorkflowCanvasNodesAdapter['getNodeSize']>
): ReturnType<WorkflowCanvasNodesAdapter['getNodeSize']> {
  void context;

  const errorHeight = workflowErrorHeight(node);
  const progressHeight = node.status === 'loading' && !node.isWorkflowParametersOpen ? 44 : 0;
  return {
    width: finiteNumber(node.width, 600, 520, 760),
    height: node.isWorkflowParametersOpen
      ? expandedWorkflowHeight(node)
      : 320 + progressHeight + errorHeight,
  };
}

function getPrimaryMediaKind(
  context: WorkflowCanvasOperationContext,
  ...[node]: Parameters<WorkflowCanvasNodesAdapter['getPrimaryMediaKind']>
): ReturnType<WorkflowCanvasNodesAdapter['getPrimaryMediaKind']> {
  void context;

  const ports = outputPorts(node);
  return ports.find((port) => port.primary)?.mediaKind || ports[0]?.mediaKind;
}

function canConnect(
  context: WorkflowCanvasOperationContext,
  ...[target, source, targetPortIndex, sourcePortIndex = 0]: Parameters<
    WorkflowCanvasNodesAdapter['canConnect']
  >
): ReturnType<WorkflowCanvasNodesAdapter['canConnect']> {
  void context;

  const parents = Array.isArray(target.parentIds) ? target.parentIds : [];
  return compatibleWorkflowInputSlots(target, source, sourcePortIndex).some(
    (slot) =>
      slot.slotIndex === targetPortIndex &&
      (!parents[targetPortIndex] || parents[targetPortIndex] === source.id),
  );
}

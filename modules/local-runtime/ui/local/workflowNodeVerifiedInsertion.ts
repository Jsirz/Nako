import type {
  WorkflowCanvasInputSlot,
  WorkflowCanvasNodesAdapter,
  WorkflowVerifiedCanvasInsertion,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasMediaKind } from './workflowManagerClient';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import { safeExampleString } from './workflowNodeExamples';
import { finiteNumber } from './workflowNodePresentation';
import { receiptOutputs, runPatch } from './workflowNodeReceipts';
import { expandWorkflowStorageSlots } from './workflowNodeSlots';
import type { CanvasNode } from './workflowNodeTypes';
import { canvasNodeTypeForMedia } from './workflowNodeUpload';

export interface VerifiedAssetReference {
  assetId: string;
  projectId: string;
  type: WorkflowCanvasMediaKind;
  url?: string;
  filename?: string;
}

export function verifiedAssetReference(value: unknown): VerifiedAssetReference | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const assetId = safeExampleString(candidate.assetId, 200);
  const projectId = safeExampleString(candidate.projectId, 200);
  const type = safeExampleString(candidate.type, 20) as WorkflowCanvasMediaKind | undefined;
  if (
    !assetId ||
    !projectId ||
    !type ||
    !['image', 'mask', 'video', 'audio'].includes(type) ||
    /[\\/]/.test(assetId) ||
    /[\\/]/.test(projectId)
  )
    return undefined;
  const url = safeExampleString(candidate.url, 4_096);
  const filename = safeExampleString(candidate.filename, 500);
  return {
    assetId,
    projectId,
    type,
    ...(url && !url.startsWith('data:') ? { url } : {}),
    ...(filename ? { filename } : {}),
  };
}

export function verifiedAssetForSlot(
  value: unknown,
  itemIndex: number,
): VerifiedAssetReference | undefined {
  if (Array.isArray(value)) return verifiedAssetReference(value[itemIndex]);
  return itemIndex === 0 ? verifiedAssetReference(value) : undefined;
}

export function outputText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function createWorkflowVerifiedInsertion(
  context: WorkflowCanvasOperationContext,
): Pick<WorkflowCanvasNodesAdapter, 'instantiateVerifiedRun'> {
  return { instantiateVerifiedRun: instantiateVerifiedRun.bind(null, context) };
}

function createVerifiedInputNodes(
  anchorY: number,
  slots: WorkflowCanvasInputSlot[],
  verified: WorkflowVerifiedCanvasInsertion,
  anchorX: number,
) {
  const inputNodes: CanvasNode[] = [];
  const inputNodeBySlot = new Map<number, CanvasNode>();
  let inputY = anchorY;

  for (const slot of slots) {
    if (slot.source === 'parameter') {
      const raw = verified.values[slot.bindingKey];
      if (typeof raw !== 'string') continue;
      const node: CanvasNode = {
        id: crypto.randomUUID(),
        type: 'Text',
        x: anchorX,
        y: inputY,
        width: 520,
        height: 320,
        title: slot.label,
        prompt: raw,
        textContent: raw,
        status: 'success',
        parentIds: [],
        sourcePortIndices: [],
      };
      inputNodes.push(node);
      inputNodeBySlot.set(slot.slotIndex, node);
      inputY += 380;
      continue;
    }
    const reference = verifiedAssetForSlot(verified.values[slot.bindingKey], slot.itemIndex);
    if (!reference || reference.projectId !== verified.projectId) continue;
    const type = canvasNodeTypeForMedia(slot.mediaKind);
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      type,
      x: anchorX,
      y: inputY,
      width: 520,
      height: type === 'Upload Audio' ? 180 : 340,
      title: reference.filename || slot.label,
      prompt: reference.filename || slot.label,
      assetId: reference.assetId,
      projectId: reference.projectId,
      mediaType: slot.mediaKind,
      ...(reference.url ? { resultUrl: reference.url, url: reference.url } : {}),
      status: 'success',
      progress: 100,
      parentIds: [],
      sourcePortIndices: [],
    };
    inputNodes.push(node);
    inputNodeBySlot.set(slot.slotIndex, node);
    inputY += type === 'Upload Audio' ? 240 : 400;
  }
  return { inputNodes, inputNodeBySlot };
}

function instantiateVerifiedRun(
  context: WorkflowCanvasOperationContext,
  ...[blueprint, verified, position = {}]: Parameters<
    WorkflowCanvasNodesAdapter['instantiateVerifiedRun']
  >
): ReturnType<WorkflowCanvasNodesAdapter['instantiateVerifiedRun']> {
  const { adapter } = context;

  if (verified.run.status !== 'success' || !verified.run.receipt) {
    throw new Error('只有成功并已保存输出的测试记录才能直接生成完整画布节点。');
  }
  if (!verified.projectId) throw new Error('成功测试记录缺少项目标识。');
  const anchorX = finiteNumber(position.x, 160, -1_000_000, 1_000_000);
  const anchorY = finiteNumber(position.y, 140, -1_000_000, 1_000_000);
  const slots = expandWorkflowStorageSlots(blueprint as unknown as CanvasNode);
  const {
    inputNodes,
    inputNodeBySlot,
  }: { inputNodes: CanvasNode[]; inputNodeBySlot: Map<number, CanvasNode> } =
    createVerifiedInputNodes(anchorY, slots, verified, anchorX);

  const workflowX = anchorX + (inputNodes.length ? 680 : 0);
  const workflowNode = adapter.createNode(blueprint, { x: workflowX, y: anchorY });
  workflowNode.parameterValues = {
    ...workflowNode.parameterValues,
    ...structuredClone(verified.values),
  };
  workflowNode.parentIds = slots.map((slot) => inputNodeBySlot.get(slot.slotIndex)?.id || '');
  workflowNode.sourcePortIndices = slots.map(() => 0);
  Object.assign(workflowNode, runPatch(workflowNode, verified.run));

  const outputs = receiptOutputs(workflowNode, verified.run);
  const portIndexById = new Map(workflowNode.outputPorts.map((port, index) => [port.id, index]));
  const outputNodes = outputs.map((output, index): CanvasNode => {
    const type = canvasNodeTypeForMedia(output.mediaKind);
    const text = outputText(output.value);
    return {
      id: crypto.randomUUID(),
      type,
      x: workflowNode.x + workflowNode.width + 180,
      y: workflowNode.y + index * (type === 'Upload Audio' ? 240 : 400),
      width: 520,
      height: type === 'Text' ? 320 : type === 'Upload Audio' ? 180 : 340,
      title: output.label || '工作流结果',
      prompt: text || output.label || workflowNode.title,
      ...(type === 'Text' ? { textContent: text, resultText: text } : {}),
      ...(output.url ? { resultUrl: output.url, url: output.url } : {}),
      ...(output.assetId ? { assetId: output.assetId, projectId: verified.projectId } : {}),
      mediaType: output.mediaKind,
      status: 'success',
      progress: 100,
      parentIds: [workflowNode.id],
      sourcePortIndices: [portIndexById.get(output.portId) || 0],
      workflowSourceRunId: verified.run.runId,
      workflowSourcePortId: output.portId,
      model: workflowNode.title,
    };
  });
  const nodes: CanvasNode[] = [...inputNodes, workflowNode, ...outputNodes];
  return {
    nodes,
    selectedNodeIds: nodes.map((node) => node.id),
    restoredExample: true,
  };
}

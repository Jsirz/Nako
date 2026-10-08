import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { declaredNodeOutput } from '../../../contracts/nodeValues.js';
import type {
  WorkflowCanvasNodeRecord,
  WorkflowCanvasOutputValue,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasMediaKind } from './workflowManagerClient';

import {
  normalizeNumericParameterValues,
  normalizeSelectParameterValues,
} from './workflowNodeParameters';
import {
  inputPorts,
  mediaKindForNode,
  mediaKindsCompatible,
  outputPorts,
  parameterSchema,
} from './workflowNodePresentation';
import { expandWorkflowStorageSlots } from './workflowNodeSlots';
import type { CanvasNode } from './workflowNodeTypes';

export function localAssetReference(
  urlValue: unknown,
  expectedProjectId: string,
  mediaKind: WorkflowCanvasMediaKind,
) {
  if (typeof urlValue !== 'string') return null;
  const pathOnly = urlValue.split(/[?#]/, 1)[0];
  const match = /^\/library\/media\/([^/]+)\/(images|videos|audios)\/([^/]+)$/i.exec(pathOnly);
  if (!match) return null;
  const projectId = decodeURIComponent(match[1]);
  const directoryType = match[2].toLowerCase();
  const storedType =
    directoryType === 'images' ? 'image' : directoryType === 'videos' ? 'video' : 'audio';
  if (projectId !== expectedProjectId || !mediaKindsCompatible(storedType, mediaKind)) return null;
  const filename = decodeURIComponent(match[3]);
  const assetId = filename.replace(/\.[^.]+$/, '');
  if (!assetId || assetId === '.' || assetId === '..' || /[\\/\0\r\n]/.test(assetId)) return null;
  return { assetId, projectId, type: mediaKind };
}

export function outputValue(
  node: CanvasNode,
  sourcePortIndex: number,
): WorkflowCanvasOutputValue | undefined {
  if (!Array.isArray(node.workflowOutputs)) return undefined;
  const outputs = node.workflowOutputs as WorkflowCanvasOutputValue[];
  const port = outputPorts(node)[sourcePortIndex];
  return port ? outputs.find((output) => output.portId === port.id) : undefined;
}

export function assetFromNode(
  node: CanvasNode,
  sourcePortIndex: number,
  projectId: string,
  mediaKind: WorkflowCanvasMediaKind,
) {
  const declared = declaredNodeOutput(node, sourcePortIndex);
  if (declared) return localAssetReference(declared.url, projectId, mediaKind);
  if (node.kind === 'workflow') {
    const output = outputValue(node, sourcePortIndex);
    if (!output || !mediaKindsCompatible(output.mediaKind, mediaKind)) return null;
    if (output.assetId) return { assetId: output.assetId, projectId, type: mediaKind };
    return localAssetReference(output.url, projectId, mediaKind);
  }
  // Replacing an image or selecting a generation candidate changes resultUrl;
  // legacy assetId metadata can still name the previous character.
  const currentUrl = node.resultUrl || node.url || node.dataUrl;
  if (currentUrl) return localAssetReference(currentUrl, projectId, mediaKind);
  if (
    typeof node.assetId === 'string' &&
    typeof node.projectId === 'string' &&
    node.projectId === projectId &&
    node.assetId.length > 0 &&
    node.assetId.length <= 200 &&
    !/[\\/\0\r\n]/.test(node.assetId) &&
    mediaKindsCompatible(mediaKindForNode(node, sourcePortIndex), mediaKind)
  ) {
    return { assetId: node.assetId, projectId, type: mediaKind };
  }
  return null;
}

export function textFromNode(node: CanvasNode, sourcePortIndex: number): string | null {
  const declared = declaredNodeOutput(node, sourcePortIndex);
  if (declared) return declared.kind === 'text' && typeof declared.value === 'string' ? declared.value : null;
  if (node.kind === 'workflow') {
    const output = outputValue(node, sourcePortIndex);
    if (!output || output.mediaKind !== 'text') return null;
    if (typeof output.value === 'string') return output.value;
    if (output.value !== undefined) return JSON.stringify(output.value);
  }
  for (const value of [node.textContent, node.resultText, node.prompt, node.text]) {
    if (typeof value === 'string') return value;
  }
  return null;
}

export function buildWorkflowCanvasValues(
  node: WorkflowCanvasNodeRecord,
  connectedNodes: readonly CanvasNode[],
  projectId: string,
): Record<string, unknown> {
  if (!projectId) throw localRuntimeError('当前画布没有有效的项目标识', 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
  const values = { ...(node.parameterValues || {}) };
  const parents = Array.isArray(node.parentIds) ? node.parentIds : [];
  const sourcePortIndices = Array.isArray(node.sourcePortIndices) ? node.sourcePortIndices : [];
  const byId = new Map(connectedNodes.map((candidate) => [candidate.id, candidate]));
  const grouped = new Map<string, Array<Record<string, string>>>();
  for (const slot of expandWorkflowStorageSlots(node)) {
    const parentId = parents[slot.slotIndex];
    if (!parentId) {
      if (
        slot.source === 'parameter' &&
        slot.required &&
        (values[slot.bindingKey] === undefined ||
          values[slot.bindingKey] === null ||
          values[slot.bindingKey] === '')
      ) {
        throw localRuntimeError(`${slot.label}尚未填写或连接文本节点`, 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
      }
      if (slot.source === 'input-port' && slot.required) {
        throw localRuntimeError(`${slot.label}尚未连接素材`, 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
      }
      continue;
    }
    const parent = byId.get(parentId);
    if (!parent) throw localRuntimeError(`${slot.label}连接的素材节点已经不存在`, 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
    const sourcePortIndex = Math.max(0, Math.trunc(sourcePortIndices[slot.slotIndex] || 0));
    if (parent.kind === 'workflow' && !outputValue(parent, sourcePortIndex))
      throw localRuntimeError(`${slot.label}连接的工作流输出尚无结果，请检查所选输出端口`, 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
    if (slot.source === 'parameter') {
      const text = textFromNode(parent, sourcePortIndex);
      if (text === null) throw localRuntimeError(`${slot.label}需要连接文本节点`, 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
      if (slot.required && text.trim() === '') throw localRuntimeError(`${slot.label}连接的文本为空`, 'buildWorkflowCanvasValues', ERRORS.invalidCanvas);
      values[slot.bindingKey] = text;
      continue;
    }
    const asset = assetFromNode(parent, sourcePortIndex, projectId, slot.mediaKind);
    if (!asset) throw localRuntimeError(`${slot.label}需要当前项目内的${slot.mediaKind}素材`, 'buildWorkflowCanvasValues', ERRORS.invalidMedia);
    grouped.set(slot.bindingKey, [...(grouped.get(slot.bindingKey) || []), asset]);
  }
  for (const port of inputPorts(node)) {
    const assets = grouped.get(port.id) || [];
    if (port.required && assets.length === 0) throw localRuntimeError(`${port.label}尚未连接素材`, 'buildWorkflowCanvasValues', ERRORS.invalidMedia);
    if (assets.length > 0) values[port.id] = port.multiple ? assets : assets[0];
    else delete values[port.id];
  }
  const schema = parameterSchema(node);
  normalizeSelectParameterValues(schema, values);
  return normalizeNumericParameterValues(schema, values);
}

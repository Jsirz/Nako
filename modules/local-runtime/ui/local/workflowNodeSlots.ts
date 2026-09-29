import type { WorkflowCanvasInputSlot } from '../../../contracts/workflowCanvasNodeProtocol';

import {
  inputPorts,
  isTextParameter,
  mediaKindForNode,
  mediaKindsCompatible,
  parameterSchema,
  workflowMediaKindLabel,
} from './workflowNodePresentation';
import type { CanvasNode } from './workflowNodeTypes';

export function workflowInputSlotKey(slot: WorkflowCanvasInputSlot): string {
  return `${slot.source}:${slot.bindingKey}:${slot.itemIndex}`;
}

export const WORKFLOW_MEDIA_ORDER: Readonly<Record<string, number>> = {
  image: 0,
  mask: 1,
  video: 2,
  audio: 3,
  text: 4,
  json: 5,
};

export function workflowPortOrdinal(port: { id: string; label: string }): number {
  const values = [port.id, port.label];
  for (const value of values) {
    const match = String(value || '').match(/(?:^|[^0-9])(\d+)\s*$/u);
    if (match) return Number(match[1]);
  }
  return Number.POSITIVE_INFINITY;
}

export function orderedWorkflowInputPorts(node: CanvasNode): ReturnType<typeof inputPorts> {
  return inputPorts(node)
    .map((port, sourceIndex) => ({ port, sourceIndex }))
    .sort(
      (first, second) =>
        (WORKFLOW_MEDIA_ORDER[first.port.mediaKind] ?? 99) -
          (WORKFLOW_MEDIA_ORDER[second.port.mediaKind] ?? 99) ||
        workflowPortOrdinal(first.port) - workflowPortOrdinal(second.port) ||
        first.port.label.localeCompare(second.port.label, 'zh-CN', { numeric: true }) ||
        first.sourceIndex - second.sourceIndex,
    )
    .map(({ port }) => port);
}

export function compareWorkflowSlots(
  first: WorkflowCanvasInputSlot,
  second: WorkflowCanvasInputSlot,
): number {
  return (
    (WORKFLOW_MEDIA_ORDER[first.mediaKind] ?? 99) -
      (WORKFLOW_MEDIA_ORDER[second.mediaKind] ?? 99) ||
    workflowPortOrdinal({ id: first.bindingKey, label: first.label }) -
      workflowPortOrdinal({ id: second.bindingKey, label: second.label }) ||
    first.itemIndex - second.itemIndex ||
    first.slotIndex - second.slotIndex
  );
}

export function expandWorkflowStorageSlots(node: CanvasNode): WorkflowCanvasInputSlot[] {
  const slots: WorkflowCanvasInputSlot[] = [];
  for (const port of inputPorts(node)) {
    const count = port.multiple
      ? Math.min(20 - slots.length, Math.max(1, Math.trunc(port.maximumItems || 1)))
      : 1;
    for (let itemIndex = 0; itemIndex < count && slots.length < 20; itemIndex += 1) {
      slots.push({
        id: `${port.id}:${itemIndex}`,
        bindingKey: port.id,
        label: port.multiple ? `${port.label} ${itemIndex + 1}` : port.label,
        mediaKind: port.mediaKind,
        required: port.required && itemIndex === 0,
        slotIndex: slots.length,
        itemIndex,
        multiple: port.multiple,
        source: 'input-port',
        placeholder: false,
      });
    }
  }
  for (const parameter of parameterSchema(node)) {
    if (slots.length >= 20 || !isTextParameter(parameter)) continue;
    slots.push({
      id: `parameter:${parameter.key}`,
      bindingKey: parameter.key,
      label: parameter.label || '文字输入',
      mediaKind: 'text',
      required: Boolean(parameter.control?.required),
      slotIndex: slots.length,
      itemIndex: 0,
      multiple: false,
      source: 'parameter',
      placeholder: false,
    });
  }
  return slots;
}

export function expandWorkflowInputSlots(node: CanvasNode): WorkflowCanvasInputSlot[] {
  const storageSlots = expandWorkflowStorageSlots(node);
  const parentIds = Array.isArray(node.parentIds) ? node.parentIds : [];
  const visible: WorkflowCanvasInputSlot[] = [];
  for (const port of orderedWorkflowInputPorts(node)) {
    const portSlots = storageSlots.filter(
      (slot) => slot.source === 'input-port' && slot.bindingKey === port.id,
    );
    if (!port.multiple) {
      if (portSlots[0]) visible.push(portSlots[0]);
      continue;
    }
    const connected = portSlots.filter((slot) => Boolean(parentIds[slot.slotIndex]));
    connected.forEach((slot, index) => {
      visible.push({
        ...slot,
        label: `${port.label} ${index + 1}`,
        required: port.required && index === 0,
        placeholder: false,
      });
    });
    const next = portSlots.find((slot) => !parentIds[slot.slotIndex]);
    if (next) {
      visible.push({
        ...next,
        label: `添加${port.label}`,
        required: port.required && connected.length === 0,
        placeholder: true,
      });
    }
  }
  visible.push(...storageSlots.filter((slot) => slot.source === 'parameter'));
  return visible;
}

export function workflowInputLimitNotice(node: CanvasNode): string | undefined {
  const storageSlots = expandWorkflowStorageSlots(node);
  const parentIds = Array.isArray(node.parentIds) ? node.parentIds : [];
  for (const port of inputPorts(node)) {
    if (!port.multiple) continue;
    const portSlots = storageSlots.filter(
      (slot) => slot.source === 'input-port' && slot.bindingKey === port.id,
    );
    const connectedCount = portSlots.filter((slot) => Boolean(parentIds[slot.slotIndex])).length;
    if (portSlots.length === 0 || connectedCount < portSlots.length) continue;
    const unit =
      port.mediaKind === 'audio' ? '段音频' : port.mediaKind === 'video' ? '段视频' : '张图片';
    return `${port.label}已达上限：最多 ${portSlots.length} ${unit}`;
  }
  return undefined;
}

export function compatibleWorkflowInputSlots(
  target: CanvasNode,
  source: CanvasNode,
  sourcePortIndex = 0,
): WorkflowCanvasInputSlot[] {
  const sourceMediaKind = mediaKindForNode(source, sourcePortIndex);
  if (!sourceMediaKind) return [];
  return expandWorkflowStorageSlots(target)
    .filter((slot) => mediaKindsCompatible(sourceMediaKind, slot.mediaKind))
    .sort(compareWorkflowSlots);
}

export function resolveAvailableWorkflowInputSlot(
  target: CanvasNode,
  source: CanvasNode,
  sourcePortIndex = 0,
): number {
  const parents = Array.isArray(target.parentIds) ? target.parentIds : [];
  return (
    compatibleWorkflowInputSlots(target, source, sourcePortIndex).find(
      (slot) => !parents[slot.slotIndex],
    )?.slotIndex ?? -1
  );
}

export function workflowConnectionLimitNotice(
  target: CanvasNode,
  source: CanvasNode,
  sourcePortIndex = 0,
): string | undefined {
  const sourceMediaKind = mediaKindForNode(source, sourcePortIndex);
  if (!sourceMediaKind) return undefined;
  const compatibleSlots = compatibleWorkflowInputSlots(target, source, sourcePortIndex);
  if (compatibleSlots.length === 0) {
    return `当前工作流不接受${workflowMediaKindLabel(sourceMediaKind)}输入`;
  }
  const parents = Array.isArray(target.parentIds) ? target.parentIds : [];
  if (compatibleSlots.some((slot) => !parents[slot.slotIndex])) return undefined;
  const unit =
    sourceMediaKind === 'image' || sourceMediaKind === 'mask'
      ? '张图片'
      : sourceMediaKind === 'video'
        ? '段视频'
        : sourceMediaKind === 'audio'
          ? '段音频'
          : sourceMediaKind === 'text'
            ? '个文字输入'
            : '个输入';
  return `${workflowMediaKindLabel(sourceMediaKind)}输入已达上限：当前工作流最多可连接 ${compatibleSlots.length} ${unit}`;
}

import { canvasError } from '../../../contracts/canvasErrors.js';
import { installNodeFramework } from './nodeFramework';
import type { NodeRunRequest } from '../../../contracts/nodeExecution.js';
export type NodeValue = Record<string, unknown> & { id: string; type: string; pluginId?: string; parentIds?: string[]; parameters?: Record<string, unknown>; inputLinks?: Array<{ sourceNodeId: string; sourcePortId: string; targetPortId: string }> };
const definitionOf = (node: NodeValue) => installNodeFramework().getDefinition(node.type, node.pluginId);
export function nodeOutput(node: NodeValue, portId: string): unknown {
  const result = node.pluginResult as Record<string, unknown> | undefined;
  if (result?.[portId] !== undefined) return result[portId];
  const media = definitionOf(node)?.outputs.find(port => port.id === portId)?.media || [];
  if (media.includes('text')) return node.textContent ?? node.prompt ?? '';
  return node.resultUrl || (node.resultUrls as unknown[] | undefined)?.[0] || node.sourceUrl;
}
export function nodeLinks(node: NodeValue, all: NodeValue[]) {
  if (node.inputLinks?.length) return node.inputLinks;
  const definition = definitionOf(node);
  return (node.parentIds || []).flatMap((id, index) => {
    const parent = all.find(item => item.id === id), input = definition?.inputs[index] || definition?.inputs.find(port => port.multiple);
    const sourceIndex = (node.sourcePortIndices as number[] | undefined)?.[index] || 0;
    const output = parent && definitionOf(parent)?.outputs[sourceIndex];
    return parent && input && output ? [{ sourceNodeId: id, sourcePortId: output.id, targetPortId: input.id }] : [];
  });
}
export function buildNodeGraph(node: NodeValue, all: NodeValue[], projectId: string, upstream = false): NodeRunRequest {
  const selected = new Map<string, NodeValue>();
  const collect = (item: NodeValue) => {
    if (selected.has(item.id)) return; selected.set(item.id, item);
    if (upstream) for (const link of nodeLinks(item, all)) {
      const parent = all.find(candidate => candidate.id === link.sourceNodeId); if (parent) collect(parent);
    }
  };
  collect(node);
  const request: NodeRunRequest = { requestId: crypto.randomUUID(), projectId, nodes: [], edges: [], initialInputs: {}, maxModelCalls: Math.min(selected.size * 2, 100) };
  for (const item of selected.values()) {
    const definition = definitionOf(item);
    if (!definition) throw canvasError(`节点未安装：${item.type}`, 'node-graph.snapshot');
    let parameters = definition.pluginId === 'nako.canvas-core'
      ? { ...item, ...item.parameters, model: item.model || item[definition.type + 'Model'], value: nodeOutput(item, definition.outputs[0]?.id || '') }
      : item.parameters || {};
    if (definition.category === 'asset' && definition.pluginId === 'nako.canvas-core') parameters = { value: nodeOutput(item, definition.outputs[0]?.id || '') };
    if (definition.type === 'image-composite') parameters = { columns: Number(item.gridColumns || 2) };
    if (['shot-analysis', 'video-replica'].includes(definition.type)) parameters = item.parameters || {};
    request.nodes.push({ id: item.id, type: definition.type, pluginId: definition.pluginId, nodeVersion: item.nodeVersion || definition.version, parameters });
    request.initialInputs![item.id] = [];
    for (const link of nodeLinks(item, all)) {
      if (selected.has(link.sourceNodeId)) request.edges!.push({ source: { nodeId: link.sourceNodeId, portId: link.sourcePortId }, target: { nodeId: item.id, portId: link.targetPortId } });
      else {
        const parent = all.find(candidate => candidate.id === link.sourceNodeId);
        if (parent) request.initialInputs![item.id].push({ targetPortId: link.targetPortId, value: nodeOutput(parent, link.sourcePortId) });
      }
    }
  }
  return request;
}

import { installNodeFramework } from './nodeFramework';
import type { CanvasConnectionNode, ConnectCanvasNodesOptions } from '../canvas/canvasConnections';
type Link = { sourceNodeId: string; sourcePortId: string; targetPortId: string };
export const packagePortY = (index: number) => 60 + 26 * index;
export function packageDefinition(node: CanvasConnectionNode) {
  const definition = installNodeFramework().getDefinition(node.type, String(node.pluginId || '') || undefined);
  return definition && ['generic', 'iframe'].includes(definition.render?.kind || '') ? definition : undefined;
}
export function canConnectPackage(source: CanvasConnectionNode, target: CanvasConnectionNode, nodes: CanvasConnectionNode[], targetPort: number, sourcePort: number): boolean | undefined {
  const framework = installNodeFramework(), definition = packageDefinition(target);
  if (!definition) return undefined;
  const output = framework.getDefinition(source.type, String(source.pluginId || '') || undefined)?.outputs[sourcePort];
  const input = definition.inputs[targetPort];
  if (!input || !output || source.id === target.id) return false;
  const ancestors = new Set<string>(), visit = (node: CanvasConnectionNode) => {
    if (ancestors.has(node.id)) return; ancestors.add(node.id);
    (node.parentIds || []).forEach(id => { const parent = nodes.find(item => item.id === id); if (parent) visit(parent); });
  };
  visit(source); if (ancestors.has(target.id)) return false;
  const count = ((target.inputLinks || []) as Link[]).filter(link => link.targetPortId === input.id && !(link.sourceNodeId === source.id && link.sourcePortId === output.id)).length;
  if (count >= (input.multiple ? input.maximum || 500 : 1)) return false;
  return input.media.includes('any') || output.media.includes('any') || input.media.some(kind => output.media.includes(kind));
}
export function connectPackage<T extends CanvasConnectionNode>(nodes: readonly T[], options: ConnectCanvasNodesOptions): T[] | undefined {
  const source = nodes.find(node => node.id === options.parentId), target = nodes.find(node => node.id === options.childId);
  if (!source || !target || !packageDefinition(target)) return undefined;
  if (!canConnectPackage(source, target, [...nodes], options.portIndex || 0, options.sourcePortIndex || 0)) return nodes as T[];
  const framework = installNodeFramework();
  const output = framework.getDefinition(source.type, String(source.pluginId || '') || undefined)!.outputs[options.sourcePortIndex || 0];
  const input = packageDefinition(target)!.inputs[options.portIndex || 0];
  const links = ((target.inputLinks || []) as Link[]).filter(link => !(link.targetPortId === input.id && link.sourceNodeId === source.id && link.sourcePortId === output.id));
  links.push({ sourceNodeId: source.id, sourcePortId: output.id, targetPortId: input.id });
  return nodes.map(node => node.id === target.id ? { ...node, inputLinks: links, parentIds: links.map(link => link.sourceNodeId),
    sourcePortIndices: links.map(link => { const parent = nodes.find(item => item.id === link.sourceNodeId)!; return framework.getDefinition(parent.type, String(parent.pluginId || '') || undefined)?.outputs.findIndex(port => port.id === link.sourcePortId) || 0; }) } : node);
}

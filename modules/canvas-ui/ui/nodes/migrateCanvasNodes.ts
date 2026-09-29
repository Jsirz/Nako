import { migrateNodeRecord } from '../../../contracts/nodeMigrations.js';
import { installNodeFramework } from './nodeFramework';
import type { NodeDefinition } from '../../../contracts/nodeSdk.js';
import type { CanvasNode } from './canvasNodeOperations';

/** Apply only explicit migrations, preserving IDs and missing/unmigratable node data. */
export function migrateCanvasNodes(nodes: CanvasNode[]): CanvasNode[] {
  const framework = installNodeFramework(), remaps = new Map<string, Record<string, string>>();
  let changed = false;
  const migrated = nodes.map(node => {
    const definition = framework.getDefinition(node.type, String(node.pluginId || '') || undefined);
    if (!definition || !node.nodeVersion || definition.version === node.nodeVersion) return node;
    try {
      const result = migrateNodeRecord(node, definition as NodeDefinition);
      remaps.set(node.id, result.outputs); changed = true;
      return { ...result.node, migrationError: undefined, inputPorts: definition.inputs, outputPorts: definition.outputs,
        ...(node.pluginResult ? { pluginResult: Object.fromEntries(Object.entries(node.pluginResult as Record<string, unknown>).map(([id, value]) => [result.outputs[id] || id, value])) } : {}) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (node.migrationError === message) return node; changed = true; return { ...node, migrationError: message };
    }
  });
  if (!changed) return nodes;
  return migrated.map(node => {
    const links = node.inputLinks as Array<{ sourceNodeId: string; sourcePortId: string; targetPortId: string }> | undefined;
    if (!links?.length) return node;
    const inputLinks = links.map(link => ({ ...link, sourcePortId: remaps.get(link.sourceNodeId)?.[link.sourcePortId] || link.sourcePortId }));
    return { ...node, inputLinks, parentIds: inputLinks.map(link => link.sourceNodeId), sourcePortIndices: inputLinks.map(link => {
      const parent = migrated.find(item => item.id === link.sourceNodeId);
      const ports = parent && framework.getDefinition(parent.type, String(parent.pluginId || '') || undefined)?.outputs;
      return Math.max(0, ports?.findIndex(port => port.id === link.sourcePortId) ?? 0);
    }) };
  });
}

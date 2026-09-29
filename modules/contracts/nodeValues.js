/** Read a declared output by stable ID; never substitute a different port's result. */
export function declaredNodeOutput(node, index = 0) {
  const port = node.outputPorts?.[index];
  if (!port || !node.pluginResult) return null;
  const value = node.pluginResult[port.id];
  const kind = value?.type || port.media?.find(kind => !['any', 'json'].includes(kind)) || 'json';
  return { kind, value, url: typeof value === 'string' && kind !== 'text' ? value : value?.url };
}

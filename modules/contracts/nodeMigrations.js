import { NODE_ERROR, nodeError, jsonClone } from './nodeExecution.js';
const rename = (value, mapping = {}) => Object.fromEntries(Object.entries(value || {}).map(([key, item]) => [mapping[key] || key, item]));
export function migrateNodeRecord(source, definition) {
  let node = jsonClone(source), version = node.nodeVersion || definition.version;
  const inputs = {}, outputs = {}, visited = new Set();
  while (version !== definition.version) {
    if (visited.has(version)) throw nodeError(NODE_ERROR.VERSION, '节点迁移存在循环');
    visited.add(version);
    const migration = definition.migrations?.find(item => item.from === version);
    if (!migration) throw nodeError(NODE_ERROR.VERSION, `缺少从 ${version} 到 ${definition.version} 的迁移`);
    for (const key of Object.keys(inputs)) inputs[key] = migration.renameInputs?.[inputs[key]] || inputs[key];
    for (const key of Object.keys(outputs)) outputs[key] = migration.renameOutputs?.[outputs[key]] || outputs[key];
    Object.assign(inputs, migration.renameInputs); Object.assign(outputs, migration.renameOutputs);
    node.parameters = { ...(migration.defaults || {}), ...rename(node.parameters, migration.renameParameters) };
    node.inputLinks = node.inputLinks?.map(link => ({ ...link, targetPortId: migration.renameInputs?.[link.targetPortId] || link.targetPortId }));
    version = migration.to;
  }
  return { node: { ...node, nodeVersion: version }, inputs, outputs };
}

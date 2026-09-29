import { NodeDagScheduler } from './nodeDagScheduler.js';
import { NODE_ERROR, nodeError, jsonClone } from '../contracts/nodeExecution.js';
import { nodeProjectSnapshot } from '../contracts/nodeProjectSnapshot.js';
import { migrateNodeRecord } from '../contracts/nodeMigrations.js';

function capture(registry, request, agent) {
  const definitions = new Map(), handlers = new Map(), packages = new Map();
  for (const node of request.nodes || []) {
    const resolved = registry.resolveNode(node.type, node.pluginId);
    if (!resolved) throw nodeError(NODE_ERROR.MISSING, `节点未安装: ${node.type}`);
    if (agent && !resolved.definition.agent?.exposed) throw nodeError(NODE_ERROR.DENIED, '此节点未开放给 Agent');
    node.pluginId = resolved.packageId;
    definitions.set(node.id, resolved.definition);
    handlers.set(node.id, registry.getExecutor(node.type, resolved.packageId));
    packages.set(resolved.packageId, registry.listPackages().find(item => item.id === resolved.packageId));
  }
  const snapshot = {
    getDefinition(type, owner) { return [...definitions.values()].find(item => item.type === type && item.owner === owner); },
    getExecutor(type, owner) { const node = request.nodes.find(item => item.type === type && item.pluginId === owner); return handlers.get(node?.id); },
    validateEdge: (edge, nodes) => registry.validateEdge.call(snapshot, edge, nodes),
  };
  return { definitions, packages, snapshot };
}

export function createNodeRunPreparation(dependencies) {
  const { registry, store, records, pinned, capabilities, policy, serial, persist, checkProject, launch, isClosing, stable, publicRun } = dependencies;
  async function prepare(input, { scope, agent = false } = {}) {
    return serial(async () => {
      if (isClosing()) throw nodeError(NODE_ERROR.CANCELLED, '应用正在退出');
      if (!input || typeof input !== 'object' || !Array.isArray(input.nodes)) throw nodeError(NODE_ERROR.INVALID, '运行请求必须包含 nodes 数组');
      if (typeof scope !== 'string' || !scope || !/^[\w.-]{1,128}$/.test(input.projectId) || !/^[\w.-]{1,128}$/.test(input.requestId)) throw nodeError(NODE_ERROR.INVALID, '项目或请求 ID 无效');
      if (JSON.stringify(input).length > 4 * 1024 * 1024) throw nodeError(NODE_ERROR.INVALID, '运行快照过大');
      const signature = stable(input);
      if (input.maxModelCalls !== undefined && (!Number.isInteger(input.maxModelCalls) || input.maxModelCalls < 0 || input.maxModelCalls > 100)) throw nodeError(NODE_ERROR.INVALID, '模型调用次数应为 0–100 的整数');
      const previous = [...records.values()].find(record => record.scope === scope && record.projectId === input.projectId && record.request.requestId === input.requestId);
      if (previous) {
        if (previous.signature !== signature) throw nodeError(NODE_ERROR.CONFLICT, '相同请求 ID 不可提交不同内容');
        return publicRun(previous);
      }
      const project = await checkProject(input.projectId, input.revision);
      const request = jsonClone(input);
      const migrations = new Map();
      request.nodes = (request.nodes || []).map(node => {
        const definition = registry.getDefinition(node.type, node.pluginId);
        if (!definition) return node;
        const migration = migrateNodeRecord(node, definition); migrations.set(node.id, migration); return migration.node;
      });
      for (const node of request.nodes) node.inputLinks = node.inputLinks?.map(link => ({ ...link,
        sourcePortId: migrations.get(link.sourceNodeId)?.outputs[link.sourcePortId] || link.sourcePortId }));
      request.edges = request.edges?.map(edge => ({ source: { ...edge.source, portId: migrations.get(edge.source.nodeId)?.outputs[edge.source.portId] || edge.source.portId }, target: { ...edge.target, portId: migrations.get(edge.target.nodeId)?.inputs[edge.target.portId] || edge.target.portId } }));
      for (const [id, values] of Object.entries(request.initialInputs || {})) request.initialInputs[id] = values.map(item => ({ ...item, targetPortId: migrations.get(id)?.inputs[item.targetPortId] || item.targetPortId }));
      const captured = capture(registry, request, agent);
      request.revision = Number(project.revision || 0);
      request.edges = new NodeDagScheduler({ registry: captured.snapshot }).prepare(request.nodes, request.edges, request.initialInputs);
      if (isClosing()) throw nodeError(NODE_ERROR.CANCELLED, '应用正在退出');
      const requested = [...new Set([...captured.definitions.values()].flatMap(item => item.capabilities ?? captured.packages.get(item.owner).capabilities ?? []))];
      for (const capability of requested) if (!policy.includes(capability) || !capabilities[capability]) throw nodeError(NODE_ERROR.DENIED, `宿主未开放能力: ${capability}`);
      const needsApproval = requested.length > 0 || [...captured.definitions.values()].some(item => item.agent?.requiresConfirmation || ['write', 'network'].includes(item.agent?.sideEffect));
      const record = { id: store.createId(), requestId: request.requestId, scope, signature, request, projectId: request.projectId, revision: request.revision, projectSignature: stable(nodeProjectSnapshot(project)),
        status: needsApproval ? 'awaiting_approval' : 'running', agent, capabilities: requested,
        maxModelCalls: Math.min(100, Math.max(0, Math.trunc(Number(input.maxModelCalls ?? 1)))), modelCalls: 0,
        events: [], steps: {}, states: {}, results: {}, createdAt: new Date().toISOString(),
        nodes: request.nodes.map(node => ({ id: node.id, type: node.type, pluginId: node.pluginId, title: captured.definitions.get(node.id).title, parameters: node.parameters })),
      };
      records.set(record.id, record); pinned.set(record.id, captured);
      try { await persist(record); }
      catch (error) { records.delete(record.id); pinned.delete(record.id); throw error; }
      if (!needsApproval) launch(record, captured);
      return publicRun(record);
    });
  }
  return prepare;
}

import { NODE_ERROR, nodeError, validateNodeValue, validatePortValue, isNodeRecord } from '../contracts/nodeExecution.js';

const cancelled = () => nodeError(NODE_ERROR.CANCELLED, '节点运行已停止');
function normalizeEdges(nodes, edges) {
  return edges ?? nodes.flatMap(node => (node.inputLinks || []).map(link => ({
    source: { nodeId: link.sourceNodeId, portId: link.sourcePortId },
    target: { nodeId: node.id, portId: link.targetPortId },
  })));
}
function dependencies(nodes, edges) {
  const incoming = new Map(nodes.map(node => [node.id, new Set()]));
  for (const edge of edges) incoming.get(edge.target.nodeId).add(edge.source.nodeId);
  return incoming;
}

export class NodeDagScheduler {
  constructor({ registry, executors = {}, onEvent = () => {}, maxParallel = 4 } = {}) {
    Object.assign(this, { registry, executors, onEvent });
    this.maxParallel = Math.min(16, Math.max(1, Number(maxParallel) || 4));
  }

  validate(nodes, edges) {
    try {
      if (!Array.isArray(nodes) || !nodes.length || nodes.length > 500) throw nodeError(NODE_ERROR.INVALID, '节点数量应为 1–500');
      const ids = new Set(nodes.map(node => node.id));
      if (ids.size !== nodes.length || nodes.some(node => typeof node.id !== 'string' || !node.id || ['__proto__', 'constructor', 'prototype'].includes(node.id)))
        throw nodeError(NODE_ERROR.INVALID, '节点 ID 必须有效且唯一');
      const normalized = normalizeEdges(nodes, edges);
      if (!Array.isArray(normalized) || normalized.length > 2000) throw nodeError(NODE_ERROR.INVALID, '连线数量无效');
      for (const edge of normalized) {
        if (!ids.has(edge?.source?.nodeId) || !ids.has(edge?.target?.nodeId)) throw nodeError(NODE_ERROR.INVALID, '连线引用了不存在的节点');
        if (this.registry) {
          const check = this.registry.validateEdge(edge, nodes);
          if (!check.valid) throw nodeError(NODE_ERROR.INVALID, `连线无效: ${check.code}`);
        }
      }
      const incoming = dependencies(nodes, normalized), visited = new Set();
      while (visited.size < nodes.length) {
        const ready = nodes.filter(node => !visited.has(node.id) && [...incoming.get(node.id)].every(id => visited.has(id)));
        if (!ready.length) throw nodeError('DAG_CYCLE', '节点图包含循环');
        ready.forEach(node => visited.add(node.id));
      }
      return { valid: true, edges: normalized };
    } catch (error) { return { valid: false, code: error.code || NODE_ERROR.INVALID, message: error.message, edges: [] }; }
  }

  prepare(nodes, edges, initialInputs = {}) {
    const check = this.validate(nodes, edges);
    if (!check.valid) throw nodeError(check.code, check.message);
    for (const node of nodes) {
      const definition = this.registry?.getDefinition(node.type, node.pluginId || node.owner);
      if (this.registry && !definition) throw nodeError(NODE_ERROR.MISSING, `节点未安装: ${node.type}`);
      if (!definition) continue;
      if (node.nodeVersion && node.nodeVersion !== definition.version) throw nodeError(NODE_ERROR.VERSION, `节点 ${node.id} 需要迁移到 ${definition.version}`);
      if (!this.registry.getExecutor(node.type, node.pluginId || node.owner)) throw nodeError(NODE_ERROR.MISSING, `节点没有执行器: ${node.type}`);
      node.parameters = validateNodeValue(definition.parameters, node.parameters || {});
      const supplied = initialInputs[node.id] || [];
      for (const item of supplied) {
        const port = definition.inputs.find(port => port.id === item.targetPortId);
        if (!port) throw nodeError(NODE_ERROR.INVALID, `未知输入端口: ${item.targetPortId}`);
        validatePortValue(port, item.value);
      }
      for (const port of definition.inputs) {
        const count = supplied.filter(item => item.targetPortId === port.id).length + check.edges.filter(edge => edge.target.nodeId === node.id && edge.target.portId === port.id).length;
        if (port.required && !count) throw nodeError(NODE_ERROR.INVALID, `节点 ${node.id} 缺少输入 ${port.id}`);
        if (count > (port.multiple ? port.maximum ?? 500 : 1)) throw nodeError(NODE_ERROR.INVALID, `端口 ${port.id} 的输入数量超出限制`);
      }
    }
    return check.edges;
  }

  async run({ nodes, edges, context = {}, initialInputs = {}, signal } = {}) {
    const normalized = this.prepare(nodes, edges, initialInputs);
    const incoming = dependencies(nodes, normalized), results = new Map(), failures = [];
    const states = new Map(nodes.map(node => [node.id, 'queued'])), pending = new Set(states.keys());
    while (pending.size) {
      if (signal?.aborted) throw cancelled();
      for (const id of [...pending]) {
        if ([...incoming.get(id)].some(source => ['error', 'cancelled'].includes(states.get(source)))) {
          states.set(id, 'cancelled'); pending.delete(id);
          await this.onEvent({ type: 'node', nodeId: id, status: 'cancelled', reason: 'dependency-failed' });
        }
      }
      const ready = nodes.filter(node => pending.has(node.id) && [...incoming.get(node.id)].every(source => states.get(source) === 'success')).slice(0, this.maxParallel);
      if (!ready.length && pending.size) continue;
      await Promise.all(ready.map(async node => {
        states.set(node.id, 'running');
        await this.onEvent({ type: 'node', nodeId: node.id, status: 'running' });
        try {
          const inputs = [...(initialInputs[node.id] || []), ...this.inputsFor(node.id, normalized, results)];
          const result = await this.executeNode(node, { ...context, inputs, signal });
          if (signal?.aborted) throw cancelled();
          results.set(node.id, result); states.set(node.id, 'success');
          await this.onEvent({ type: 'node', nodeId: node.id, status: 'success', result });
        } catch (error) {
          failures.push({ nodeId: node.id, code: error.code || NODE_ERROR.FAILED, message: error.message });
          states.set(node.id, signal?.aborted ? 'cancelled' : 'error');
          await this.onEvent({ type: 'node', nodeId: node.id, status: states.get(node.id), error: error.message, code: error.code });
        } finally { pending.delete(node.id); }
      }));
    }
    return { results: Object.fromEntries(results), states: Object.fromEntries(states), edges: normalized, failures };
  }

  async executeNode(node, context) {
    if (context.signal?.aborted) throw cancelled();
    const owner = node.pluginId || node.owner;
    const definition = this.registry?.getDefinition(node.type, owner);
    const handler = this.registry?.getExecutor(node.type, owner) || this.executors[node.type];
    if (typeof handler !== 'function') throw nodeError(NODE_ERROR.MISSING, `未注册执行器: ${node.type}`);
    const inputs = Object.create(null);
    for (const item of context.inputs || []) {
      const port = definition?.inputs.find(port => port.id === item.targetPortId);
      const value = port ? validatePortValue(port, item.value) : item.value;
      if (port?.multiple) (inputs[port.id] ||= []).push(value);
      else inputs[item.targetPortId] = value;
    }
    const scoped = context.forNode ? context.forNode(node) : context;
    const result = await handler({ inputs, parameters: validateNodeValue(definition?.parameters, node.parameters || {}) }, { ...scoped, signal: context.signal });
    if (!isNodeRecord(result)) throw nodeError(NODE_ERROR.INVALID, '执行器必须返回以输出端口 ID 为键的对象');
    if (definition) {
      for (const key of Object.keys(result)) {
        const port = definition.outputs.find(port => port.id === key);
        if (!port) throw nodeError(NODE_ERROR.INVALID, `未知输出端口: ${key}`);
        validatePortValue(port, result[key]);
      }
      for (const port of definition.outputs) if (port.required && result[port.id] === undefined) throw nodeError(NODE_ERROR.INVALID, `缺少输出: ${port.id}`);
    }
    return result;
  }

  inputsFor(id, edges, results) {
    return edges.filter(edge => edge.target.nodeId === id).map(edge => ({
      sourceNodeId: edge.source.nodeId, sourcePortId: edge.source.portId, targetPortId: edge.target.portId,
      value: results.get(edge.source.nodeId)?.[edge.source.portId],
    }));
  }
}
export function createNodeDagScheduler(options) { return new NodeDagScheduler(options); }

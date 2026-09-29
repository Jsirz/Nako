import { NODE_ERROR, nodeError, jsonClone } from '../contracts/nodeExecution.js';

export function createNodeCapabilityContext({ capabilities, policy, persist, event, checkRunProject, stable }) {
  function nodeContext(record, captured, node, signal) {
    const declared = captured.definitions.get(node.id).capabilities ?? captured.packages.get(node.pluginId).capabilities ?? [];
    const inflight = new Map();
    return { runId: record.id, nodeId: node.id, signal,
      progress: message => { if (record.events.length < 2000) void event(record, { type: 'progress', nodeId: node.id, message: String(message).slice(0, 1000) }).catch(() => {}); },
      async call(capability, input, stepId, childSignal) {
        if (!declared.includes(capability) || !record.grants?.includes(capability) || !policy.includes(capability)) throw nodeError(NODE_ERROR.DENIED, `未授权能力: ${capability}`);
        if (!/^[\w.-]{1,100}$/.test(stepId)) throw nodeError(NODE_ERROR.INVALID, '能力调用必须带稳定 stepId');
        const key = node.id + ':' + stepId, signature = stable({ capability, input });
        const old = record.steps[key];
        if (old && old.signature !== signature) throw nodeError(NODE_ERROR.CONFLICT, '步骤 ID 被不同请求复用');
        if (inflight.has(key)) {
          const pending = inflight.get(key);
          if (pending.signature !== signature) throw nodeError(NODE_ERROR.CONFLICT, '步骤 ID 被不同请求复用');
          return pending.promise;
        }
        if (old?.status === 'success') return jsonClone(old.value);
        if (old) throw nodeError(NODE_ERROR.CONFLICT, '步骤已执行或结果未知，禁止自动重放');
        const operation = invokeCapability(record, node, capability, input, key, signature, signal, childSignal);
        inflight.set(key, { signature, promise: operation }); return operation;
      },
    };
  }
  async function invokeCapability(record, node, capability, input, key, signature, signal, childSignal) {
    if (signal.aborted || childSignal?.aborted) throw nodeError(NODE_ERROR.CANCELLED, '节点已停止');
    await checkRunProject(record);
    // Reserve synchronously before the first write/await to keep parallel branches atomic.
    if (['models.generate', 'workflow.execute'].includes(capability)) {
      const count = capability === 'models.generate' ? input.count ?? 1 : 1;
      if (!Number.isInteger(count) || count < 1 || count > 10) throw nodeError(NODE_ERROR.INVALID, '单次生成数量应为 1–10');
      if (record.modelCalls + count > record.maxModelCalls) throw nodeError(NODE_ERROR.BUDGET, '已达到本次授权的生成额度');
      record.modelCalls += count;
    }
    record.steps[key] = { signature, capability, status: 'started' };
    await persist(record);
    try {
      if (signal.aborted || childSignal?.aborted) throw nodeError(NODE_ERROR.CANCELLED, '节点已停止');
      const value = await capabilities[capability](jsonClone(input), { projectId: record.projectId, scope: record.scope,
        pluginId: node.pluginId, nodeId: node.id, runId: record.id, stepId: key, signal, childSignal,
        authorizationId: record.request.authorizationId, planId: record.request.planId });
      if (signal.aborted || childSignal?.aborted) throw nodeError(NODE_ERROR.CANCELLED, '节点已停止');
      record.steps[key] = { signature, capability, status: 'success', value: value ?? null };
      await persist(record); return jsonClone(value ?? null);
    } catch (error) {
      record.steps[key] = { signature, capability, status: 'error', code: error.code, error: error.message };
      await persist(record); throw error;
    }
  }
  return nodeContext;
}

import { NodeDagScheduler } from './nodeDagScheduler.js';
import { NODE_ERROR, nodeError, jsonClone } from '../contracts/nodeExecution.js';
import { nodeProjectSnapshot } from '../contracts/nodeProjectSnapshot.js';
import { createNodeRunPreparation } from './nodeRunPreparation.js';
import { createNodeCapabilityContext } from './nodeRunCapabilities.js';
import { createNodeRunObservation } from './nodeRunObservation.js';

const terminal = status => ['success', 'error', 'cancelled', 'interrupted'].includes(status);
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const publicRun = record => jsonClone(Object.fromEntries(Object.entries(record).filter(([key]) => !['scope', 'signature', 'projectSignature', 'request', 'steps'].includes(key))));

/** Platform-free run orchestration. Storage, project access and capabilities are injected. */
export async function createNodeRunService({ registry, store, capabilities, readProject, policy, recoverRun }) {
  const records = new Map(), active = new Map(), pinned = new Map();
  let writes = Promise.resolve(), mutations = Promise.resolve(), closing = false;
  const serial = operation => { const next = mutations.then(operation); mutations = next.catch(() => {}); return next; };
  const persist = record => { const snapshot = jsonClone(record); const next = writes.then(() => store.save(snapshot)); writes = next.catch(() => {}); return next; };
  for (const record of await store.list()) {
    if (!terminal(record.status)) {
      record.status = 'interrupted'; record.error = '应用退出导致运行中断；不会自动重放可能产生费用的步骤。';
      await persist(record);
    }
    records.set(record.id, record);
  }
  function owned(id, scope) {
    const record = records.get(id);
    if (!record || record.scope !== scope) throw nodeError(NODE_ERROR.NOT_FOUND, '运行记录不存在');
    return record;
  }
  async function checkProject(projectId, revision) {
    const project = await readProject(projectId);
    if (!project) throw nodeError(NODE_ERROR.NOT_FOUND, '请先保存当前项目');
    if (revision !== undefined && Number(project.revision || 0) !== Number(revision)) throw nodeError(NODE_ERROR.REVISION, '项目已变更，请重新准备运行');
    return project;
  }
  async function checkRunProject(record) {
    const project = await checkProject(record.projectId);
    if (stable(nodeProjectSnapshot(project)) !== record.projectSignature) throw nodeError(NODE_ERROR.REVISION, '项目的节点或参数已变更，请重新准备运行');
  }
  async function event(record, value) {
    record.events.push({ ...value, sequence: record.events.length + 1, at: Date.now() });
    if (value.nodeId && value.status) record.states[value.nodeId] = value.status;
    if (value.result !== undefined) record.results[value.nodeId] = value.result;
    await persist(record);
  }
  function launch(record, captured) {
    const controller = new AbortController();
    const promise = (async () => {
      try {
        const scheduler = new NodeDagScheduler({ registry: captured.snapshot, maxParallel: record.request.maxParallel,
          onEvent: value => event(record, value) });
        const result = await scheduler.run({ ...record.request, signal: controller.signal,
          context: { forNode: node => nodeContext(record, captured, node, controller.signal) } });
        Object.assign(record, result, { status: controller.signal.aborted ? 'cancelled' : result.failures.length ? 'error' : 'success' });
        if (result.failures.length) Object.assign(record, { code: result.failures[0].code, error: result.failures[0].message });
      } catch (error) { record.status = controller.signal.aborted ? 'cancelled' : 'error'; record.error = error.message; record.code = error.code; }
      finally { record.completedAt = new Date().toISOString(); try { await persist(record); } finally { active.delete(record.id); pinned.delete(record.id); } }
      return publicRun(record);
    })();
    active.set(record.id, { controller, promise });
    promise.catch(() => {});
  }
  async function approve(id, scope, grants) {
    return serial(async () => {
      if (closing) throw nodeError(NODE_ERROR.CANCELLED, '应用正在退出');
      const record = owned(id, scope);
      if (record.status !== 'awaiting_approval') return publicRun(record);
      if (!Array.isArray(grants) || record.capabilities.some(name => !grants.includes(name))) throw nodeError(NODE_ERROR.DENIED, '请确认本次所需的全部能力');
      await checkRunProject(record);
      record.grants = [...record.capabilities]; record.status = 'running'; record.approvedAt = Date.now();
      try { await persist(record); }
      catch (error) { record.status = 'awaiting_approval'; delete record.grants; delete record.approvedAt; throw error; }
      launch(record, pinned.get(id)); return publicRun(record);
    });
  }
  async function cancel(id, scope) {
    return serial(async () => {
    const record = owned(id, scope);
    active.get(id)?.controller.abort();
    if (['awaiting_approval', 'error', 'interrupted'].includes(record.status) || record.recoveryPending) {
      record.status = 'cancelled'; record.recoveryPending = false; pinned.delete(id); await persist(record);
    }
    if (active.has(id)) await active.get(id).promise;
    return publicRun(record);
    });
  }
  const nodeContext = createNodeCapabilityContext({ capabilities, policy, persist, event, checkRunProject, stable });
  const prepare = createNodeRunPreparation({ registry, store, records, pinned, capabilities, policy, serial, persist, checkProject, launch, isClosing: () => closing, stable, publicRun });
  const observe = createNodeRunObservation({ owned, active, recoverRun, persist, publicRun, isClosing: () => closing });
  return Object.freeze({ prepare, approve, cancel, observe,
    get: (id, scope) => publicRun(owned(id, scope)),
    find: (projectId, requestId, scope) => { const run = [...records.values()].find(record => record.projectId === projectId && record.requestId === requestId && record.scope === scope); return run ? publicRun(run) : null; },
    list: (projectId, scope) => [...records.values()].filter(record => record.projectId === projectId && record.scope === scope).slice(-100).map(publicRun),
    async wait(id, scope) { owned(id, scope); if (active.has(id)) await active.get(id).promise; return observe(id, scope); },
    async stopProject(projectId, scope) { await mutations; await Promise.all([...records.values()].filter(record => record.projectId === projectId && record.scope === scope && (!terminal(record.status) || record.recoveryPending)).map(record => cancel(record.id, scope))); },
    async close() { closing = true; await mutations; await Promise.all([...records.values()].filter(record => !terminal(record.status) || record.recoveryPending).map(record => cancel(record.id, record.scope))); await writes; },
    async project(projectId) { const project = await checkProject(projectId); return { id: project.id, revision: Number(project.revision || 0) }; },
  });
}

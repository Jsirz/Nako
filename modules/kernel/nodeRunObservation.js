import { jsonClone } from '../contracts/nodeExecution.js';

/** Observation may reconcile receipts but can never launch executors or reserve model calls. */
export function createNodeRunObservation({ owned, active, recoverRun, persist, publicRun, isClosing }) {
  const pending = new Map();
  return function observe(id, scope) {
    const record = owned(id, scope);
    if (active.has(id) && ['error', 'interrupted'].includes(record.status))
      return active.get(id).promise.then(() => observe(id, scope));
    if (!recoverRun || isClosing() || active.has(id) || !['error', 'interrupted'].includes(record.status))
      return Promise.resolve(publicRun(record));
    if (pending.has(id)) return pending.get(id);
    const promise = Promise.resolve().then(async () => {
      const steps = Object.entries(record.steps || {}).map(([key, step]) => ({ key, capability: step.capability, status: step.status }));
      const result = await recoverRun({ run: publicRun(record), steps });
      if (!result || isClosing() || record.status === 'cancelled' || active.has(id)) return publicRun(record);
      if (result.status === 'pending') {
        if (record.recoveryPending && record.error === result.error) return publicRun(record);
        record.recoveryPending = true;
        record.error = result.error;
      } else if (result.status === 'success') {
        record.status = 'success'; record.recoveryPending = false;
        record.results = jsonClone(result.results);
        for (const id of Object.keys(result.results)) record.states[id] = 'success';
        for (const [key, value] of Object.entries(result.steps || {})) {
          if (record.steps[key]) {
            const { signature, capability } = record.steps[key];
            record.steps[key] = { signature, capability, status: 'success', value: jsonClone(value) };
          }
        }
        record.failures = []; delete record.error; delete record.code;
        record.completedAt = new Date().toISOString();
        record.events.push({ type: 'recovered', sequence: record.events.length + 1, at: Date.now() });
      } else {
        record.recoveryPending = false; record.status = 'error';
        record.error = result.error; record.code = result.code;
      }
      await persist(record);
      return publicRun(record);
    }).finally(() => pending.delete(id));
    pending.set(id, promise);
    return promise;
  };
}

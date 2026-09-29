import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { NODE_ERROR, nodeError } from '../../../contracts/nodeExecution.js';

/** Narrow node capability over the existing versioned workflow execution service. */
export function createNodeWorkflowService({ canvasNodes, runs }) {
  return async (input, context) => {
    context.signal?.throwIfAborted();
    const ref = input.workflowRef || {};
    let task = await canvasNodes.startRun({ idempotencyKey: createHash('sha256').update(JSON.stringify([context.runId, context.stepId])).digest('hex'),
      definitionId: ref.definitionId, request: {
        projectId: context.projectId, values: input.values || {}, canvasNodeHash: input.canvasNodeHash,
        attestationId: ref.attestationId, bindingSetId: ref.bindingSetId, deploymentId: ref.deploymentId,
        confirmExecution: true, confirmPaidExecution: true,
      } });
    const cancel = () => { try { runs.cancel(task.runId); } catch { /* Terminal runs need no cancellation. */ } };
    context.signal?.addEventListener('abort', cancel, { once: true });
    try {
      if (context.signal?.aborted) { cancel(); context.signal.throwIfAborted(); }
      task = await runs.getRun(task.runId);
      while (task.status === 'loading') {
        await delay(500, undefined, { signal: context.signal }); task = await runs.getRun(task.runId);
      }
      if (task.status !== 'success') throw nodeError(NODE_ERROR.FAILED, task.error || '工作流未完成', { runId: task.runId });
      return { runId: task.runId, outputs: (task.receipt?.outputs || []).map(output => ({ portId: output.portId, type: output.mediaKind, url: output.url, value: output.value })) };
    } finally { context.signal?.removeEventListener('abort', cancel); }
  };
}

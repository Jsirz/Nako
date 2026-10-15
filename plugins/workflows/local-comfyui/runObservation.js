import { workflowSupport } from '../../../modules/kernel/server.js';
import { LocalComfyClientError } from './client.js';

const classifyHistoryState = (...args) => workflowSupport().classifyHistory(...args);
const normalizeAvailableHistoryOutputs = (...args) => workflowSupport().availableHistoryOutputs(...args);
const toOutputCandidateDto = (...args) => workflowSupport().outputCandidate(...args);

export function handleRealtimeEvent({ coordinator }, { event, promptId, runId }) {
  const data = event?.data;
  const eventPromptId = String(data?.prompt_id || data?.promptId || '');
  if (!eventPromptId || eventPromptId !== promptId || !coordinator.isActive(runId)) return;
  const type = String(event?.type || '');
  if (type === 'execution_start') {
    coordinator.update(runId, { phase: 'running' });
    return;
  }
  if (type === 'executing') {
    const currentNodeId = data?.node == null ? null : String(data.node).slice(0, 120);
    coordinator.update(runId, {
      phase: currentNodeId ? 'running' : 'confirming-history',
      currentNodeId,
    });
    return;
  }
  if (type === 'progress') {
    const value = Number(data?.value);
    const maximum = Number(data?.max);
    if (Number.isFinite(value) && Number.isFinite(maximum) && maximum > 0) {
      coordinator.update(runId, {
        phase: 'running',
        progress: {
          value: Math.max(0, value),
          maximum,
          currentNodeId: data?.node == null ? null : String(data.node).slice(0, 120),
        },
      });
    }
    return;
  }
  if (type === 'execution_cached' && Array.isArray(data?.nodes)) {
    coordinator.update(runId, {
      cachedNodeIds: data.nodes.slice(0, 1_000).map((nodeId) => String(nodeId).slice(0, 120)),
    });
    return;
  }
  if (['execution_success', 'execution_error', 'execution_interrupted'].includes(type)) {
    coordinator.update(runId, { phase: 'confirming-history' });
  }
}

export async function waitForHistory(
  { now, coordinator, wait },
  { client, promptId, signal, runId, deadlineMs },
) {
  let latestHistory = null;
  let absentSince = null;
  while (now() < deadlineMs) {
    if (signal.aborted) return { state: 'cancel-requested' };
    try {
      const history = await client.getHistory(promptId, { signal });
      latestHistory = history;
      const classified = classifyHistoryState(history, promptId);
      if (classified.state !== 'pending') return { ...classified, history };
      // A restarted ComfyUI may have lost the original job. Do not occupy a local
      // admission slot for the full observation window, and never resubmit it.
      if (!Object.hasOwn(history || {}, promptId) && typeof client.getQueue === 'function') {
        try {
          const queue = await client.getQueue({ signal });
          const valid =
            Array.isArray(queue?.queue_running) &&
            Array.isArray(queue?.queue_pending) &&
            [...queue.queue_running, ...queue.queue_pending].every(
              (item) => Array.isArray(item) && typeof item[1] === 'string',
            );
          const present =
            valid &&
            [...queue.queue_running, ...queue.queue_pending].some((item) => item[1] === promptId);
          if (valid && !present) {
            absentSince ??= now();
            if (now() - absentSince >= 30_000) {
              coordinator.update(runId, { observationReason: 'original-job-not-found' });
              return { state: 'timeout', history };
            }
          } else absentSince = null;
        } catch {
          // A failed queue read is not evidence that the original task disappeared.
          absentSince = null;
        }
      } else absentSince = null;
    } catch (error) {
      // Once a prompt may have been submitted, an untrusted/oversized/malformed
      // history response cannot prove that the remote task stopped. Keep
      // observing until the deadline, then pause observation without changing
      // the remote job. Only an explicit user cancellation may stop it.
      absentSince = null;
      if (!(error instanceof LocalComfyClientError)) throw error;
      coordinator.update(runId, {
        historyObservationErrorCode: String(error.code || 'COMFYUI_PROTOCOL_ERROR').slice(0, 120),
      });
    }
    coordinator.heartbeat(runId);
    await wait(Math.min(1_000, Math.max(1, deadlineMs - now())));
  }
  return { state: 'timeout', history: latestHistory };
}

export function pauseObservation(
  { coordinator, now },
  { runId, promptId, deployment, history, executionPlan },
) {
  let availableOutputs;
  try {
    availableOutputs = normalizeAvailableHistoryOutputs({
      history,
      promptId,
      executionPlan,
    }).map(toOutputCandidateDto);
  } catch {
    availableOutputs = [];
  }
  const task = coordinator.getTask(runId);
  return coordinator.pauseObservation(runId, {
    code: 'WORKFLOW_OBSERVATION_PAUSED',
    error:
      task?.observationReason === 'original-job-not-found'
        ? '在 ComfyUI 队列和历史中持续未找到原任务，已暂停观察并释放本机并发名额。请核对 ComfyUI 任务记录；不会自动重新提交。'
        : '已到当前观察上限，尚未确认工作流结果；任务未取消，可继续观察。',
    retryable: false,
    remoteMayContinue: true,
    promptId,
    observationWindowMs: deployment.timeoutMs,
    observationElapsedMs:
      Math.max(0, now() - Date.parse(task?.createdAt || '')) || deployment.timeoutMs,
    availableOutputs,
  });
}

export async function cancelRemote({}, { client, promptId, deployment }) {
  if (!promptId) {
    return { remoteMayContinue: false, remoteCancelConfirmed: true };
  }
  if (!deployment.runtimeProtocol.supportsAtomicJobCancel) {
    return { remoteMayContinue: true, remoteCancelConfirmed: false };
  }
  try {
    const result = await client.cancelJob(promptId);
    if (result !== null) return { remoteMayContinue: false, remoteCancelConfirmed: true };
    const history = await client.getHistory(promptId);
    const state = classifyHistoryState(history, promptId).state;
    return {
      remoteMayContinue: state === 'pending',
      remoteCancelConfirmed: state !== 'pending',
    };
  } catch {
    return { remoteMayContinue: true, remoteCancelConfirmed: false };
  }
}

import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

export async function observeRecovery(ports, input, state) {
  const { coordinator, now, waitForHistory } = ports;
  const { signal } = input;
  const runId = input.task.nodeId;

  const { task } = input;
  const continuingObservation =
    task.phase === 'observation-resuming' || task.interruptedPhase === 'observation-paused';
  const persistedDeadline = Date.parse(task.absoluteDeadlineAt || '');
  let deadlineMs = continuingObservation
    ? now() + state.deployment.timeoutMs
    : Number.isFinite(persistedDeadline)
      ? persistedDeadline
      : now() + state.deployment.timeoutMs;
  const submissionWasUnknown = ['submitting', 'submission_unknown'].includes(task.interruptedPhase);
  if (submissionWasUnknown) deadlineMs = Math.min(deadlineMs, now() + 60000);
  const terminal = await waitForHistory({
    client: state.client,
    promptId: state.promptId,
    deployment: state.deployment,
    signal,
    runId,
    deadlineMs,
  });
  if (submissionWasUnknown && (terminal.state === 'success' || terminal.state === 'failed')) {
    coordinator.update(runId, {
      seedAdvancements: Array.isArray(task.pendingSeedAdvancements)
        ? task.pendingSeedAdvancements
        : [],
      seedAcceptedAt: new Date(now()).toISOString(),
    });
  }

  return { terminal, submissionWasUnknown };
}
export async function acceptRecoveryTerminal(
  ports,
  input,
  state,
  plan,
  terminal,
  submissionWasUnknown,
) {
  const { coordinator, cancelRemote, pauseObservation } = ports;
  const { signal } = input;
  const runId = input.task.nodeId;
  const { outputPlan } = plan;
  if (terminal.state === 'cancel-requested' || signal.aborted) {
    const remote = await cancelRemote({
      client: state.client,
      promptId: state.promptId,
      deployment: state.deployment,
    });
    state.remoteTerminalConfirmed = remote.remoteCancelConfirmed;
    coordinator.finalizeCancel(runId, { ...remote, promptId: state.promptId });
    return false;
  }
  if (terminal.state === 'timeout') {
    if (submissionWasUnknown) {
      coordinator.finalizeUnknown(runId, { promptId: state.promptId });
      return false;
    }
    state.observationPaused = true;
    pauseObservation({
      runId,
      promptId: state.promptId,
      deployment: state.deployment,
      history: terminal.history,
      executionPlan: outputPlan,
    });
    return false;
  }
  state.remoteTerminalConfirmed = terminal.state !== 'pending';
  if (terminal.state === 'failed') {
    throw new LocalComfyExecutorError('ComfyUI 执行工作流失败', 'COMFYUI_EXECUTION_FAILED', 409);
  }
  if (terminal.state !== 'success') {
    throw new LocalComfyExecutorError('ComfyUI history 终态无效', 'COMFYUI_HISTORY_INVALID', 502);
  }

  return true;
}

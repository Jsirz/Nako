import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

import { createComfyOutputPlan } from '../../../modules/workflow-runtime/api/server/workflowRuntime/comfySavedOutputs.js';

import { safeFailure } from './executorSafety.js';

import {
  localizeExecution,
  publishExecutionReceipt,
  rollbackUncommittedOutputs,
} from './runFinalization.js';
import { prepareExecution, stageExecution } from './runPreflight.js';
import { submitExecution } from './runSubmission.js';
export async function execute(ports, input) {
  const state = {
    promptId: null,
    assetSession: ports.createSnapshotAssetSession(input.runId),
    seedResolutionCache: new Map(),
  };
  try {
    const plan = await prepareExecution(ports, input, state);
    Object.assign(plan, await stageExecution(ports, input, state, plan));
    plan.outputPlan = createComfyOutputPlan(plan.compiled.apiJson);
    const submission = await submitExecution(ports, input, state, plan);
    if (!submission) return;
    ports.coordinator.update(input.runId, { phase: 'observing', promptId: state.promptId });
    const terminal =
      submission.observed ||
      (await ports.waitForHistory({
        client: plan.client,
        promptId: state.promptId,
        deployment: plan.deployment,
        signal: input.signal,
        runId: input.runId,
        deadlineMs: ports.now() + plan.deployment.timeoutMs,
      }));
    if (!(await acceptExecutionTerminal(ports, input, state, plan, terminal))) return;
    await localizeExecution(ports, input, state, plan, terminal);
    await publishExecutionReceipt(ports, input, state, plan);
  } catch (error) {
    await rollbackUncommittedOutputs(ports, state);
    await failExecution(ports, input, state, error);
  } finally {
    await disposeExecution(ports, input, state);
  }
}
export async function acceptExecutionTerminal(ports, input, state, plan, terminal) {
  const { coordinator, cancelRemote, pauseObservation } = ports;
  const { runId, signal } = input;
  const { client, deployment, outputPlan } = plan;
  if (terminal.state === 'cancel-requested' || signal.aborted) {
    const remote = await cancelRemote({ client, promptId: state.promptId, deployment });
    state.remoteTerminalConfirmed = remote.remoteCancelConfirmed;
    coordinator.finalizeCancel(runId, { ...remote, promptId: state.promptId });
    return false;
  }
  if (terminal.state === 'timeout') {
    state.observationPaused = true;
    pauseObservation({
      runId,
      promptId: state.promptId,
      deployment,
      history: terminal.history,
      executionPlan: outputPlan,
    });
    return false;
  }
  if (terminal.state === 'failed') {
    state.remoteTerminalConfirmed = true;
    throw new LocalComfyExecutorError('ComfyUI 执行工作流失败', 'COMFYUI_EXECUTION_FAILED', 409);
  }
  if (terminal.state !== 'success') {
    state.remoteTerminalConfirmed = true;
    throw new LocalComfyExecutorError('ComfyUI history 终态无效', 'COMFYUI_HISTORY_INVALID', 502);
  }
  state.remoteTerminalConfirmed = true;

  return true;
}
export async function failExecution(ports, input, state, error) {
  const { coordinator, configurationStore, clientFactory, cancelRemote, logger } = ports;
  const { runId, signal } = input;

  if (signal.aborted && coordinator.isActive(runId)) {
    const task = coordinator.getTask(runId);
    const deployment = task?.deploymentId
      ? await configurationStore.requireDeployment(task.deploymentId).catch(() => null)
      : null;
    const client = deployment
      ? clientFactory({
          serverUrl: deployment.connection.serverUrl,
          timeoutMs: deployment.timeoutMs,
        })
      : null;
    const remote =
      client && deployment
        ? await cancelRemote({ client, promptId: state.promptId, deployment })
        : { remoteMayContinue: Boolean(state.promptId), remoteCancelConfirmed: false };
    state.remoteTerminalConfirmed = remote.remoteCancelConfirmed;
    coordinator.finalizeCancel(runId, { ...remote, promptId: state.promptId });
    return;
  }
  const failure = safeFailure(error);
  coordinator.fail(runId, {
    code: failure.code,
    error: failure.message,
    ...(failure.nodeErrors?.length ? { nodeErrors: failure.nodeErrors } : {}),
    retryable: failure.retryable,
    remoteMayContinue: Boolean(
      error?.remoteMayContinue ?? (state.promptId && !state.remoteTerminalConfirmed),
    ),
  });
  logger.error('Local ComfyUI workflow test failed', {
    runId,
    code: failure.code,
    errorType: error?.name || 'Error',
  });
}
export async function disposeExecution(ports, input, state) {
  const { cleanupInputs, markInputsOrphaned } = ports;
  const { runId } = input;

  state.eventStream?.close();
  await Promise.allSettled(state.assetSession.snapshots.map((asset) => asset.disposeSnapshot?.()));
  if (
    !state.observationPaused &&
    state.stageLedger &&
    state.activeDeployment?.inputCleanupGrantId
  ) {
    if (!state.promptId || state.remoteTerminalConfirmed) {
      await cleanupInputs({
        runId,
        deployment: state.activeDeployment,
        client: state.activeClient,
        stageLedger: state.stageLedger,
      });
    } else {
      await markInputsOrphaned({
        runId,
        deployment: state.activeDeployment,
        stageLedger: state.stageLedger,
      });
    }
  }
}

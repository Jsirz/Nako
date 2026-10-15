import { workflowSupport } from '../../../modules/kernel/server.js';
import path from 'node:path';

const localizeWorkflowOutputs = (...args) => workflowSupport().localizeOutputs(...args);

const normalizeHistoryOutputs = (...args) => workflowSupport().historyOutputs(...args);

const validateWorkflowRunReceipt = (...args) => workflowSupport().validateReceipt(...args);

import { safeFailure } from './executorSafety.js';

export async function publishRecoveryOutputs(ports, input, state, plan, terminal) {
  const { coordinator, configurationStore, deploymentService, now, libraryDirectory, runStore } =
    ports;
  const { signal } = input;
  const runId = input.task.nodeId;
  const { definition, definitionRevision, apiJson, executionPlanHash, bindingSet, outputPlan } =
    plan;
  const { task } = input;
  coordinator.update(runId, { phase: 'recovery-localizing-outputs' });
  const candidates = normalizeHistoryOutputs({
    history: terminal.history,
    promptId: state.promptId,
    executionPlan: outputPlan,
  });
  state.localized = await localizeWorkflowOutputs({
    candidates,
    executionPlan: outputPlan,
    client: state.client,
    libraryDirectory: libraryDirectory,
    projectId: task.projectId,
    runId,
    stagingDirectory: path.join(runStore.rootDirectory, 'output-staging'),
    signal,
  });
  await deploymentService.verifyDeployment(state.deployment, apiJson);
  const receiptPayload = {
    id: runId,
    schemaVersion: 1,
    definitionId: definition.id,
    definitionRevision,
    executionPlanHash,
    bindingSetId: bindingSet.id,
    bindingSetHash: bindingSet.bindingSetHash,
    deploymentId: state.deployment.id,
    deploymentSnapshotHash: state.deployment.deploymentSnapshotHash,
    relevantCapabilityHash: state.deployment.relevantCapabilityHash,
    projectId: task.projectId,
    compiledPromptHash: task.compiledPromptHash,
    promptId: state.promptId,
    seeds: Array.isArray(task.resolvedSeeds) ? task.resolvedSeeds : [],
    outputs: state.localized.outputs,
    succeededAt: new Date(now()).toISOString(),
  };
  await validateWorkflowRunReceipt({
    coordinator: coordinator,
    configurationStore: configurationStore,
    runId,
    receipt: receiptPayload,
  });
  state.pendingReceipt = await runStore.stagePendingReceipt(runId, receiptPayload);
  const committed = coordinator.completeIfActive(
    runId,
    state.pendingReceipt.receiptPayloadHash,
    state.pendingReceipt.pendingReceiptId,
  );
  if (!committed) {
    await state.localized.rollback();
    await runStore.discardPendingReceipt(state.pendingReceipt.pendingReceiptId);
    return;
  }
  state.schedulerCommitted = true;
  await runStore.publishReceipt(
    state.pendingReceipt.pendingReceiptId,
    committed.schedulerCommitProof,
  );
  await state.localized.commit();
}
export async function failRecovery(ports, input, state, error) {
  const { coordinator, cancelRemote, logger } = ports;
  const { signal } = input;
  const runId = input.task.nodeId;

  if (signal.aborted) {
    const remote = state.remoteTerminalConfirmed
      ? { remoteMayContinue: false, remoteCancelConfirmed: true }
      : state.client && state.deployment
        ? await cancelRemote({
            client: state.client,
            promptId: state.promptId,
            deployment: state.deployment,
          })
        : { remoteMayContinue: true, remoteCancelConfirmed: false };
    state.remoteTerminalConfirmed = remote.remoteCancelConfirmed;
    coordinator.finalizeCancel(runId, { ...remote, promptId: state.promptId });
    return;
  }
  const failure = safeFailure(error);
  coordinator.fail(runId, {
    phase: 'recovery-failed',
    code: failure.code,
    error: failure.message,
    retryable: failure.retryable,
    remoteMayContinue: Boolean(
      error?.remoteMayContinue ?? (state.promptId && !state.remoteTerminalConfirmed),
    ),
  });
  logger.error('Local ComfyUI workflow recovery failed', {
    runId,
    code: failure.code,
    errorType: error?.name || 'Error',
  });
}
export async function disposeRecovery(ports, input, state) {
  const { cleanupInputs, markInputsOrphaned } = ports;
  const runId = input.task.nodeId;

  state.eventStream?.close();
  if (!state.observationPaused && state.stageLedger?.cleanupState === 'pending') {
    if (state.deployment?.inputCleanupGrantId && state.remoteTerminalConfirmed) {
      await cleanupInputs({ runId, deployment: state.deployment, stageLedger: state.stageLedger });
    } else {
      await markInputsOrphaned({
        runId,
        deployment: state.deployment,
        stageLedger: state.stageLedger,
        code: state.deployment?.inputCleanupGrantId
          ? 'INPUT_CLEANUP_REMOTE_MAY_CONTINUE'
          : 'INPUT_CLEANUP_GRANT_UNAVAILABLE',
      });
    }
  }
}

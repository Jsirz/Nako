import { workflowSupport } from '../../../modules/kernel/server.js';
import path from 'node:path';

const localizeWorkflowOutputs = (...args) => workflowSupport().localizeOutputs(...args);

const normalizeHistoryOutputs = (...args) => workflowSupport().historyOutputs(...args);

const validateWorkflowRunReceipt = (...args) => workflowSupport().validateReceipt(...args);

export async function localizeExecution(ports, input, state, plan, terminal) {
  const { coordinator, libraryDirectory, runStore } = ports;
  const { runId, projectId, signal } = input;
  const { outputPlan, client } = plan;
  coordinator.update(runId, { phase: 'localizing-outputs' });
  const candidates = normalizeHistoryOutputs({
    history: terminal.history,
    promptId: state.promptId,
    executionPlan: outputPlan,
  });
  state.localized = await localizeWorkflowOutputs({
    candidates,
    executionPlan: outputPlan,
    client,
    libraryDirectory: libraryDirectory,
    projectId,
    runId,
    stagingDirectory: path.join(runStore.rootDirectory, 'output-staging'),
    signal,
  });
}
export async function publishExecutionReceipt(ports, input, state, plan) {
  const { coordinator, configurationStore, deploymentService, now, runStore } = ports;
  const { runId, projectId } = input;
  const { definition, apiJson, executionPlanHash, deployment, bindingSet, compiled } = plan;
  await deploymentService.verifyDeployment(deployment, apiJson);
  const succeededAt = new Date(now()).toISOString();
  const receiptPayload = {
    id: runId,
    schemaVersion: 1,
    definitionId: definition.id,
    definitionRevision: definition.revision,
    executionPlanHash,
    bindingSetId: bindingSet.id,
    bindingSetHash: bindingSet.bindingSetHash,
    deploymentId: deployment.id,
    deploymentSnapshotHash: deployment.deploymentSnapshotHash,
    relevantCapabilityHash: deployment.relevantCapabilityHash,
    projectId,
    compiledPromptHash: compiled.compiledPromptHash,
    promptId: state.promptId,
    seeds: compiled.resolvedSeeds,
    outputs: state.localized.outputs,
    succeededAt,
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
export async function rollbackUncommittedOutputs(ports, state) {
  const { runStore } = ports;

  if (state.localized && !state.schedulerCommitted) {
    await state.localized.rollback().catch(() => undefined);
    if (state.pendingReceipt) {
      await runStore
        .discardPendingReceipt(state.pendingReceipt.pendingReceiptId)
        .catch(() => undefined);
    }
  }
}

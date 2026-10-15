import { workflowSupport } from '../../../modules/kernel/server.js';
import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

const classifyHistoryState = (...args) => workflowSupport().classifyHistory(...args);

import { SAFE_PROMPT_ID } from './executorSafety.js';

export async function cleanupInputs(
  { directoryGrantStore, runStore, logger },
  { runId, deployment, stageLedger },
) {
  if (!deployment.inputCleanupGrantId || !stageLedger || !directoryGrantStore) return;
  try {
    const result = await directoryGrantStore.deleteOwnedStagedFiles(
      deployment.inputCleanupGrantId,
      runId,
      stageLedger.ledgerEntries || stageLedger.entries || [],
    );
    await runStore.saveInputStageLedger(runId, {
      deploymentId: deployment.id,
      cleanupGrantId: deployment.inputCleanupGrantId,
      cleanupState: 'cleaned',
      totalBytes: stageLedger.totalBytes,
      entries: result.results,
    });
  } catch (error) {
    await runStore
      .saveInputStageLedger(runId, {
        deploymentId: deployment.id,
        cleanupGrantId: deployment.inputCleanupGrantId,
        cleanupState: 'orphaned',
        cleanupCode: error?.code || 'INPUT_CLEANUP_FAILED',
        totalBytes: stageLedger.totalBytes,
        entries: stageLedger.ledgerEntries || stageLedger.entries || [],
      })
      .catch(() => undefined);
    logger.error('Local ComfyUI staged input cleanup failed', {
      runId,
      code: error?.code || 'INPUT_CLEANUP_FAILED',
      errorType: error?.name || 'Error',
    });
  }
}

export async function markInputsOrphaned(
  { runStore },
  { runId, deployment, stageLedger, code = 'INPUT_CLEANUP_REMOTE_MAY_CONTINUE' },
) {
  if (!stageLedger) return;
  await runStore.saveInputStageLedger(runId, {
    deploymentId: deployment?.id || stageLedger.deploymentId,
    cleanupGrantId: deployment?.inputCleanupGrantId || stageLedger.cleanupGrantId,
    cleanupState: 'orphaned',
    cleanupCode: code,
    totalBytes: Number(stageLedger.totalBytes || 0),
    entries: stageLedger.ledgerEntries || stageLedger.entries || [],
  });
}

export async function markRecoveryInputsOrphaned(
  { configurationStore, runStore, markInputsOrphaned },
  task,
  code,
) {
  const runId = task?.nodeId;
  const [deployment, stageLedger] = await Promise.all([
    task?.deploymentId
      ? configurationStore.requireDeployment(task.deploymentId).catch(() => null)
      : null,
    runId ? runStore.requireInputStageLedger(runId).catch(() => null) : null,
  ]);
  if (stageLedger?.cleanupState !== 'pending') return;
  await markInputsOrphaned({ runId, deployment, stageLedger, code });
}

export async function retryInputCleanup(
  { runStore, configurationStore, coordinator, clientFactory, cleanupInputs },
  runId,
) {
  const ledger = await runStore.requireInputStageLedger(runId);
  if (ledger.cleanupState === 'cleaned') {
    return {
      runId,
      state: 'cleaned',
      totalBytes: Number(ledger.totalBytes || 0),
      updatedAt: ledger.updatedAt,
    };
  }
  if (ledger.cleanupState !== 'orphaned') {
    throw new LocalComfyExecutorError(
      '只有已确认遗留的 ComfyUI 暂存输入可以重试清理',
      'INPUT_CLEANUP_NOT_RETRYABLE',
      409,
    );
  }
  const deployment = await configurationStore.requireDeployment(ledger.deploymentId);
  if (!deployment.inputCleanupGrantId || ledger.cleanupGrantId !== deployment.inputCleanupGrantId) {
    throw new LocalComfyExecutorError(
      '此运行没有可重试的输入目录清理授权',
      'INPUT_CLEANUP_UNAVAILABLE',
      409,
    );
  }
  const task = coordinator.getTask(runId);
  let stopped =
    task?.status === 'success' ||
    (['failed', 'cancelled'].includes(task?.status) && task.remoteMayContinue === false);
  if (!stopped && SAFE_PROMPT_ID.test(String(task?.promptId || ''))) {
    try {
      const client = clientFactory({ serverUrl: deployment.connection.serverUrl });
      const history = await client.getHistory(task.promptId);
      stopped = ['success', 'failed'].includes(classifyHistoryState(history, task.promptId).state);
    } catch {
      /* Unavailable history is not proof that the remote task stopped. */
    }
  }
  if (!stopped) {
    throw new LocalComfyExecutorError(
      '原任务仍可能使用这些素材，确认 ComfyUI 任务结束后才能清理。',
      'INPUT_CLEANUP_REMOTE_MAY_CONTINUE',
      409,
    );
  }
  await cleanupInputs({ runId, deployment, stageLedger: ledger });
  const current = await runStore.requireInputStageLedger(runId);
  if (current.cleanupState !== 'cleaned') {
    throw new LocalComfyExecutorError(
      '输入缓存清理仍未完成，请检查目录授权后重试',
      current.cleanupCode || 'INPUT_CLEANUP_FAILED',
      409,
    );
  }
  return {
    runId,
    state: current.cleanupState,
    totalBytes: Number(current.totalBytes || 0),
    updatedAt: current.updatedAt,
  };
}

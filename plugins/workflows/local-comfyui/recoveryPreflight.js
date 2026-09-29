import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

import { createComfyOutputPlan } from '../../../modules/workflow-runtime/api/server/workflowRuntime/comfySavedOutputs.js';

import { assertPromptId } from './executorSafety.js';

export async function validateRecoveryMetadata(ports, input) {
  const { coordinator, markRecoveryInputsOrphaned } = ports;
  const runId = input.task.nodeId;

  const { task } = input;
  const rawPromptId = String(task.promptId || '');
  const promptId = rawPromptId
    ? (() => {
        try {
          return assertPromptId(rawPromptId);
        } catch {
          return '';
        }
      })()
    : '';
  if (rawPromptId && !promptId) {
    coordinator.fail(runId, {
      phase: 'recovery-failed',
      code: 'COMFYUI_PROTOCOL_ERROR',
      error: '恢复任务的 ComfyUI prompt_id 无效。',
      retryable: false,
      remoteMayContinue: true,
    });
    await markRecoveryInputsOrphaned(task, 'INPUT_CLEANUP_REMOTE_MAY_CONTINUE');
    return null;
  }
  if (promptId && !/^[a-f\d]{64}$/i.test(String(task.compiledPromptHash || ''))) {
    coordinator.fail(runId, {
      phase: 'recovery-failed',
      code: 'WORKFLOW_RECOVERY_INSUFFICIENT_METADATA',
      error: '旧任务缺少编译快照，无法签发可信测试凭证。',
      retryable: false,
      remoteMayContinue: true,
    });
    await markRecoveryInputsOrphaned(task, 'INPUT_CLEANUP_REMOTE_MAY_CONTINUE');
    return null;
  }

  return promptId;
}
export async function failBeforeSubmission(ports, input, state) {
  const { coordinator, configurationStore, cleanupInputs, markInputsOrphaned } = ports;
  const runId = input.task.nodeId;

  const { task } = input;
  if (!state.promptId) {
    state.deployment = task.deploymentId
      ? await configurationStore.requireDeployment(task.deploymentId).catch(() => null)
      : null;
    coordinator.fail(runId, {
      phase: 'recovery-failed',
      code: 'WORKFLOW_INTERRUPTED_BEFORE_SUBMISSION',
      error: '服务在工作流提交前中断；该任务没有发送到 ComfyUI。',
      retryable: true,
      remoteMayContinue: false,
    });
    if (state.stageLedger && state.deployment?.inputCleanupGrantId) {
      await cleanupInputs({ runId, deployment: state.deployment, stageLedger: state.stageLedger });
    } else if (state.stageLedger?.cleanupState === 'pending') {
      await markInputsOrphaned({
        runId,
        deployment: state.deployment,
        stageLedger: state.stageLedger,
        code: 'INPUT_CLEANUP_GRANT_UNAVAILABLE',
      });
    }
    return;
  }
}
export async function loadRecoveryPlan(ports, input, state) {
  const { coordinator, definitionStore, configurationStore, clientFactory } = ports;
  const runId = input.task.nodeId;

  const { task } = input;
  coordinator.update(runId, { phase: 'recovery-observing' });
  const [plan, loadedDeployment, bindingSet] = await Promise.all([
    definitionStore.readExecutionPlan(task.definitionId, {
      executionPlanHash: task.executionPlanHash,
    }),
    configurationStore.requireDeployment(task.deploymentId),
    configurationStore.requireBindingSet(task.bindingSetId),
  ]);
  state.deployment = loadedDeployment;
  const { definition, apiJson, executionPlanHash } = plan;
  const outputPlan = task.comfyOutputPlan || createComfyOutputPlan(apiJson);
  const definitionRevision = Number(task.definitionRevision);
  if (
    !Number.isInteger(definitionRevision) ||
    definitionRevision < 1 ||
    state.deployment.definitionId !== definition.id ||
    state.deployment.definitionRevision !== definitionRevision ||
    bindingSet.definitionId !== definition.id ||
    bindingSet.definitionRevision !== definitionRevision ||
    state.deployment.executionPlanHash !== executionPlanHash ||
    bindingSet.executionPlanHash !== executionPlanHash
  ) {
    throw new LocalComfyExecutorError(
      '恢复任务的工作流、部署与参数配置引用冲突',
      'WORKFLOW_REFERENCE_CONFLICT',
      409,
    );
  }
  state.client = clientFactory({
    serverUrl: state.deployment.connection.serverUrl,
    timeoutMs: state.deployment.timeoutMs,
  });

  return { definition, definitionRevision, apiJson, executionPlanHash, bindingSet, outputPlan };
}

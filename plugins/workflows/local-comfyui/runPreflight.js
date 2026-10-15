import { workflowSupport } from '../../../modules/kernel/server.js';
import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

const compileWorkflowBindings = (...args) => workflowSupport().compileBindings(...args);
const resolvePublicBindingValues = (...args) => workflowSupport().resolveBindingValues(...args);

import { workflowAssetKey } from '../../../modules/contracts/workflowSupport.js';

export async function prepareExecution(ports, input, state) {
  const { coordinator, definitionStore, configurationStore, deploymentService } = ports;
  const { runId, definitionId, deploymentId, bindingSetId, projectId, values, signal } = input;
  const { assetSession, seedResolutionCache } = state;
  coordinator.update(runId, { phase: 'preflight' });
  const [{ definition, apiJson, executionPlanHash }, deployment, bindingSet] = await Promise.all([
    definitionStore.readExecutionPlan(definitionId),
    configurationStore.requireDeployment(deploymentId),
    configurationStore.requireBindingSet(bindingSetId),
  ]);
  state.activeDeployment = deployment;
  if (
    deployment.definitionId !== definition.id ||
    deployment.definitionRevision !== definition.revision ||
    bindingSet.definitionId !== definition.id ||
    bindingSet.definitionRevision !== definition.revision ||
    deployment.executionPlanHash !== executionPlanHash ||
    bindingSet.executionPlanHash !== executionPlanHash
  ) {
    throw new LocalComfyExecutorError(
      '工作流、部署与参数配置引用冲突',
      'WORKFLOW_REFERENCE_CONFLICT',
      409,
    );
  }
  await deploymentService.verifyDeployment(deployment, apiJson);
  const publicValues = resolvePublicBindingValues(bindingSet, values || {});
  const preflight = await compileWorkflowBindings({
    executionPlan: apiJson,
    bindingSet,
    deployment,
    projectId,
    values: publicValues,
    resolveAsset: assetSession.resolve,
    seedResolutionCache,
  });
  if (signal.aborted)
    throw new LocalComfyExecutorError('工作流测试已取消', 'WORKFLOW_RUN_CANCELLED');

  return { definition, apiJson, executionPlanHash, deployment, bindingSet, publicValues, preflight };
}
export async function stageExecution(ports, input, state, plan) {
  const { coordinator, deploymentService, clientFactory, stageInputs } = ports;
  const { runId, projectId, signal } = input;
  const { deployment, apiJson, bindingSet, publicValues, preflight } = plan;
  const { seedResolutionCache } = state;
  const client = clientFactory({
    serverUrl: deployment.connection.serverUrl,
    timeoutMs: deployment.timeoutMs,
  });
  state.activeClient = client;
  coordinator.update(runId, { phase: 'staging-inputs' });
  state.stageLedger = {};
  await stageInputs({
    runId,
    deployment,
    client,
    assets: preflight.assets,
    stageLedger: state.stageLedger,
    signal,
  });
  await deploymentService.verifyDeployment(deployment, apiJson);
  const compiled = await compileWorkflowBindings({
    executionPlan: apiJson,
    bindingSet,
    deployment,
    projectId,
    values: publicValues,
    resolveAsset: async (reference) => {
      const staged = state.stageLedger.stagedByAssetId.get(workflowAssetKey(reference));
      if (!staged) {
        throw new LocalComfyExecutorError('暂存素材映射丢失', 'WORKFLOW_STAGE_INTEGRITY_ERROR');
      }
      return staged;
    },
    seedResolutionCache,
  });

  return { compiled, client };
}

import type {
  WorkflowCanvasNodeRecord,
  WorkflowCanvasNodesAdapter,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasClient, WorkflowRun } from './workflowManagerClient';

import {
  createWorkflowRunObserver,
  requireWorkflowScope,
  type WorkflowRunScope,
} from './workflowRunObserver';

import { registerWorkflowRecoveryOwner } from '../../../generation-core/api/ui/generation/workflowRecoveryBoundary';

import {
  requestAnchoredConfirmation,
  RUNNINGHUB_PAID_CONFIRMATION_KEY,
} from '../../../canvas-ui/api/ui/design/designSystem';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import { applyWorkflowSeedAdvancements } from './workflowNodeParameters';
import { canvasRunningHubInstanceType, workflowErrorSummary } from './workflowNodePresentation';
import {
  publishExternalOutputs,
  publishRunProgress,
  runPatch,
  TERMINAL_STATUSES,
} from './workflowNodeReceipts';
import type { NodePatch } from './workflowNodeTypes';
import { buildWorkflowCanvasValues } from './workflowNodeValues';

export function createWorkflowNodeObserver(client: WorkflowCanvasClient) {
  const observeRun = createWorkflowRunObserver((runId) => client.getRun(runId));
  function observe(
    node: WorkflowCanvasNodeRecord,
    runId: string,
    onPatch: (patch: NodePatch) => void,
    scope?: WorkflowRunScope,
  ): Promise<WorkflowRun> {
    return observeRun(runId, {
      scope,
      receive(run, terminal) {
        if (scope && !scope.isCurrent()) return;
        onPatch(runPatch(scope?.getNode?.() ?? node, run));
        publishRunProgress(node, run);
        if (terminal) publishExternalOutputs(node, run);
      },
      pause(error) {
        if (scope && !scope.isCurrent()) return;
        onPatch({
          executionState: {
            ...(scope?.getNode?.() ?? node).executionState,
            status: 'observing-paused',
            runId,
            error: error instanceof Error ? error.message : '查询任务失败',
          },
          errorMessage: '任务仍可能在运行，网络恢复后可继续查询。',
          errorSummary: '网络连接失败',
          isWorkflowErrorDetailsOpen: false,
        });
      },
    });
  }
  return observe;
}

export function createWorkflowRunOperations(
  context: WorkflowCanvasOperationContext,
): Pick<WorkflowCanvasNodesAdapter, 'applySeedAdvancements' | 'run' | 'resume' | 'cancel'> {
  return {
    applySeedAdvancements: applyWorkflowSeedAdvancements,
    run: run.bind(null, context),
    resume: resume.bind(null, context),
    cancel: cancel.bind(null, context),
  };
}

async function run(
  context: WorkflowCanvasOperationContext,
  ...[node, connectedNodes, projectId, writePatch, scope]: Parameters<
    WorkflowCanvasNodesAdapter['run']
  >
): ReturnType<WorkflowCanvasNodesAdapter['run']> {
  const { client, observe } = context;

  requireWorkflowScope(scope);
  const onPatch = (patch: NodePatch) => {
    if (!scope || scope.isCurrent()) writePatch(patch);
  };
  registerWorkflowRecoveryOwner(node.id);
  let values: Record<string, unknown>;
  try {
    values = buildWorkflowCanvasValues(node, connectedNodes, projectId);
  } catch (error) {
    onPatch({
      status: 'error',
      executionState: { status: 'validation-error' },
      errorMessage: error instanceof Error ? error.message : '工作流输入校验失败',
      errorSummary: workflowErrorSummary(
        error instanceof Error ? error.message : '工作流输入校验失败',
      ),
      isWorkflowErrorDetailsOpen: false,
    });
    throw error;
  }
  const paid =
    node.executionTarget === 'cloud' || String(node.subtitle || '').startsWith('RunningHub');
  const instanceType = canvasRunningHubInstanceType(node.runningHubInstanceType);
  if (
    paid &&
    !(await requestAnchoredConfirmation({
      intent: 'paid',
      title: '提交 RunningHub 付费任务？',
      description:
        instanceType === 'plus'
          ? '本次使用 PLUS 48GB，大显存档位会产生较高费用；取消后远端任务仍可能继续。'
          : '本次使用 STANDARD 24GB 并会产生费用；取消后远端任务仍可能继续。',
      confirmLabel: '确认并运行',
      rememberKey: RUNNINGHUB_PAID_CONFIRMATION_KEY,
    }))
  ) {
    throw new Error('已取消 RunningHub 付费执行');
  }
  requireWorkflowScope(scope);
  onPatch({
    status: 'loading',
    executionState: { status: 'submitting' },
    errorMessage: undefined,
    errorSummary: undefined,
    isWorkflowErrorDetailsOpen: false,
  });
  try {
    const run = await client.startCanvasRun(node.workflowRef.definitionId, {
      attestationId: node.workflowRef.attestationId,
      ...(node.workflowRef.attestationId ? {} : { deploymentId: node.workflowRef.deploymentId }),
      bindingSetId: node.workflowRef.bindingSetId,
      canvasNodeHash: node.canvasNodeHash,
      projectId,
      values,
      confirmExecution: true,
      ...(paid ? { confirmPaidExecution: true as const } : {}),
      ...(paid ? { instanceType } : {}),
    });
    requireWorkflowScope(scope);
    onPatch(runPatch(scope?.getNode?.() ?? node, run));
    publishRunProgress(node, run);
    if (TERMINAL_STATUSES.has(run.status)) {
      publishExternalOutputs(node, run);
      return run;
    }
    return observe(node, run.runId, onPatch, scope);
  } catch (error) {
    onPatch({
      status: 'error',
      executionState: { status: 'submission-error' },
      errorMessage: error instanceof Error ? error.message : '工作流提交失败',
      errorSummary: workflowErrorSummary(error instanceof Error ? error.message : '工作流提交失败'),
      isWorkflowErrorDetailsOpen: false,
    });
    throw error;
  }
}

async function resume(
  context: WorkflowCanvasOperationContext,
  ...[node, onPatch, scope, continuePaused = false]: Parameters<
    WorkflowCanvasNodesAdapter['resume']
  >
): ReturnType<WorkflowCanvasNodesAdapter['resume']> {
  const { client, observe } = context;

  requireWorkflowScope(scope);
  registerWorkflowRecoveryOwner(node.id);
  const runId =
    typeof node.executionState?.runId === 'string' ? node.executionState.runId : undefined;
  if (!runId) return null;
  if (continuePaused && node.executionState?.phase === 'observation-paused') {
    const run = await client.continueObservation(runId);
    requireWorkflowScope(scope);
    if (run.runId !== runId) throw new Error('任务回执编号不匹配');
    onPatch(runPatch(scope?.getNode?.() ?? node, run));
    if (TERMINAL_STATUSES.has(run.status)) {
      publishExternalOutputs(node, run);
      return run;
    }
    if (run.phase === 'observation-paused') return run;
  }
  return observe(node, runId, onPatch, scope);
}

async function cancel(
  context: WorkflowCanvasOperationContext,
  ...[node, onPatch, scope]: Parameters<WorkflowCanvasNodesAdapter['cancel']>
): ReturnType<WorkflowCanvasNodesAdapter['cancel']> {
  const { client } = context;

  requireWorkflowScope(scope);
  registerWorkflowRecoveryOwner(node.id);
  const runId =
    typeof node.executionState?.runId === 'string' ? node.executionState.runId : undefined;
  if (!runId) return null;
  const run = await client.cancelRun(runId);
  requireWorkflowScope(scope);
  if (run.runId !== runId) throw new Error('任务回执编号不匹配');
  onPatch(runPatch(scope?.getNode?.() ?? node, run));
  publishRunProgress(node, run);
  return run;
}

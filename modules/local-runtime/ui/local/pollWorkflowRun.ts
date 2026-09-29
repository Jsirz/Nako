import type {
WorkflowDefinition,
WorkflowManagerClient,
WorkflowRun
} from './workflowManagerClient';
import { messageFor } from './workflowManagerControls';
import { isRunningHubRunner } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { ManagerState } from './workflowManagerTypes';
import {
cleanupObservationPending,
observeWorkflowRun,
terminalRunNotice,
} from './workflowRunObservation';
import { persistRunReference } from './workflowRunSession';

export function pollWorkflowRun(
  state: ManagerState,
  client: WorkflowManagerClient,
  session: WorkflowManagerSession,
  hydrate: (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => Promise<void>,
  refreshStatus: () => void,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  render: () => void,
) {
  return async (runId: string, token: number) => {
    state.pollingPaused = false;
    const observation = await observeWorkflowRun(client, runId, {
      shouldContinue: () => token === session.pollToken,
      onRun: async (run) => {
        const definition =
          state.definitions.find((item) => item.id === run.definitionId) || state.selected;
        if (
          definition &&
          (state.selected?.id !== definition.id ||
            (run.deploymentId && state.deployment?.id !== run.deploymentId) ||
            (run.bindingSetId && state.bindingSet?.id !== run.bindingSetId))
        ) {
          await hydrate(definition, run);
        }
        state.run = run;
        state.projectId = run.projectId || state.projectId;
        persistRunReference(state.selected!.id, runId);
        refreshStatus();
        if (cleanupObservationPending(run)) {
          setNotice('任务已结束，正在核对 ComfyUI 暂存输入。');
        } else if (run.status === 'loading') {
          setNotice(
            `${isRunningHubRunner(run.runner) ? 'RunningHub' : 'ComfyUI'} 正在执行：${run.phase || '运行中'}`,
          );
        }
        render();
      },
      onRetry: (_error, attempt) => {
        setNotice(`与本机服务的查询暂时中断，正在第 ${attempt} 次自动重连…`);
      },
    });
    if (token !== session.pollToken) return;
    if (observation.paused || !observation.run) {
      state.pollingPaused = true;
      setNotice(
        observation.error
          ? `查询已暂停：${messageFor(observation.error)}。可点击“继续查询”，不会重复运行。`
          : '查询已暂停，可点击“继续查询”。',
        'error',
      );
      render();
      return;
    }
    const run = observation.run;
    state.run = run;
    state.pollingPaused = false;
    if (run.status === 'success') {
      try {
        state.outputCandidates = await client.listOutputCandidates(state.selected!.id, runId);
        state.activeStage = 4;
        setNotice(`测试完成，找到 ${state.outputCandidates.length} 个输出。`, 'success');
      } catch (error) {
        state.pollingPaused = true;
        setNotice(`输出读取暂时失败：${messageFor(error)}。可点击“继续查询”恢复。`, 'error');
      }
    } else if (run.phase === 'observation-paused') {
      setNotice(terminalRunNotice(run));
    } else {
      setNotice(terminalRunNotice(run), 'error');
    }
    render();
  };
}

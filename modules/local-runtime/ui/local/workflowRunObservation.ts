import type { WorkflowManagerClient,WorkflowRun } from './workflowManagerClient';
import { isRunningHubRunner } from './workflowManagerMetadata';
export function terminalRunNotice(run: WorkflowRun) {
  if (run.phase === 'observation-paused') {
    const windowMinutes = Math.max(1, Math.round(Number(run.observationWindowMs || 0) / 60_000));
    const elapsedMinutes = Math.max(
      windowMinutes,
      Math.round(Number(run.observationElapsedMs || run.observationWindowMs || 0) / 60_000),
    );
    const node = run.currentNodeId ? `当前停留在节点 ${run.currentNodeId}，` : '';
    const outputs = run.availableOutputs?.length
      ? `已识别 ${run.availableOutputs.length} 个输出`
      : '暂未识别已完成输出';
    return `已观察约 ${elapsedMinutes} 分钟，到达当前 ${windowMinutes} 分钟观察上限。ComfyUI 任务未取消，${node}${outputs}；可继续观察同一任务。`;
  }
  if (run.remoteMayContinue) {
    return isRunningHubRunner(run.runner)
      ? '画布已停止接收结果，但 RunningHub 任务可能仍在运行；请到 RunningHub 任务列表确认。'
      : '画布已停止接收结果，但 ComfyUI 任务可能仍在运行；请到 ComfyUI 队列手动停止。';
  }
  const [nodeError] = run.nodeErrors || [];
  if (nodeError) {
    return `ComfyUI 节点 ${nodeError.nodeId}（${nodeError.errorType}）拒绝参数：${nodeError.message}`;
  }
  return run.error || `测试结束：${run.code || run.status}`;
}

export function workflowRunProgressLabel(run: WorkflowRun) {
  const nodeId = run.progress?.currentNodeId || run.currentNodeId;
  const value = Number(run.progress?.value);
  const maximum = Number(run.progress?.maximum);
  if (Number.isFinite(value) && Number.isFinite(maximum) && maximum > 0) {
    const boundedValue = Math.min(maximum, Math.max(0, value));
    const percent = Math.round((boundedValue / maximum) * 100);
    return `${nodeId ? `节点 ${nodeId} · ` : ''}当前步骤 ${boundedValue}/${maximum} · ${percent}%`;
  }
  if (run.realtimeChannel === 'history-fallback') {
    return `实时通道已断开，正在轮询 ComfyUI${nodeId ? ` · 节点 ${nodeId}` : ''}`;
  }
  if (nodeId) return `正在执行节点 ${nodeId}`;
  return run.phase || `${isRunningHubRunner(run.runner) ? 'RunningHub' : 'ComfyUI'} 正在执行`;
}

export function retryablePollError(error: unknown) {
  const status = (error as { status?: unknown })?.status;
  return status === undefined || status === 404 || (typeof status === 'number' && status >= 500);
}

export function cleanupObservationPending(run: WorkflowRun) {
  return run.status !== 'loading' && run.inputCleanup?.state === 'pending';
}

export async function observeWorkflowRun(
  client: Pick<WorkflowManagerClient, 'getRun'>,
  runId: string,
  {
    shouldContinue = () => true,
    onRun = () => undefined,
    onRetry = () => undefined,
    wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    maxConsecutiveErrors = 6,
  }: {
    shouldContinue?: () => boolean;
    onRun?: (run: WorkflowRun) => void | Promise<void>;
    onRetry?: (error: unknown, attempt: number) => void;
    wait?: (milliseconds: number) => Promise<unknown>;
    maxConsecutiveErrors?: number;
  } = {},
): Promise<{ run?: WorkflowRun; paused: boolean; error?: unknown }> {
  let consecutiveErrors = 0;
  while (shouldContinue()) {
    try {
      const run = await client.getRun(runId);
      await onRun(run);
      consecutiveErrors = 0;
      if (
        run.phase === 'observation-paused' ||
        (run.status !== 'loading' && !cleanupObservationPending(run))
      ) {
        return { run, paused: false };
      }
      await wait(1_000);
    } catch (error) {
      consecutiveErrors += 1;
      if (!retryablePollError(error) || consecutiveErrors > maxConsecutiveErrors) {
        return { paused: true, error };
      }
      onRetry(error, consecutiveErrors);
      await wait(Math.min(5_000, 500 * 2 ** (consecutiveErrors - 1)));
    }
  }
  return { paused: true };
}

import { requestAnchoredConfirmation } from '../../../canvas-ui/api/ui/design/designSystem';
import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { ManagerState } from './workflowManagerTypes';

export function renderWorkflowCleanup(
  state: ManagerState,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  panel: HTMLDivElement,
) {
  return () => {
    if (!state.run?.inputCleanup) return;
    const cleanup = element('div', 'fwm-summary');
    const label =
      state.run.inputCleanup.state === 'retained-cache'
        ? '输入副本保留在 ComfyUI 缓存'
        : state.run.inputCleanup.state === 'cleaned'
          ? 'ComfyUI 暂存输入已清理'
          : state.run.inputCleanup.state === 'orphaned'
            ? 'ComfyUI 暂存输入尚未清理'
            : '正在核对 ComfyUI 暂存输入';
    cleanup.append(
      element('strong', '', label),
      element('span', '', `${(state.run.inputCleanup.totalBytes / 1024 / 1024).toFixed(1)} MiB`),
    );
    if (state.run.inputCleanup.retryable) {
      const retry = button('重试清理');
      retry.addEventListener('click', () => {
        void runBusy('正在重新核对并清理暂存输入…', async () => {
          let confirmRemoteStopped = false;
          if (state.run!.remoteMayContinue) {
            confirmRemoteStopped = await requestAnchoredConfirmation({
              anchor: retry,
              intent: 'remote-risk',
              title: '确认远端任务已停止？',
              description: '请先在 ComfyUI 队列中确认任务已停止。继续后才会删除本次暂存输入。',
              confirmLabel: '已停止，清理',
            });
            if (!confirmRemoteStopped) return;
          }
          const result = await client.retryInputCleanup(state.run!.runId, {
            confirmRemoteStopped,
          });
          state.run!.inputCleanup = {
            state: result.state,
            totalBytes: result.totalBytes,
            retryable: false,
            updatedAt: result.updatedAt,
          };
          setNotice('ComfyUI 暂存输入已经核对并清理。', 'success');
        });
      });
      cleanup.append(retry);
    }
    panel.append(cleanup);
  };
}

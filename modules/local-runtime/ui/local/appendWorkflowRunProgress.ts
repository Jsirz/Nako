import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import { isRunningHubRunner } from './workflowManagerMetadata';
import { ManagerState } from './workflowManagerTypes';
import { terminalRunNotice, workflowRunProgressLabel } from './workflowRunObservation';

export function appendWorkflowRunProgress(state: ManagerState, panel: HTMLDivElement) {
  const run = state.run;
  if (!run) return;
  const progress = element('div', 'fwm-summary fwm-run');
  const progressLine = element('div', 'fwm-run-line');
  const value = Number(run.progress?.value);
  const maximum = Number(run.progress?.maximum);
  if (Number.isFinite(value) && Number.isFinite(maximum) && maximum > 0) {
    progressLine.classList.add('is-determinate');
    progressLine.style.setProperty(
      '--fwm-progress',
      `${Math.min(100, Math.max(0, (value / maximum) * 100))}%`,
    );
  }
  const progressCopy = element('div', 'fwm-run-copy');
  progressCopy.append(
    element(
      'strong',
      '',
      run.phase === 'observation-paused'
        ? '观察已暂停，生成未取消'
        : run.phase || `${isRunningHubRunner(run.runner) ? 'RunningHub' : 'ComfyUI'} 正在执行`,
    ),
    element(
      'span',
      'fwm-run-detail',
      run.phase === 'observation-paused' ? terminalRunNotice(run) : workflowRunProgressLabel(run),
    ),
  );
  progress.append(progressCopy, progressLine);
  panel.append(progress);
}

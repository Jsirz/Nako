import { createStableElement as element } from '../../../kernel/ui/dom';
import { button } from './workflowManagerControls';
import type { ManagerState } from './workflowManagerTypes';

export function appendWorkflowVerificationRecord(state: ManagerState, panel: HTMLDivElement, render: () => void) {
  if (!state.attestation) return;
  const record = element('div', 'fwm-summary fwm-verification-record');
  const recordCopy = element('div');
  recordCopy.append(
    element('strong', '', '已验证记录'),
    element('span', '', `${new Date(state.attestation.succeededAt || state.attestation.createdAt).toLocaleString('zh-CN', { hour12: false })} · RUN ${state.attestation.runId.slice(0, 12)}`),
  );
  if (state.verifiedRun) {
    const view = button('返回已部署结果', 'quiet');
    view.addEventListener('click', () => {
      state.run = state.verifiedRun;
      state.outputCandidates = [...state.verifiedOutputCandidates];
      state.activeStage = 4;
      render();
    });
    record.append(recordCopy, view);
  } else {
    record.append(recordCopy, element('span', 'fwm-chip is-ok', '验证凭证已归档'));
  }
  panel.append(record);
}

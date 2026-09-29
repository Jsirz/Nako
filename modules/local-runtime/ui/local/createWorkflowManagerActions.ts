import type { WorkflowManagerSession } from './workflowManagerTypes';
import { applyWorkflowSnapshot } from './applyWorkflowSnapshot';
import { hydrateWorkflowDefinition } from './hydrateWorkflowDefinition';
import { loadWorkflowRecords } from './loadWorkflowRecords';
import { syncWorkflowCanvasNode } from './syncWorkflowCanvasNode';
import type {
  WorkflowDefinition,
  WorkflowEditorSnapshot,
  WorkflowManagerClient,
  WorkflowRun,
} from './workflowManagerClient';
import { messageFor } from './workflowManagerControls';
import { ManagerState, WorkflowManagerOptions } from './workflowManagerTypes';
import { cleanupObservationPending } from './workflowRunObservation';

export function createWorkflowManagerActions(
  notice: HTMLParagraphElement,
  state: ManagerState,
  session: WorkflowManagerSession,
  client: WorkflowManagerClient,
  libraryContext: boolean,
  libraryBack: HTMLButtonElement,
  render: () => void,
  status: HTMLDivElement,
  newWorkflow: HTMLButtonElement,
  options: WorkflowManagerOptions,
  host: HTMLElement,
) {
  const setNotice = (text: string, tone: '' | 'error' | 'success' = '') => {
    notice.textContent = text;
    notice.className = `fwm-notice${tone ? ` is-${tone}` : ''}`;
  };

  const loadDeployedRecords = (definitions = state.definitions) =>
    loadWorkflowRecords(state, session, client, libraryContext)(definitions);

  const resetDraft = () => {
    state.selected = undefined;
    state.deployment = undefined;
    state.candidates = [];
    state.bindingSet = undefined;
    state.nodeTitle = '';
    state.values = {};
    state.run = undefined;
    state.outputCandidates = [];
    state.outputBindingSetId = undefined;
    state.attestation = undefined;
    state.verifiedRun = undefined;
    state.verifiedOutputCandidates = [];
    state.activeStage = 0;
  };

  libraryBack.addEventListener('click', () => {
    session.managerView = 'library';
    resetDraft();
    setNotice('');
    render();
  });

  const refreshStatus = () => {
    const ready = state.selected
      ? Boolean(state.attestation)
      : Boolean(state.deployedRecords.length);
    status.textContent = ready
      ? state.run?.status === 'loading'
        ? '已部署 · 本次运行中'
        : state.selected?.id
          ? '已部署'
          : `${state.deployedRecords.length} 个已部署`
      : state.run?.status === 'loading'
        ? '正在执行工作流'
        : '尚未验证';
    status.classList.toggle('is-ready', ready);
    const observing =
      state.run?.status === 'loading' || (state.run ? cleanupObservationPending(state.run) : false);
    newWorkflow.disabled = observing;
    newWorkflow.title = observing
      ? '当前测试或输入清理完成后可新建工作流'
      : '保留当前记录并导入新的工作流';
  };

  const applyHydratedState = (hydrated: WorkflowEditorSnapshot) =>
    applyWorkflowSnapshot(state, options, setNotice)(hydrated);

  const hydrate = (definition: WorkflowDefinition, restoredRun?: WorkflowRun) =>
    hydrateWorkflowDefinition(client, applyHydratedState)(definition, restoredRun);

  const syncCurrentCanvasNode = () => syncWorkflowCanvasNode(options, state, client)();

  const runBusy = async (label: string, action: () => Promise<void>) => {
    host.dataset.busy = 'true';
    setNotice(label);
    for (const control of host.querySelectorAll<HTMLButtonElement>('button'))
      control.disabled = true;
    try {
      await action();
    } catch (error) {
      setNotice(messageFor(error), 'error');
    } finally {
      delete host.dataset.busy;
      render();
    }
  };
  return {
    runBusy,
    setNotice,
    loadDeployedRecords,
    resetDraft,
    hydrate,
    syncCurrentCanvasNode,
    refreshStatus,
    applyHydratedState,
  };
}

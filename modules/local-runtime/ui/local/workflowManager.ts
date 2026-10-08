import { createWorkflowStageRenderers } from './createWorkflowStageRenderers';
import { bindWorkflowFileInputs } from './bindWorkflowFileInputs';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import { isRunningHubRunner } from './workflowManagerMetadata';
import { createWorkflowLibraryActions } from './createWorkflowLibraryActions';
import { createWorkflowManagerActions } from './createWorkflowManagerActions';
import { createWorkflowManagerView } from './createWorkflowManagerView';
import { importWorkflowFiles } from './importWorkflowFiles';
import { loadRequestedWorkflow } from './loadRequestedWorkflow';
import { pollWorkflowRun } from './pollWorkflowRun';
import { renderWorkflowLoadState } from './renderWorkflowLoadState';
import { renderWorkflowStages } from './renderWorkflowStages';
import { restoreWorkflowLibrary } from './restoreWorkflowLibrary';
import { currentStage, stageReachable } from './workflowManagerBindings';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { injectStyles } from './workflowManagerStyles';
import { WorkflowManagerOptions } from './workflowManagerTypes';

export function createWorkflowManager(
  client: WorkflowManagerClient,
  options: WorkflowManagerOptions = {},
) {
  injectStyles();
  const view = createWorkflowManagerView(options);
  const {
    notice,
    state,
    session,
    libraryContext,
    libraryBack,
    status,
    newWorkflow,
    host,
    rail,
    compactCloud,
    panel,
    fileInput,
    directoryInput,
    requestedDefinitionId,
    head,
  } = view;

  const actions = createWorkflowManagerActions(
    notice,
    state,
    session,
    client,
    libraryContext,
    libraryBack,
    render,
    status,
    newWorkflow,
    options,
    host,
  );
  const {
    runBusy,
    setNotice,
    loadDeployedRecords,
    resetDraft,
    hydrate,
    refreshStatus,
  } = actions;

  const renderRail = () =>
    renderWorkflowStages(rail, state, compactCloud, session, runBusy, client, render)();

  function appendPollingResume(actions: HTMLElement) {
    if (!state.run || !state.pollingPaused) return;
    const resume = button('继续查询');
    resume.addEventListener('click', () => {
      state.pollingPaused = false;
      session.pollToken += 1;
      void pollRun(state.run!.runId, session.pollToken);
      render();
    });
    actions.append(resume);
  }

  const { appendDeployedCards, renderLibraryHome, loadOfficial } = createWorkflowLibraryActions(
    setNotice,
    client,
    state,
    loadDeployedRecords,
    render,
    resetDraft,
    runBusy,
    libraryContext,
    session,
    hydrate,
    panel,
    fileInput,
    directoryInput,
    newWorkflow,
    host,
  );

  function pollRun(runId: string, token: number) {
    return pollWorkflowRun(
      state,
      client,
      session,
      hydrate,
      refreshStatus,
      setNotice,
      render,
    )(runId, token);
  }

  const { renderSource, renderDeployment, renderBindings, renderTest, renderOutputs } =
    createWorkflowStageRenderers(view, actions, client, render, appendPollingResume, pollRun, appendDeployedCards);

  const renderRequestedDefinitionState = () =>
    renderWorkflowLoadState(session, loadRequestedDefinition, panel)();

  function render() {
    panel.replaceChildren();
    if (requestedDefinitionId && session.requestedDefinitionState !== 'ready') {
      status.textContent = session.requestedDefinitionState === 'loading' ? '正在读取' : '读取失败';
      status.classList.remove('is-ready');
      libraryBack.hidden = true;
      head.hidden = false;
      rail.hidden = true;
      panel.className = 'fwm-panel';
      renderRequestedDefinitionState();
      return;
    }
    refreshStatus();
    const libraryHome = libraryContext && session.managerView === 'library';
    libraryBack.disabled = false;
    libraryBack.hidden = !libraryContext || libraryHome;
    head.hidden = libraryHome;
    rail.hidden = libraryHome;
    panel.className = libraryHome ? 'fwm-panel fwm-library-panel' : 'fwm-panel';
    if (libraryHome) {
      renderLibraryHome();
      return;
    }
    if (!UI_FEATURES.runningHub && isRunningHubRunner(state.deployment?.runner)) {
      head.hidden = rail.hidden = true;
      panel.textContent = '该工作流入口已隐藏，原有配置和数据仍保留。';
      return;
    }
    renderRail();
    const reachable = stageReachable(state, state.activeStage);
    if (!reachable) state.activeStage = currentStage(state);
    if (state.activeStage === 0) renderSource();
    else if (state.activeStage === 1) renderDeployment();
    else if (state.activeStage === 2) renderBindings();
    else if (state.activeStage === 3) renderTest();
    else renderOutputs();
  }

  async function loadRequestedDefinition() {
    await loadRequestedWorkflow(view, actions, client, options, render);
  }

  const importFiles = (files: File[]) =>
    importWorkflowFiles(
      host,
      runBusy,
      session,
      state,
      client,
      hydrate,
      setNotice,
      loadDeployedRecords,
    )(files);

  bindWorkflowFileInputs(
    fileInput,
    importFiles,
    session,
    host,
    panel,
    setNotice,
    directoryInput,
    state,
    render,
  );

  if (requestedDefinitionId) {
    void loadRequestedDefinition();
    render();
    return host;
  }

  restoreWorkflowLibrary(
    libraryContext,
    loadOfficial,
    session,
    render,
    client,
    options,
    state,
    loadDeployedRecords,
    pollRun,
    hydrate,
    setNotice,
  );
  render();
  return host;
}

export { WORKFLOW_LIBRARY_EVENT, WORKFLOW_PARAMETER_EDITOR_EVENT } from './workflowManagerEvents';
export {
  observeWorkflowRun,
  terminalRunNotice,
  workflowRunProgressLabel,
} from './workflowRunObservation';

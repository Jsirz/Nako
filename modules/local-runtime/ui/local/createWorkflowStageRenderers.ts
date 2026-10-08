import type { WorkflowManagerClient } from './workflowManagerClient';
import type { createWorkflowManagerActions } from './createWorkflowManagerActions';
import type { createWorkflowManagerView } from './createWorkflowManagerView';
import { createWorkflowValueControl } from './createWorkflowValueControl';
import { renderWorkflowBindings } from './renderWorkflowBindings';
import { renderWorkflowCleanup } from './renderWorkflowCleanup';
import { renderWorkflowDeployment } from './renderWorkflowDeployment';
import { renderWorkflowOutputs } from './renderWorkflowOutputs';
import { renderWorkflowSource } from './renderWorkflowSource';
import { renderWorkflowTest } from './renderWorkflowTest';
import { createWorkflowNodeTitleControl, panelHeading } from './workflowManagerPanelControls';
import type { createWorkflowLibraryActions } from './createWorkflowLibraryActions';

export function createWorkflowStageRenderers(
  view: ReturnType<typeof createWorkflowManagerView>,
  actions: ReturnType<typeof createWorkflowManagerActions>,
  client: WorkflowManagerClient,
  render: () => void,
  appendPollingResume: (actions: HTMLElement) => void,
  pollRun: (runId: string, token: number) => Promise<void>,
  appendDeployedCards: ReturnType<typeof createWorkflowLibraryActions>['appendDeployedCards'],
) {
  const { state, session, libraryContext, panel, fileInput, directoryInput } = view;
  const { runBusy, hydrate, setNotice, syncCurrentCanvasNode, loadDeployedRecords } = actions;
  const createNodeTitleControl = () => createWorkflowNodeTitleControl(state);
  const renderCleanupSummary = () => renderWorkflowCleanup(state, runBusy, client, setNotice, panel)();
  return {
    renderSource: () => renderWorkflowSource(libraryContext, state, panel, panelHeading,
      appendDeployedCards, session, fileInput, directoryInput, appendPollingResume, runBusy,
      client, hydrate, setNotice)(),
    renderDeployment: () => renderWorkflowDeployment(state, render, runBusy, client,
      setNotice, appendPollingResume, panel, panelHeading),
    renderBindings: () => renderWorkflowBindings(state, panel, panelHeading, createNodeTitleControl,
      runBusy, client, setNotice, syncCurrentCanvasNode, loadDeployedRecords),
    renderTest: () => renderWorkflowTest(state, runBusy, client, session, setNotice,
      pollRun, appendPollingResume, panel, panelHeading, render, createNodeTitleControl,
      syncCurrentCanvasNode, createWorkflowValueControl(state, setNotice, client, runBusy), renderCleanupSummary)(),
    renderOutputs: () => renderWorkflowOutputs(state, panel, panelHeading, createNodeTitleControl,
      renderCleanupSummary, runBusy, client, loadDeployedRecords, setNotice),
  };
}

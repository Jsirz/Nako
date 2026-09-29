import type { WorkflowManagerSession } from './workflowManagerTypes';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import { isRunningHubRunner } from './workflowManagerMetadata';
import { appendWorkflowCards } from './appendWorkflowCards';
import { appendWorkflowCoverMedia } from './appendWorkflowCoverMedia';
import { createWorkflowCard } from './createWorkflowCard';
import { openWorkflowDeleteDialog } from './openWorkflowDeleteDialog';
import { openWorkflowPresentation } from './openWorkflowPresentation';
import { renderWorkflowLibraryHome } from './renderWorkflowLibraryHome';
import type {
  WorkflowDefinition,
  WorkflowManagerClient,
  WorkflowRun,
} from './workflowManagerClient';
import { DeployedWorkflowRecord, ManagerState } from './workflowManagerTypes';
import { clearRunReference } from './workflowRunSession';

export function createWorkflowLibraryActions(
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  client: WorkflowManagerClient,
  state: ManagerState,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
  render: () => void,
  resetDraft: () => void,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  libraryContext: boolean,
  session: WorkflowManagerSession,
  hydrate: (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => Promise<void>,
  panel: HTMLDivElement,
  fileInput: HTMLInputElement,
  directoryInput: HTMLInputElement,
  newWorkflow: HTMLButtonElement,
  host: HTMLElement,
) {
  const appendWorkflowCover = (
    container: HTMLElement,
    record: DeployedWorkflowRecord,
    preview?: { url: string; mediaKind: 'image' | 'video' },
  ) => appendWorkflowCoverMedia()(container, record, preview);

  const openPresentationEditor = (record: DeployedWorkflowRecord) => {
    openWorkflowPresentation(
      record,
      appendWorkflowCover,
      setNotice,
      client,
      state,
      loadDeployedRecords,
      render,
    );
  };

  const openDeleteDefinitionDialog = (record: DeployedWorkflowRecord, returnFocus: HTMLElement) => {
    openWorkflowDeleteDialog(record, returnFocus, client, state, resetDraft, setNotice, render);
  };

  const createDeployedCard = (record: DeployedWorkflowRecord) =>
    createWorkflowCard(
      appendWorkflowCover,
      openPresentationEditor,
      openDeleteDefinitionDialog,
      runBusy,
      client,
      setNotice,
      libraryContext,
      session,
      hydrate,
      state,
    )(record);

  const appendDeployedCards = (deployedRecords = state.deployedRecords) => {
    const visible = deployedRecords.filter((record) =>
      UI_FEATURES.runningHub || !isRunningHubRunner(record.deployment?.runner));
    return appendWorkflowCards(visible, createDeployedCard, panel);
  };

  const enterAdvancedManager = (action?: 'import' | 'directory') => {
    session.managerView = 'manager';
    resetDraft();
    setNotice('');
    render();
    if (action === 'import') {
      session.uploadMode = 'new';
      fileInput.click();
    } else if (action === 'directory') {
      directoryInput.click();
    }
  };

  const startQuickImport = () => {
    session.uploadMode = 'quick';
    fileInput.click();
  };

  newWorkflow.addEventListener('click', () => {
    if (newWorkflow.disabled) return;
    const previousName = state.selected?.name;
    const wasVerified = Boolean(state.attestation);
    clearRunReference();
    enterAdvancedManager('import');
    setNotice(
      previousName
        ? wasVerified
          ? `“${previousName}”当前记录已保留，可在已部署工作流中继续改名和编辑字段。`
          : `“${previousName}”草稿已保留；普通列表只显示测试通过的工作流。`
        : '请选择新的工作流 JSON。',
      'success',
    );
  });

  const loadOfficial = async () => {
    try {
      session.officialWorkflows = await client.listOfficialWorkflows();
      session.officialError = '';
    } catch {
      session.officialError = '官方工作流暂时无法读取，请重试。';
    }
    session.officialLoaded = true;
  };
  const renderLibraryHome = () =>
    renderWorkflowLibraryHome(
      session,
      render,
      panel,
      client,
      loadOfficial,
      host,
      setNotice,
      state,
      loadDeployedRecords,
      startQuickImport,
      enterAdvancedManager,
      appendDeployedCards,
    )();
  return { appendDeployedCards, renderLibraryHome, loadOfficial };
}

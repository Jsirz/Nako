import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import type { OfficialWorkflow, WorkflowDefinition } from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { HOST_ATTRIBUTE } from './workflowManagerEvents';
import { ManagerState, WorkflowManagerOptions } from './workflowManagerTypes';

export function createWorkflowManagerView(options: WorkflowManagerOptions) {
  const compactCloud = options.compactCloud === true;
  const host = element('section');
  host.setAttribute(HOST_ATTRIBUTE, 'true');
  host.setAttribute('data-nako-workflow-manager-mode', options.mode || 'settings');
  const state: ManagerState = {
    definitions: [],
    deployedRecords: [],
    candidates: [],
    projects: [],
    nodeTitle: '',
    values: {},
    outputCandidates: [],
    verifiedOutputCandidates: [],
    activeStage: 0,
    deploymentRunner: 'local-comfyui',
  };

  const libraryContext = options.initialView === 'library';

  const requestedDefinitionId = options.definitionId?.trim() || undefined;
  const canvasNodeEditContext = Boolean(requestedDefinitionId && options.nodeId);

  const session = {
    uploadMode: 'new' as 'quick' | 'new' | 'append',
    pollToken: 0,
    managerView: libraryContext ? 'library' : ('manager' as 'library' | 'manager'),
    libraryRunnerScope: 'local' as 'local' | 'cloud',
    librarySection: 'official' as 'official' | 'mine',
    officialWorkflows: [] as OfficialWorkflow[],
    officialError: '',
    officialLoaded: false,
    libraryCloudImport: false,
    officialConnection: null as OfficialWorkflow | null,
    projectsLoaded: false,
    libraryReadFailures: [] as WorkflowDefinition[],
    requestedDefinitionState: requestedDefinitionId
      ? 'loading'
      : ('ready' as 'loading' | 'ready' | 'error'),
    requestedDefinitionError: '',
  };

  const libraryBack = button('← 返回工作流库', 'ghost');
  libraryBack.classList.add('fwm-library-back');
  libraryBack.hidden = true;
  const head = element('div', 'fwm-head');
  const identity = element('div');
  identity.append(
    element(
      'p',
      'fwm-kicker',
      compactCloud ? 'RUNNINGHUB WEBAPP / 付费验证' : 'WORKFLOW RUNTIME / 本地编排',
    ),
    element('h3', 'fwm-title', compactCloud ? '云端工作流测试' : '本地工作流'),
    element(
      'p',
      'fwm-subtitle',
      compactCloud
        ? 'WebApp 字段已由 RunningHub 确定；填写参数、真实测试并确认输出即可加入画布。'
        : '配置运行目标和字段后即可加入画布；需要时再提前测试。',
    ),
  );
  const status = element('div', 'fwm-status', '尚未验证');
  const headActions = element('div', 'fwm-head-actions');
  const newWorkflow = button('＋ 新工作流');
  newWorkflow.setAttribute('aria-label', '导入新的工作流并保留当前记录');
  headActions.append(status, newWorkflow);
  newWorkflow.hidden = compactCloud || canvasNodeEditContext;
  head.append(identity, headActions);
  const rail = element('div', 'fwm-rail');
  const panel = element('div', 'fwm-panel');
  const notice = element('p', 'fwm-notice');
  const fileInput = element('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.multiple = true;
  fileInput.hidden = true;
  const directoryInput = element('input');
  directoryInput.type = 'file';
  directoryInput.accept = '.json,application/json';
  directoryInput.multiple = true;
  directoryInput.hidden = true;
  directoryInput.setAttribute('webkitdirectory', '');
  directoryInput.setAttribute('directory', '');
  host.append(libraryBack, head, rail, panel, notice, fileInput, directoryInput);
  return {
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
    canvasNodeEditContext,
  };
}

import { createStableElement as element } from '../../../kernel/ui/dom';
import type { OfficialWorkflow, WorkflowDefinition } from './workflowManagerClient';
import { button } from './workflowManagerControls';

export function renderWorkflowLoadState(
  session: {
    uploadMode: 'quick' | 'new' | 'append';
    pollToken: number;
    managerView: 'library' | 'manager';
    libraryRunnerScope: 'local' | 'cloud';
    librarySection: 'official' | 'mine';
    officialWorkflows: OfficialWorkflow[];
    officialError: string;
    officialLoaded: boolean;
    libraryCloudImport: boolean;
    officialConnection: OfficialWorkflow | null;
    projectsLoaded: boolean;
    libraryReadFailures: WorkflowDefinition[];
    requestedDefinitionState: 'loading' | 'ready' | 'error';
    requestedDefinitionError: string;
  },
  loadRequestedDefinition: () => Promise<void>,
  panel: HTMLDivElement,
) {
  return () => {
    const loading = session.requestedDefinitionState === 'loading';
    const card = element('section', 'fwm-empty');
    card.setAttribute('data-nako-state', loading ? 'loading' : 'error');
    card.setAttribute('role', loading ? 'status' : 'alert');
    const copy = element('div');
    copy.append(
      element('strong', '', loading ? '正在读取当前工作流' : '无法读取当前工作流'),
      element(
        'p',
        'fwm-panel-copy',
        loading
          ? '正在加载这个画布节点已经绑定的外置参数和部署记录。请稍候，无需重新导入工作流。'
          : '当前节点和工作流仍保留在画布中，不需要重新导入。',
      ),
    );
    if (loading) {
      const progress = element('div', 'fwm-run-line');
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', '正在读取当前工作流');
      copy.append(progress);
    } else {
      if (session.requestedDefinitionError) {
        copy.append(element('p', 'fwm-notice is-error', session.requestedDefinitionError));
      }
      const retry = button('重试读取', 'primary');
      retry.addEventListener('click', () => void loadRequestedDefinition());
      copy.append(retry);
    }
    card.replaceChildren(copy);
    panel.append(card);
  };
}

import { createStableElement as element } from '../../../kernel/ui/dom';
import type {
  WorkflowDefinition,
  WorkflowManagerClient,
  WorkflowRun,
} from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { incompleteExportNotice } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { DeployedWorkflowRecord, ManagerState } from './workflowManagerTypes';

export function renderWorkflowSource(
  libraryContext: boolean,
  state: ManagerState,
  panel: HTMLDivElement,
  panelHeading: (title: string, copy: string, actions?: HTMLElement) => HTMLDivElement,
  appendDeployedCards: (deployedRecords?: DeployedWorkflowRecord[]) => HTMLDivElement,
  session: WorkflowManagerSession,
  fileInput: HTMLInputElement,
  directoryInput: HTMLInputElement,
  appendPollingResume: (actions: HTMLElement) => void,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  hydrate: (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => Promise<void>,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
) {
  return () => {
    if (!libraryContext && state.deployedRecords.length) {
      panel.append(
        panelHeading(
          '已部署工作流',
          '已验证记录可直接复用；未验证配置也能先加入画布，在首次运行时检查。',
        ),
      );
      appendDeployedCards();
    }

    const upload = button('导入 API JSON', 'primary');
    upload.addEventListener('click', () => {
      session.uploadMode = 'new';
      fileInput.click();
    });
    const append = button('补充 UI / API 文件');
    append.addEventListener('click', () => {
      session.uploadMode = 'append';
      fileInput.click();
    });
    const discover = button('扫描工作流目录');
    discover.addEventListener('click', () => {
      directoryInput.click();
    });
    const importStrip = element('section', 'fwm-import-strip');
    importStrip.setAttribute('data-nako-workflow-import-strip', 'true');
    const importCopy = element('div', 'fwm-import-copy');
    importCopy.append(
      element('h4', '', '添加工作流'),
      element('p', '', '导入 ComfyUI API JSON，或从目录批量读取已有工作流。'),
    );
    const importActions = element('div', 'fwm-import-actions');
    importActions.append(upload, discover);
    appendPollingResume(importActions);
    importStrip.append(importCopy, importActions);
    panel.append(importStrip);

    if (!state.definitions.length && !state.deployedRecords.length) {
      panel.append(
        element(
          'div',
          'fwm-empty',
          '还没有工作流。导入 API JSON，或扫描你已有的 ComfyUI 工作流目录。',
        ),
      );
    }

    if (state.selected) {
      const summary = element('div', 'fwm-summary');
      const left = element('div');
      left.append(
        element('strong', '', state.selected.name),
        element('span', '', ` · ${state.selected.sourceArtifacts.length} 份源文件`),
      );
      const badge = element(
        'span',
        `fwm-chip ${state.selected.executionPlan ? 'is-ok' : 'is-warn'}`,
        state.selected.executionPlan ? '执行计划已就绪' : '缺少可执行 API 文件',
      );
      if (!state.selected.executionPlan) {
        badge.title =
          '当前只有 UI Format（节点布局文件）；请从 ComfyUI 开发者模式导出 API Format 后，用“补充 UI / API 文件”导入。';
      }
      const summaryActions = element('div', 'fwm-actions');
      summaryActions.append(badge, append);
      summary.append(left, summaryActions);
      panel.append(summary);
      const warning = incompleteExportNotice(state.selected);
      if (warning) panel.append(element('p', 'fwm-panel-copy', warning));
    }

    if (state.discovered) {
      panel.append(element('p', 'fwm-panel-copy', `目录：${state.discovered.label}`));
      const list = element('div', 'fwm-list');
      for (const candidate of state.discovered.candidates) {
        const row = element('div', 'fwm-row');
        const icon = element('span', 'fwm-chip', 'JSON');
        const info = element('div');
        info.append(
          element('span', 'fwm-row-title', candidate.relativePath),
          element('span', 'fwm-row-meta', `${(candidate.byteLength / 1024).toFixed(1)} KiB`),
        );
        const importButton = button('导入');
        importButton.addEventListener('click', () => {
          void runBusy('正在导入目录中的工作流…', async () => {
            const definition = await client.importArtifact({ file: candidate.file });
            state.definitions = await client.listDefinitions();
            await hydrate(definition);
            setNotice('工作流已导入。', 'success');
          });
        });
        row.append(icon, info, importButton);
        list.append(row);
      }
      panel.append(list);
    }
  };
}

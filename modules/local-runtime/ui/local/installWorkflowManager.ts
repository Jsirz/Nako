import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import { observeStableEnhancement } from '../../../canvas-ui/api/ui/lifecycle/enhancementLifecycle';
import {
RUNNINGHUB_WEBAPP_TEST_EVENT,
createRunningHubWebAppManager,
} from './runningHubWebAppManager';
import { WORKFLOW_CANVAS_INSERTED_EVENT } from './workflowCanvasNodes';
import { createWorkflowManager } from './workflowManager';
import type { WorkflowManagerClient } from './workflowManagerClient';
import {
HOST_ATTRIBUTE,
WORKFLOW_LIBRARY_EVENT,
WORKFLOW_PARAMETER_EDITOR_EVENT,
} from './workflowManagerEvents';

export function installWorkflowManager(client: WorkflowManagerClient, root: ParentNode = document) {
  let workspaceTabs: HTMLElement | undefined;
  let mountedManager: HTMLElement | undefined;
  let mountedCloudManager: HTMLElement | undefined;
  let mountedLocalPanel: HTMLElement | undefined;
  let dialogBackdrop: HTMLElement | undefined;
  let releaseDialog: (() => void) | undefined;
  const closeDialog = () => {
    releaseDialog?.();
    releaseDialog = undefined;
    dialogBackdrop?.remove();
    dialogBackdrop = undefined;
  };
  const openDialog = (options: {
    marker: string;
    ariaLabel: string;
    title: string;
    description: string;
    closeLabel: string;
    manager: HTMLElement;
  }) => {
    closeDialog();
    const backdrop = element('div', 'fwm-modal-backdrop');
    backdrop.setAttribute(options.marker, 'true');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', options.ariaLabel);
    const dialog = element('div', 'fwm-modal');
    const bar = element('div', 'fwm-modal-bar');
    const copy = element('div');
    copy.append(element('strong', '', options.title), element('span', '', options.description));
    const close = element('button', 'fwm-modal-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', options.closeLabel);
    close.addEventListener('click', closeDialog);
    bar.append(copy, close);
    dialog.append(bar, options.manager);
    backdrop.append(dialog);
    backdrop.addEventListener('pointerdown', (pointerEvent) => {
      if (pointerEvent.target === backdrop) closeDialog();
    });
    dialogBackdrop = backdrop;
    document.body.append(backdrop);
    releaseDialog = activateModal(backdrop, closeDialog, { initialFocus: close });
  };
  const openParameterEditor = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        definitionId?: unknown;
        nodeId?: unknown;
        title?: unknown;
      }>
    ).detail;
    const definitionId = detail?.definitionId;
    const nodeId =
      typeof detail?.nodeId === 'string' && detail.nodeId.length <= 200 ? detail.nodeId : undefined;
    const initialNodeTitle =
      typeof detail?.title === 'string' && detail.title.trim() && detail.title.length <= 120
        ? detail.title.trim()
        : undefined;
    if (typeof definitionId !== 'string' || !definitionId || definitionId.length > 200) return;
    openDialog({
      marker: 'data-nako-workflow-editor-dialog',
      ariaLabel: '编辑外置参数',
      title: '编辑外置参数',
      description: '自由增删字段并保存为新版本；已部署工作流无需重新真实测试。',
      closeLabel: '关闭外置参数编辑器',
      manager: createWorkflowManager(client, {
        definitionId,
        nodeId,
        initialNodeTitle,
        initialStage: 2,
        mode: 'dialog',
      }),
    });
  };
  const openWorkflowLibrary = () => {
    openDialog({
      marker: 'data-nako-workflow-library-dialog',
      ariaLabel: '工作流节点库',
      title: '工作流节点库',
      description: '选择工作流添加到画布；未运行的节点会在首次运行时检查。',
      closeLabel: '关闭工作流节点库',
      manager: createWorkflowManager(client, { mode: 'dialog', initialView: 'library' }),
    });
  };
  const openRunningHubWebAppTest = (event: Event) => {
    if (!UI_FEATURES.runningHub) return;
    const detail = (event as CustomEvent<{ definitionId?: unknown; title?: unknown }>).detail;
    if (typeof detail?.definitionId !== 'string' || !detail.definitionId) return;
    openDialog({
      marker: 'data-nako-runninghub-webapp-test-dialog',
      ariaLabel: 'RunningHub 云端工作流测试',
      title: typeof detail.title === 'string' && detail.title ? detail.title : '云端工作流',
      description: '设置需要外置的字段，也可以不测试直接加入画布。',
      closeLabel: '关闭云端工作流测试',
      manager: createWorkflowManager(client, {
        definitionId: detail.definitionId,
        initialStage: 2,
        mode: 'dialog',
        scope: 'cloud',
        compactCloud: true,
      }),
    });
  };
  window.addEventListener(WORKFLOW_PARAMETER_EDITOR_EVENT, openParameterEditor);
  window.addEventListener(WORKFLOW_LIBRARY_EVENT, openWorkflowLibrary);
  window.addEventListener(RUNNINGHUB_WEBAPP_TEST_EVENT, openRunningHubWebAppTest);
  const closeAfterCanvasInsertion = () => closeDialog();
  window.addEventListener(WORKFLOW_CANVAS_INSERTED_EVENT, closeAfterCanvasInsertion);
  const mount = () => {
    const localPanel = root.querySelector<HTMLElement>('[data-nako-local-runtime-panel]');
    const parent = localPanel?.parentElement;
    if (!localPanel || !parent || parent.querySelector(`[${HOST_ATTRIBUTE}]`)) return;
    const manager = createWorkflowManager(client, { scope: 'local' });
    const cloudManager = UI_FEATURES.runningHub ? createRunningHubWebAppManager(client) : undefined;
    const views = [
      { id: 'local', label: 'ComfyUI 服务', panel: localPanel },
      { id: 'workflow', label: '本地工作流', panel: manager },
      ...(cloudManager ? [{ id: 'cloud', label: '云端工作流', panel: cloudManager }] : []),
    ];
    const tabs = element('div');
    tabs.setAttribute('data-nako-local-workspace-tabs', 'true');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '本地能力');
    const buttons = new Map<string, HTMLButtonElement>();
    const activate = (activeId: string, focus = false) => {
      for (const view of views) {
        const active = view.id === activeId;
        view.panel.hidden = !active;
        const tab = buttons.get(view.id)!;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      }
      tabs.scrollIntoView?.({ block: 'nearest' });
    };
    views.forEach((view, index) => {
      view.panel.id ||= `nako-local-workspace-${view.id}`;
      view.panel.setAttribute('role', 'tabpanel');
      const tab = element('button', '', view.label);
      tab.type = 'button';
      tab.id = `nako-local-workspace-tab-${view.id}`;
      tab.setAttribute('data-nako-local-workspace-tab', view.id);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', view.panel.id);
      view.panel.setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', () => activate(view.id));
      tab.addEventListener('keydown', (event) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? views.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
        activate(views[nextIndex].id, true);
      });
      buttons.set(view.id, tab);
      tabs.append(tab);
    });
    parent.insertBefore(tabs, localPanel);
    parent.insertBefore(manager, localPanel.nextSibling);
    if (cloudManager) parent.insertBefore(cloudManager, manager.nextSibling);
    activate('local');
    workspaceTabs = tabs;
    mountedManager = manager;
    mountedCloudManager = cloudManager;
    mountedLocalPanel = localPanel;
  };
  const stopObserving = observeStableEnhancement(mount);
  return () => {
    stopObserving();
    window.removeEventListener(WORKFLOW_PARAMETER_EDITOR_EVENT, openParameterEditor);
    window.removeEventListener(WORKFLOW_LIBRARY_EVENT, openWorkflowLibrary);
    window.removeEventListener(RUNNINGHUB_WEBAPP_TEST_EVENT, openRunningHubWebAppTest);
    window.removeEventListener(WORKFLOW_CANVAS_INSERTED_EVENT, closeAfterCanvasInsertion);
    workspaceTabs?.remove();
    mountedManager?.remove();
    mountedCloudManager?.remove();
    if (mountedLocalPanel) mountedLocalPanel.hidden = false;
    closeDialog();
  };
}

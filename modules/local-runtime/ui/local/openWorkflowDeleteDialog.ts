import { createStableElement as element } from '../../../kernel/ui/dom';
import { activateModal } from '../../../kernel/ui/modalFocus';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { button,messageFor } from './workflowManagerControls';
import { DeployedWorkflowRecord,ManagerState } from './workflowManagerTypes';

export function openWorkflowDeleteDialog(
  record: DeployedWorkflowRecord,
  returnFocus: HTMLElement,
  client: WorkflowManagerClient,
  state: ManagerState,
  resetDraft: () => void,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  render: () => void,
) {
  const layer = element('div', 'fwm-presentation-layer');
  const dialog = element('section', 'fwm-delete-dialog');
  const titleId = `fwm-delete-title-${record.definition.id}`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', titleId);
  const title = element('h3', 'fwm-delete-title', '删除这个工作流？');
  title.id = titleId;
  const copy = element('p', 'fwm-delete-copy');
  copy.append(
    document.createTextNode('“'),
    element('strong', '', record.definition.name),
    document.createTextNode('”将从工作流节点库中移除。'),
  );
  const note = element(
    'p',
    'fwm-delete-note',
    '原始 JSON 文件不会被删除；已经添加到画布的节点也会保留。',
  );
  const footer = element('div', 'fwm-presentation-footer');
  const cancel = button('取消', 'ghost');
  const confirm = button('删除工作流');
  confirm.classList.add('is-danger');
  footer.append(cancel, confirm);
  dialog.append(
    element('p', 'fwm-delete-eyebrow', 'REMOVE FROM LIBRARY'),
    title,
    copy,
    note,
    footer,
  );
  layer.append(dialog);
  document.body.append(layer);

  let closed = false;
  const close = (restoreFocus = true) => {
    if (closed) return;
    closed = true;
    releaseModal();
    layer.remove();
    if (restoreFocus && returnFocus.isConnected) returnFocus.focus();
  };
  const releaseModal = activateModal(dialog, () => close(), { initialFocus: cancel });
  cancel.addEventListener('click', () => close());
  layer.addEventListener('click', (event) => {
    if (event.target === layer) close();
  });
  confirm.addEventListener('click', () => {
    void (async () => {
      confirm.disabled = true;
      cancel.disabled = true;
      confirm.textContent = '正在删除…';
      try {
        await client.deleteDefinition(record.definition.id);
        state.definitions = state.definitions.filter(
          (definition) => definition.id !== record.definition.id,
        );
        state.deployedRecords = state.deployedRecords.filter(
          (item) => item.definition.id !== record.definition.id,
        );
        if (state.selected?.id === record.definition.id) resetDraft();
        close(false);
        setNotice(`“${record.definition.name}”已从工作流节点库删除。`, 'success');
        render();
      } catch (error) {
        confirm.disabled = false;
        cancel.disabled = false;
        confirm.textContent = '删除工作流';
        setNotice(messageFor(error), 'error');
      }
    })();
  });
  cancel.focus();
}

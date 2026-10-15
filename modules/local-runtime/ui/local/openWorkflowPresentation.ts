import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { createStableElement as element } from '../../../kernel/ui/dom';
import { activateModal } from '../../../kernel/ui/modalFocus';
import type { WorkflowDefinition,WorkflowManagerClient } from './workflowManagerClient';
import { button,field,messageFor } from './workflowManagerControls';
import { DeployedWorkflowRecord,ManagerState } from './workflowManagerTypes';

export function openWorkflowPresentation(
  record: DeployedWorkflowRecord,
  appendWorkflowCover: (
    container: HTMLElement,
    record: DeployedWorkflowRecord,
    preview?: { url: string; mediaKind: 'image' | 'video' },
  ) => void,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  client: WorkflowManagerClient,
  state: ManagerState,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
  render: () => void,
) {
  const layer = element('div', 'fwm-presentation-layer');
  const dialog = element('section', 'fwm-presentation-editor');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', `编辑 ${record.definition.name} 的名称和封面`);
  const preview = element('div', 'fwm-presentation-preview');
  const previewCopy = element('div', 'fwm-presentation-preview-copy');
  const previewTitle = element('strong', '', record.definition.name);
  previewCopy.append(
    element(
      'span',
      '',
      record.definition.presentation?.customCoverUrl ? 'CUSTOM COVER' : 'LATEST OUTPUT',
    ),
    previewTitle,
  );
  const drawPreview = (temporary?: { url: string; mediaKind: 'image' | 'video' }) => {
    preview.replaceChildren();
    appendWorkflowCover(preview, record, temporary);
    preview.append(previewCopy);
  };
  drawPreview();

  const form = element('div', 'fwm-presentation-form');
  const formHead = element('div', 'fwm-presentation-form-head');
  const formCopy = element('div');
  formCopy.append(
    element('strong', '', '卡片信息'),
    element('span', '', '修改展示名称和封面不会改变工作流版本，也不需要重新测试。'),
  );
  const closeButton = button('关闭', 'ghost');
  formHead.append(formCopy, closeButton);
  const nameInput = element('input', 'fwm-input');
  nameInput.value = record.definition.name;
  nameInput.maxLength = 120;
  nameInput.placeholder = '工作流名称';

  const coverInput = element('input');
  coverInput.type = 'file';
  coverInput.accept = '.png,.jpg,.jpeg,.webp,.gif,.avif,image/*';
  coverInput.hidden = true;
  const coverChoice = element('div', 'fwm-presentation-choice');
  const coverState = element(
    'span',
    '',
    record.definition.presentation?.customCoverUrl
      ? '正在使用自定义封面'
      : record.automaticCover
        ? '正在使用最近一次成功输出'
        : '暂无输出画面，将显示 Nako 占位图',
  );
  const coverActions = element('div', 'fwm-actions');
  const uploadCover = button('上传自定义封面');
  const useAutomatic = button('使用自动封面', 'ghost');
  coverActions.append(uploadCover, useAutomatic);
  coverChoice.append(coverState, coverActions);

  let selectedCover: File | undefined;
  let coverMode: 'automatic' | 'custom' = record.definition.presentation?.customCoverUrl
    ? 'custom'
    : 'automatic';
  let objectUrl: string | undefined;
  const releaseObjectUrl = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = undefined;
  };
  coverInput.addEventListener('change', () => {
    const [file] = Array.from(coverInput.files || []);
    if (!file) return;
    releaseObjectUrl();
    objectUrl = URL.createObjectURL(file);
    selectedCover = file;
    coverMode = 'custom';
    coverState.textContent = `已选择 ${file.name}，保存后替换封面`;
    previewCopy.firstElementChild!.textContent = 'CUSTOM COVER';
    drawPreview({ url: objectUrl, mediaKind: 'image' });
  });
  uploadCover.addEventListener('click', () => coverInput.click());
  useAutomatic.addEventListener('click', () => {
    releaseObjectUrl();
    selectedCover = undefined;
    coverMode = 'automatic';
    coverInput.value = '';
    coverState.textContent = record.automaticCover
      ? '保存后使用最近一次成功输出'
      : '保存后使用 Nako 占位图';
    previewCopy.firstElementChild!.textContent = 'LATEST OUTPUT';
    drawPreview(record.automaticCover);
  });

  const footer = element('div', 'fwm-presentation-footer');
  const cancel = button('取消', 'ghost');
  const save = button('保存卡片', 'primary');
  footer.append(cancel, save);
  form.append(formHead, field('工作流名称', nameInput), coverChoice, footer, coverInput);
  dialog.append(preview, form);
  layer.append(dialog);
  document.body.append(layer);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    releaseObjectUrl();
    releaseModal();
    layer.remove();
  };
  const releaseModal = activateModal(dialog, close, { initialFocus: nameInput });
  closeButton.addEventListener('click', close);
  cancel.addEventListener('click', close);
  layer.addEventListener('click', (event) => {
    if (event.target === layer) close();
  });
  save.addEventListener('click', () => {
    void (async () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        setNotice('工作流名称不能为空。', 'error');
        return;
      }
      save.disabled = true;
      save.textContent = selectedCover ? '上传并保存…' : '正在保存…';
      try {
        let customCoverUrl = record.definition.presentation?.customCoverUrl || null;
        if (coverMode === 'automatic') customCoverUrl = null;
        else if (selectedCover) {
          const uploaded = await client.uploadAsset('workflow-covers', 'image', selectedCover);
          if (!uploaded.url) throw localRuntimeError('封面已上传，但没有返回可用地址。', 'uploadWorkflowCover');
          customCoverUrl = uploaded.url;
        }
        const updated = await client.updateDefinitionPresentation(record.definition.id, {
          name,
          customCoverUrl,
        });
        state.definitions = state.definitions.map((definition) =>
          definition.id === updated.id ? updated : definition,
        );
        if (state.selected?.id === updated.id) state.selected = updated;
        await loadDeployedRecords(state.definitions);
        close();
        setNotice('工作流卡片已更新，无需重新测试。', 'success');
        render();
      } catch (error) {
        save.disabled = false;
        save.textContent = '保存卡片';
        setNotice(messageFor(error), 'error');
      }
    })();
  });
  nameInput.addEventListener('input', () => {
    previewTitle.textContent = nameInput.value.trim() || '未命名工作流';
  });
  nameInput.focus();
  nameInput.select();
}

import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { bindWorkflowParameterSave } from './bindWorkflowParameterSave';
import { createStableElement as element } from '../../../kernel/ui/dom';
import { browserServices } from '../../../kernel/browser';
import { bindingForCandidate, suggestedBindingLabel } from './workflowManagerBindings';
import type { WorkflowDefinition, WorkflowManagerClient } from './workflowManagerClient';
import { button, field } from './workflowManagerControls';
import { focusInsertedWorkflow } from './workflowManagerMetadata';
import { ManagerState } from './workflowManagerTypes';

export function renderWorkflowBindings(
  state: ManagerState,
  panel: HTMLDivElement,
  panelHeading: (title: string, copy: string, actions?: HTMLElement) => HTMLDivElement,
  createNodeTitleControl: () => HTMLInputElement,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  syncCurrentCanvasNode: () => Promise<boolean>,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
) {
  const selections = new Set(
    state.candidates.flatMap((candidate, index) =>
      bindingForCandidate(state.bindingSet, candidate, index) ||
      (candidate.control === 'asset' && Number(candidate.maximumItems || 1) > 1)
        ? [candidate.id]
        : [],
    ),
  );
  const save = button(state.attestation ? '保存字段' : '保存参数配置', 'primary');
  const addWithoutTest = button('直接添加到画布');
  addWithoutTest.disabled = !state.bindingSet;
  const headingActions = element('div', 'fwm-actions');
  headingActions.append(save, addWithoutTest);
  panel.append(
    panelHeading(
      '选择画布上可调整的参数',
      '只保存你自己勾选的参数；可以先加入画布，首次运行时再检查环境和输出。',
      headingActions,
    ),
  );
  const nodeMeta = element('div', 'fwm-test-meta is-single');
  nodeMeta.append(field('画布节点名称', createNodeTitleControl()));
  panel.append(nodeMeta);
  const filterRow = element('div', 'fwm-summary');
  const search = element('input', 'fwm-input');
  search.placeholder = '搜索节点、字段或参数';
  const selectedCount = element('span', '', `已选 ${selections.size} / ${state.candidates.length}`);
  const selectAll = button('全选', 'ghost');
  const clearSelection = button('取消全选', 'ghost');
  const selectionActions = element('div', 'fwm-actions');
  selectionActions.append(selectAll, clearSelection);
  filterRow.append(search, selectionActions, selectedCount);
  panel.append(filterRow);
  const list = element('div', 'fwm-list');
  const checkboxes = new Map<string, HTMLInputElement>();
  const aliasInputs = new Map<string, HTMLInputElement>();
  const rows = new Map<string, HTMLElement>();
  const refreshSelectedCount = () => {
    const count = [...checkboxes.values()].filter((control) => control.checked).length;
    selectedCount.textContent = `已选 ${count} / ${state.candidates.length}`;
  };
  state.candidates.forEach((candidate, candidateIndex) => {
    const check = element('input', 'fwm-check');
    check.type = 'checkbox';
    check.checked = selections.has(candidate.id);
    check.setAttribute('aria-label', `外置参数：${candidate.nodeTitle} ${candidate.fieldName}`);
    checkboxes.set(candidate.id, check);
    const info = element('div');
    info.append(
      element('span', 'fwm-row-title', `${candidate.nodeTitle} · ${candidate.fieldName}`),
      element(
        'span',
        'fwm-row-meta',
        candidate.maximumItems && candidate.maximumItems > 1
          ? `动态素材口 / ${candidate.minimumItems || 0}–${candidate.maximumItems} 个 / ${candidate.mediaKind}`
          : `NODE ${candidate.nodeId} / ${candidate.classType} / ${candidate.valueType}`,
      ),
    );
    const alias = element('input', 'fwm-input fwm-binding-alias-input');
    alias.type = 'text';
    alias.maxLength = 40;
    alias.value =
      bindingForCandidate(state.bindingSet, candidate, candidateIndex)?.label ||
      suggestedBindingLabel(candidate);
    alias.placeholder = '输入画布显示名称';
    alias.setAttribute(
      'aria-label',
      `${candidate.nodeTitle} ${candidate.fieldName} 的画布显示名称`,
    );
    alias.setAttribute('data-nako-binding-label', candidate.id);
    const aliasEditor = element('div', 'fwm-binding-alias');
    aliasEditor.append(element('span', 'fwm-binding-alias-label', '画布显示名称'), alias);
    aliasInputs.set(candidate.id, alias);
    const kind = element(
      'span',
      'fwm-chip',
      candidate.control === 'asset' ? `${candidate.mediaKind || '媒体'}素材` : candidate.control,
    );
    const row = element('div', 'fwm-row fwm-binding-row');
    const refreshRow = () => {
      row.classList.toggle('is-selected', check.checked);
      aliasEditor.setAttribute('data-selected', String(check.checked));
      refreshSelectedCount();
    };
    check.addEventListener('change', refreshRow);
    alias.addEventListener('focus', () => {
      if (check.checked) return;
      check.checked = true;
      refreshRow();
    });
    row.append(check, info, aliasEditor, kind);
    refreshRow();
    rows.set(candidate.id, row);
    list.append(row);
  });
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('zh-CN');
    selectAll.textContent = query ? '全选筛选结果' : '全选';
    clearSelection.textContent = query ? '取消筛选结果' : '取消全选';
    state.candidates.forEach((candidate) => {
      const haystack =
        `${candidate.nodeTitle} ${candidate.fieldName} ${candidate.nodeId} ${candidate.classType} ${aliasInputs.get(candidate.id)?.value || ''}`.toLocaleLowerCase(
          'zh-CN',
        );
      rows.get(candidate.id)!.hidden = Boolean(query && !haystack.includes(query));
    });
  });
  const setVisibleSelection = (checked: boolean) => {
    for (const [id, control] of checkboxes) {
      if (rows.get(id)?.hidden || control.disabled || control.checked === checked) continue;
      control.checked = checked;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
    refreshSelectedCount();
  };
  selectAll.addEventListener('click', () => setVisibleSelection(true));
  clearSelection.addEventListener('click', () => setVisibleSelection(false));
  panel.append(list);
  addWithoutTest.addEventListener('click', () => {
    void runBusy('正在创建工作流草稿节点…', async () => {
      if (!state.selected || !state.deployment || !state.bindingSet) {
        throw localRuntimeError('请先保存运行目标和参数配置。', 'addWorkflowWithoutTest');
      }
      const blueprint = await client.createCanvasNode(state.selected.id, {
        ...(state.attestation
          ? { attestationId: state.attestation.id }
          : { deploymentId: state.deployment.id }),
        bindingSetId: state.bindingSet.id,
        title: state.nodeTitle.trim() || state.selected.name,
      });
      const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
      if (!adapter) throw localRuntimeError('画布节点适配器尚未加载，请刷新后重试。', 'addWorkflowWithoutTest');
      const insertion = await adapter.addToCanvas(blueprint);
      focusInsertedWorkflow(insertion.nodeIds);
      setNotice(
        state.attestation
          ? '工作流已添加到画布。'
          : '工作流已作为未验证节点加入画布；首次运行时会检查配置。',
        'success',
      );
    });
  });
  bindWorkflowParameterSave(save, state, checkboxes, aliasInputs, runBusy, client, setNotice, syncCurrentCanvasNode, loadDeployedRecords);
}

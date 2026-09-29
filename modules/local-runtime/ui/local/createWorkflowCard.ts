import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import { browserServices } from '../../../kernel/browser';
import type {
  WorkflowDefinition,
  WorkflowManagerClient,
  WorkflowRun,
} from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { focusInsertedWorkflow, isRunningHubRunner } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { DeployedWorkflowRecord, ManagerState } from './workflowManagerTypes';

export function createWorkflowCard(
  appendWorkflowCover: (
    container: HTMLElement,
    record: DeployedWorkflowRecord,
    preview?: { url: string; mediaKind: 'image' | 'video' },
  ) => void,
  openPresentationEditor: (record: DeployedWorkflowRecord) => void,
  openDeleteDefinitionDialog: (record: DeployedWorkflowRecord, returnFocus: HTMLElement) => void,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  libraryContext: boolean,
  session: WorkflowManagerSession,
  hydrate: (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => Promise<void>,
  state: ManagerState,
) {
  return (record: DeployedWorkflowRecord) => {
    const card = element('article', 'fwm-workflow-card');
    card.dataset.searchValue =
      `${record.definition.name} ${isRunningHubRunner(record.deployment?.runner) ? 'runninghub 云端' : 'local comfyui 本地'}`.toLocaleLowerCase(
        'zh-CN',
      );
    const cover = element('div', 'fwm-card-cover');
    appendWorkflowCover(cover, record);
    const badges = element('div', 'fwm-card-badges');
    badges.append(element('span', 'fwm-card-badge', record.attestation ? '已跑通' : '待首次运行'));
    const menu = element('button', 'fwm-card-menu', '⋯');
    const menuId = `fwm-card-menu-${record.definition.id}`;
    menu.type = 'button';
    menu.setAttribute('aria-label', `打开 ${record.definition.name} 的更多操作`);
    menu.setAttribute('aria-haspopup', 'menu');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-controls', menuId);
    menu.title = '更多操作';
    const menuPopover = element('div', 'fwm-card-menu-popover');
    menuPopover.id = menuId;
    menuPopover.setAttribute('role', 'menu');
    menuPopover.hidden = true;
    const editPresentation = element('button', 'fwm-card-menu-item', '编辑名称和封面');
    editPresentation.type = 'button';
    editPresentation.setAttribute('role', 'menuitem');
    const deleteDefinition = element('button', 'fwm-card-menu-item is-danger', '删除工作流');
    deleteDefinition.type = 'button';
    deleteDefinition.setAttribute('role', 'menuitem');
    if (record.deployment?.runner !== 'runninghub-webapp') menuPopover.append(editPresentation);
    menuPopover.append(deleteDefinition);

    const closeMenu = (restoreFocus = true) => {
      if (menuPopover.hidden) return;
      menuPopover.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onOutsidePointerDown);
      document.removeEventListener('keydown', onMenuKeyDown);
      if (restoreFocus && menu.isConnected) menu.focus();
    };
    const onOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !cover.contains(event.target)) closeMenu(false);
    };
    const onMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    menu.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!menuPopover.hidden) {
        closeMenu();
        return;
      }
      menuPopover.hidden = false;
      menu.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', onOutsidePointerDown);
      document.addEventListener('keydown', onMenuKeyDown);
      editPresentation.focus();
    });
    editPresentation.addEventListener('click', () => {
      closeMenu(false);
      openPresentationEditor(record);
    });
    deleteDefinition.addEventListener('click', () => {
      closeMenu(false);
      openDeleteDefinitionDialog(record, menu);
    });
    cover.append(badges, menu, menuPopover);

    const body = element('div', 'fwm-card-body');
    body.append(element('span', 'fwm-card-title', record.definition.name));
    const meta = element('div', 'fwm-card-meta');
    meta.append(
      element(
        'span',
        '',
        isRunningHubRunner(record.deployment?.runner) ? 'RunningHub 云端' : 'ComfyUI 本地',
      ),
      element('span', 'fwm-card-meta-separator'),
      element('span', '', `${record.bindingSet?.bindings.length || 0} 个参数`),
      element('span', 'fwm-card-meta-separator'),
      element(
        'span',
        '',
        record.attestation
          ? new Date(record.attestation.succeededAt).toLocaleDateString('zh-CN')
          : '未运行',
      ),
    );
    body.append(meta);
    const recordActions = element('div', 'fwm-card-actions');
    const add = button('添加到画布', 'primary');
    add.addEventListener('click', () => {
      void runBusy('正在创建工作流节点…', async () => {
        const blueprint = await client.createCanvasNode(record.definition.id, {
          ...(record.attestation
            ? { attestationId: record.attestation.id }
            : { deploymentId: record.deployment!.id }),
          ...(record.bindingSet ? { bindingSetId: record.bindingSet.id } : {}),
          title: record.definition.name,
        });
        const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
        if (!adapter) throw new Error('画布节点适配器尚未加载，请刷新后重试。');
        let insertion;
        if (record.verifiedRun && record.verifiedProjectId && record.verifiedValues) {
          insertion = await adapter.addToCanvas(blueprint, {
            run: record.verifiedRun,
            projectId: record.verifiedProjectId,
            values: record.verifiedValues,
          });
        } else {
          insertion = await adapter.addToCanvas(blueprint);
        }
        focusInsertedWorkflow(insertion?.nodeIds);
        setNotice(
          record.attestation
            ? `${record.definition.name} 已添加到画布；已有示例连接会一并复原。`
            : `${record.definition.name} 已作为未验证节点加入画布；首次运行时会检查配置。`,
          'success',
        );
      });
    });
    const edit = button('编辑字段');
    edit.addEventListener('click', () => {
      if (libraryContext) session.managerView = 'manager';
      void runBusy('正在读取可外置字段…', async () => {
        await hydrate(record.definition);
        state.activeStage = 2;
        setNotice('字段可以自由增删；保存后直接用于后续添加的节点。');
      });
    });
    const remove = button('删除', 'ghost');
    remove.classList.add('is-danger-quiet');
    remove.addEventListener('click', () => openDeleteDefinitionDialog(record, remove));
    if (record.deployment?.runner !== 'runninghub-webapp') recordActions.append(edit);
    recordActions.append(remove, add);
    body.append(recordActions);
    card.append(cover, body);
    return card;
  };
}

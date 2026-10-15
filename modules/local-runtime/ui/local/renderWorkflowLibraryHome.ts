import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { createStableElement as element } from '../../../kernel/ui/dom';
import { browserServices } from '../../../kernel/browser';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import { createOfficialWorkflowGallery, officialWorkflowStyles } from './officialWorkflowGallery';
import { createRunningHubQuickAdd } from './runningHubWebAppManager';
import type { WorkflowDefinition, WorkflowManagerClient } from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { focusInsertedWorkflow, isRunningHubRunner } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { DeployedWorkflowRecord, ManagerState } from './workflowManagerTypes';

export function renderWorkflowLibraryHome(
  session: WorkflowManagerSession,
  render: () => void,
  panel: HTMLDivElement,
  client: WorkflowManagerClient,
  loadOfficial: () => Promise<void>,
  host: HTMLElement,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  state: ManagerState,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
  startQuickImport: () => void,
  enterAdvancedManager: (action?: 'import' | 'directory') => void,
  appendDeployedCards: (deployedRecords?: DeployedWorkflowRecord[]) => HTMLDivElement,
) {
  const context: Parameters<typeof renderWorkflowLibraryHome> = [
    session, render, panel, client, loadOfficial, host, setNotice, state,
    loadDeployedRecords, startQuickImport, enterAdvancedManager, appendDeployedCards,
  ];
  return () => renderLibraryHome(...context);
}

function renderLibraryHome(...[
  session, render, panel, client, loadOfficial, host, setNotice, state,
  loadDeployedRecords, startQuickImport, enterAdvancedManager, appendDeployedCards,
]: Parameters<typeof renderWorkflowLibraryHome>) {
    if (!UI_FEATURES.runningHub) {
      session.librarySection = 'mine';
      session.libraryRunnerScope = 'local';
      session.libraryCloudImport = false;
      session.officialConnection = null;
    }
    if (!document.getElementById('nako-official-workflow-styles')) {
      const style = document.createElement('style');
      style.id = 'nako-official-workflow-styles';
      style.textContent = officialWorkflowStyles;
      document.head.append(style);
    }
    const navigation = element('nav', 'fwm-library-navigation');
    navigation.setAttribute('aria-label', '工作流来源');
    for (const [id, label] of [
      ['official', '官方推荐'],
      ['local', '我的本地工作流'],
      ['cloud', '我的云端工作流'],
    ] as const) {
      if (!UI_FEATURES.runningHub && id !== 'local') continue;
      const tab = button(label, 'ghost');
      tab.setAttribute('data-nako-workflow-library-scope', id);
      tab.setAttribute(
        'aria-pressed',
        String(
          id === 'official'
            ? session.librarySection === 'official'
            : session.librarySection === 'mine' && session.libraryRunnerScope === id,
        ),
      );
      tab.onclick = () => {
        session.libraryCloudImport = false;
        session.officialConnection = null;
        session.librarySection = id === 'official' ? 'official' : 'mine';
        if (id !== 'official') session.libraryRunnerScope = id;
        render();
      };
      navigation.append(tab);
    }
    panel.append(navigation);
    if (session.librarySection === 'official') {
      if (session.officialConnection) {
        const heading = element('div', 'fwm-library-toolbar-copy');
        heading.append(
          element('h3', '', `连接后使用：${session.officialConnection.name}`),
          element('p', '', '保存国内站连接后，返回官方推荐直接添加，无需查找工作流链接。'),
        );
        const back = button('返回官方推荐', 'ghost');
        back.onclick = () => {
          session.officialConnection = null;
          render();
        };
        panel.append(
          heading,
          back,
          createRunningHubQuickAdd(client, {
            connectDomesticOnly: {
              onConnected: async () => {
                await loadOfficial();
                if (!host.isConnected) return;
                session.officialConnection = null;
                render();
              },
            },
          }),
        );
        return;
      }
      if (!session.officialLoaded || session.officialError) {
        const notice = element(
          'div',
          'fwm-library-empty',
          session.officialError || '正在读取官方工作流…',
        );
        if (session.officialError) {
          const retry = button('重新读取');
          retry.onclick = () => {
            retry.disabled = true;
            void loadOfficial().then(render);
          };
          notice.append(retry);
        }
        panel.append(notice);
        return;
      }
      panel.append(
        createOfficialWorkflowGallery(session.officialWorkflows, async (item) => {
          if (!item.configured) {
            session.officialConnection = item;
            render();
            return;
          }
          const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
          if (!adapter) throw localRuntimeError('请先打开画布项目，再添加工作流。', 'addOfficialWorkflow', ERRORS.serviceMissing);
          const app = await client.addOfficialWorkflow(item.id);
          if (!host.isConnected || browserServices.__NAKO_WORKFLOW_NODES__ !== adapter) return;
          const snapshot = await client.getEditorSnapshot(app.definitionId);
          if (!host.isConnected || browserServices.__NAKO_WORKFLOW_NODES__ !== adapter) return;
          if (!snapshot.deployment || !snapshot.bindingSet)
            throw localRuntimeError('工作流配置尚未就绪，请重新加载。', 'addOfficialWorkflow', ERRORS.invalidConfiguration);
          const blueprint = await client.createCanvasNode(app.definitionId, {
            deploymentId: snapshot.deployment.id,
            bindingSetId: snapshot.bindingSet.id,
            title: item.name,
          });
          if (!host.isConnected || browserServices.__NAKO_WORKFLOW_NODES__ !== adapter) return;
          const insertion = await adapter.addToCanvas(blueprint);
          focusInsertedWorkflow(insertion?.nodeIds);
          setNotice(`${item.name} 已添加到画布。连接素材后即可运行。`, 'success');
          state.definitions = await client.listDefinitions();
          await loadDeployedRecords();
        }),
      );
      return;
    }
  renderPersonalLibrary(session, render, panel, client, loadOfficial, host, setNotice, state,
    loadDeployedRecords, startQuickImport, enterAdvancedManager, appendDeployedCards);
}

function renderPersonalLibrary(...[
  session, render, panel, client, _loadOfficial, _host, setNotice, state,
  loadDeployedRecords, startQuickImport, enterAdvancedManager, appendDeployedCards,
]: Parameters<typeof renderWorkflowLibraryHome>) {
    if (session.libraryCloudImport) {
      const importHead = element('div', 'fwm-library-toolbar');
      const importCopy = element('div', 'fwm-library-toolbar-copy');
      importCopy.append(
        element('h4', '', '加载云端工作流'),
        element('p', '', '输入链接或应用 ID；站点可由链接识别，分类会从工作流属性自动读取。'),
      );
      const back = button('返回工作流库', 'ghost');
      back.addEventListener('click', () => {
        session.libraryCloudImport = false;
        render();
      });
      importHead.append(importCopy, back);
      panel.append(
        importHead,
        createRunningHubQuickAdd(client, {
          showCredentials: true,
          onCreated: async () => {
            state.definitions = await client.listDefinitions();
            await loadDeployedRecords();
            session.libraryCloudImport = false;
            session.libraryRunnerScope = 'cloud';
            setNotice('云端工作流已加载，可直接添加到画布。', 'success');
            render();
          },
        }),
      );
      return;
    }
    const visibleRecords = state.deployedRecords.filter((record) =>
      session.libraryRunnerScope === 'cloud'
        ? isRunningHubRunner(record.deployment?.runner)
        : !isRunningHubRunner(record.deployment?.runner),
    );
    const toolbar = element('div', 'fwm-library-toolbar');
    const copy = element('div', 'fwm-library-toolbar-copy');
    copy.append(
      element('h4', '', '我的工作流'),
      element(
        'p',
        '',
        session.libraryRunnerScope === 'cloud'
          ? '选择云端工作流添加到画布；未运行的节点会在首次运行时检查。'
          : '选择本地工作流添加到画布；未运行的节点会在首次运行时检查。',
      ),
    );
    const actions = element('div', 'fwm-library-toolbar-actions');
    const importWorkflow = button('导入并添加', 'primary');
    importWorkflow.addEventListener('click', startQuickImport);
    const scanDirectory = button('从目录添加');
    scanDirectory.addEventListener('click', () => enterAdvancedManager('directory'));
    const advanced = button('高级管理', 'ghost');
    advanced.addEventListener('click', () => enterAdvancedManager());
    if (session.libraryRunnerScope === 'local') {
      actions.append(importWorkflow, scanDirectory, advanced);
    } else {
      const loadCloud = button('加载云端工作流', 'primary');
      loadCloud.setAttribute('data-nako-load-cloud-workflow', 'true');
      loadCloud.addEventListener('click', () => {
        session.libraryCloudImport = true;
        render();
      });
      actions.append(loadCloud);
    }
    toolbar.append(copy, actions);
    panel.append(toolbar);

    if (session.libraryReadFailures.length) {
      const failed = element('div', 'fwm-notice is-error');
      failed.setAttribute('role', 'status');
      failed.append(
        element(
          'p',
          '',
          `以下工作流暂时无法读取：${session.libraryReadFailures.map((item) => item.name).join('、')}。原有记录仍保留。`,
        ),
      );
      const retry = button('重新读取');
      retry.onclick = () => {
        retry.disabled = true;
        void loadDeployedRecords()
          .then(render)
          .catch(() => {
            retry.disabled = false;
          });
      };
      failed.append(retry);
      panel.append(failed);
    }

    if (!visibleRecords.length && !session.libraryReadFailures.length) {
      const empty = element('div', 'fwm-library-empty');
      const emptyCopy = element('div');
      emptyCopy.append(
        element(
          'strong',
          '',
          session.libraryRunnerScope === 'cloud' ? '还没有云端工作流' : '还没有可用的本地工作流',
        ),
        element(
          'span',
          '',
          session.libraryRunnerScope === 'cloud'
            ? '直接输入 RunningHub 链接或应用 ID 即可加载。'
            : '点击导入或将 ComfyUI API JSON 直接拖到这里，即可导入并添加。',
        ),
      );
      if (session.libraryRunnerScope === 'local') {
        const firstImport = button('导入并添加第一个工作流', 'primary');
        firstImport.addEventListener('click', startQuickImport);
        emptyCopy.append(firstImport);
      }
      empty.append(emptyCopy);
      panel.append(empty);
      return;
    }

    const searchRow = element('div', 'fwm-library-search-row');
    const searchShell = element('label', 'fwm-library-search');
    const search = element('input', 'fwm-input');
    search.type = 'search';
    search.placeholder = '搜索工作流';
    search.setAttribute('aria-label', '搜索工作流');
    searchShell.append(search);
    const count = element('span', 'fwm-library-count', `${visibleRecords.length} 个工作流`);
    searchRow.append(searchShell, count);
    panel.append(searchRow);
    const records = appendDeployedCards(visibleRecords);
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('zh-CN');
      let visible = 0;
      for (const card of records.querySelectorAll<HTMLElement>('.fwm-workflow-card')) {
        const matches = !query || (card.dataset.searchValue || '').includes(query);
        card.hidden = !matches;
        if (matches) visible += 1;
      }
      count.textContent = query
        ? `${visible} / ${visibleRecords.length}`
        : `${visibleRecords.length} 个工作流`;
    });
}

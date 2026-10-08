import { createRunningHubManagerView } from './runningHubManagerView';
import { createRunningHubLibraryCard, renderRunningHubCategories } from './runningHubLibraryRender';
import { appendRunningHubQuickCredentials } from './runningHubQuickCredentials';
import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { browserServices } from '../../../kernel/browser';
import type {
  RunningHubWebAppCard,
  RunningHubWebAppCategory,
  RunningHubWebAppClient as WebAppClient,
  WorkflowManagerClient,
} from './workflowManagerClient';
import {
  RUNNINGHUB_PAID_CONFIRMATION_KEY,
  isConfirmationSuppressed,
  resetConfirmationPreference,
} from '../../../canvas-ui/api/ui/design/designSystem';

export const RUNNINGHUB_WEBAPP_TEST_EVENT = 'nako:test-runninghub-webapp';
const STYLE_ID = 'nako-runninghub-webapp-manager-styles';
type RunningHubWebAppClient = WebAppClient &
  Pick<WorkflowManagerClient, 'getEditorSnapshot' | 'createCanvasNode'>;

type RunningHubCredentialRef = 'runninghub-cn' | 'runninghub-global';

export function parseRunningHubWebAppReference(value: string): {
  webAppId: string;
  credentialRef: RunningHubCredentialRef | undefined;
} {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw localRuntimeError('请粘贴 RunningHub 应用详情链接、AI 应用 API 手册链接，或输入应用 ID。', 'parseRunningHubWebAppReference', ERRORS.invalidConfiguration);
  }
  if (!normalized.includes('://')) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalized)) {
      throw localRuntimeError('WebApp ID 格式无效。', 'parseRunningHubWebAppReference', ERRORS.invalidConfiguration);
    }
    return { webAppId: normalized, credentialRef: undefined };
  }
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw localRuntimeError('RunningHub WebApp 链接格式无效。', 'parseRunningHubWebAppReference', ERRORS.invalidConfiguration);
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!['runninghub.cn', 'runninghub.ai'].includes(host)) {
    throw localRuntimeError('仅支持 RunningHub 国内站或海外站的 WebApp 页面链接。', 'parseRunningHubWebAppReference', ERRORS.invalidConfiguration);
  }
  const pathname = url.pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/)/iu, '');
  const detailMatch = /^\/ai-detail\/([A-Za-z0-9_-]{1,128})\/?$/.exec(pathname);
  const apiDetailMatch = /^\/call-api\/api-detail\/([A-Za-z0-9_-]{1,128})\/?$/.exec(pathname);
  const apiType = url.searchParams.get('apiType');
  if (apiDetailMatch && apiType && apiType !== '4') {
    throw localRuntimeError('当前只支持 RunningHub AI 应用 API 手册链接。', 'parseRunningHubWebAppReference', ERRORS.invalidConfiguration);
  }
  const match = detailMatch || apiDetailMatch;
  if (!match) {
    throw localRuntimeError('请粘贴 RunningHub 应用详情链接、AI 应用 API 手册链接，或直接输入应用 ID。', 'parseRunningHubWebAppReference', ERRORS.invalidConfiguration);
  }
  return {
    webAppId: match[1],
    credentialRef: host === 'runninghub.ai' ? 'runninghub-global' : 'runninghub-cn',
  };
}

function control(label: string, primary = false) {
  const button = element('button', `rhwm-button${primary ? ' is-primary' : ''}`, label);
  button.type = 'button';
  return button;
}


function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = element('style');
  style.id = STYLE_ID;
  style.textContent = `
    [data-nako-runninghub-webapps] { color:var(--nk-text); font-family:Inter,'Microsoft YaHei UI',system-ui,sans-serif; }
    .rhwm-shell { display:grid; gap:20px; padding-bottom:32px; }
    .rhwm-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
    .rhwm-head > :first-child { min-width:0; }
    .rhwm-kicker { margin:0 0 7px; color:var(--nk-text-muted); font:600 11px/1.4 'Cascadia Code',Consolas,monospace; letter-spacing:.15em; }
    .rhwm-title { margin:0; color:var(--nk-text); font-size:24px; line-height:1.25; font-weight:700; }
    .rhwm-subtitle { margin:7px 0 0; max-width:760px; color:var(--nk-text-muted); font-size:13px; line-height:1.6; }
    .rhwm-button { min-height:34px; flex:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:0 13px; border:1px solid var(--nk-border-control); border-radius:7px; background:var(--nk-surface-raised); color:var(--nk-text); font-size:11px; font-weight:650; line-height:1; letter-spacing:.01em; white-space:nowrap; cursor:pointer; box-shadow:none; transition:transform .14s ease,background-color .14s ease,color .14s ease,border-color .14s ease,box-shadow .14s ease; }
    .rhwm-button:hover:not(:disabled) { border-color:var(--nk-border-control); background:var(--nk-surface-raised); color:var(--nk-text); }
    .rhwm-button:active:not(:disabled) { transform:translateY(1px); }
    .rhwm-button:focus-visible { outline:2px solid var(--nk-info); outline-offset:2px; }
    .rhwm-button.is-primary { border-color:var(--nk-border-control); background:var(--nk-primary); color:var(--nk-on-primary); box-shadow:var(--nk-shadow); }
    .rhwm-button.is-primary:hover:not(:disabled) { border-color:var(--nk-border-control); background:var(--nk-primary); color:var(--nk-on-primary); box-shadow:var(--nk-shadow); transform:translateY(-1px); }
    .rhwm-button.is-primary:active:not(:disabled) { background:var(--nk-primary); box-shadow:var(--nk-shadow); transform:translateY(0); }
    .rhwm-button.is-commit { min-height:36px; padding-inline:16px; }
    .rhwm-button:disabled { opacity:.45; cursor:not-allowed; }
    .rhwm-credentials { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; padding:18px; border:1px solid var(--nk-border); border-radius:12px; background:var(--nk-surface); }
    .rhwm-section-copy { grid-column:1/-1; display:flex; justify-content:space-between; align-items:baseline; gap:16px; }
    .rhwm-section-copy strong { font-size:14px; }
    .rhwm-section-copy span { color:var(--nk-text-muted); font-size:11px; }
    .rhwm-key-card { min-width:0; display:grid; gap:9px; padding:14px; border-left:2px solid var(--nk-info); background:var(--nk-input); }
    .rhwm-key-card.is-valid { border-left-color:var(--nk-success); }
    .rhwm-key-card.is-error { border-left-color:var(--nk-danger); }
    .rhwm-key-head,.rhwm-key-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .rhwm-key-head label { display:flex; align-items:center; gap:7px; color:var(--nk-text-secondary); font-size:11px; font-weight:700; }
    .rhwm-key-state { color:var(--nk-text-muted); font-size:10px; }
    .rhwm-key-state.is-valid { color:var(--nk-success); }
    .rhwm-key-state.is-error { color:var(--nk-danger); }
    .rhwm-credential-actions { grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:12px; padding-top:2px; }
    .rhwm-credential-actions span { color:var(--nk-text-muted); font-size:10px; line-height:1.5; }
    .rhwm-status-dot { width:6px; height:6px; border-radius:999px; background:var(--nk-hover); }
    .rhwm-status-dot.is-ready { background:var(--nk-success); }
    .rhwm-status-dot.is-error { background:var(--nk-danger); }
    .rhwm-input { width:100%; min-height:38px; padding:0 11px; border:1px solid var(--nk-border-control); border-radius:8px; background:var(--nk-input); color:var(--nk-text); font-size:12px; outline:none; }
    .rhwm-input:focus { border-color:var(--nk-info); box-shadow:0 0 0 1px #60a5fa; }
    .rhwm-category-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .rhwm-chip { min-height:30px; padding:0 11px; border:0; border-radius:999px; background:var(--nk-surface); color:var(--nk-text-muted); font-size:11px; cursor:pointer; }
    .rhwm-chip.is-active { background:var(--nk-primary); color:var(--nk-on-primary); }
    .rhwm-quick-add { display:grid; gap:18px; padding:14px 0 16px; border-top:1px solid var(--nk-border); border-bottom:1px solid var(--nk-border); }
    .rhwm-quick-copy { display:flex; align-items:baseline; justify-content:space-between; gap:16px; }
    .rhwm-quick-copy strong { font-size:14px; }
    .rhwm-quick-copy span { color:var(--nk-text-muted); font-size:10px; }
    .rhwm-stage { min-width:0; border:1px solid var(--nk-border); border-radius:12px; background:var(--nk-input); }
    .rhwm-stage.is-account { border-color:var(--nk-info); background:var(--nk-surface); }
    .rhwm-stage.is-workflow { display:grid; gap:14px; padding:18px; background:var(--nk-surface); }
    .rhwm-stage-heading { grid-column:1/-1; display:grid; grid-template-columns:auto minmax(0,1fr); gap:5px 12px; align-items:center; padding-bottom:13px; border-bottom:1px solid var(--nk-border); }
    .rhwm-stage-index { grid-row:1/3; min-width:32px; color:var(--nk-info); font:700 11px/1 'Cascadia Code',Consolas,monospace; letter-spacing:.08em; }
    .rhwm-stage-heading h3 { margin:0; color:var(--nk-text); font-size:14px; line-height:1.35; font-weight:700; }
    .rhwm-stage-heading p { margin:0; color:var(--nk-text-muted); font-size:10px; line-height:1.5; }
    .rhwm-stage.is-workflow .rhwm-stage-index { color:var(--nk-text-secondary); }
    .rhwm-quick-belt { display:grid; grid-template-columns:auto minmax(260px,1fr) auto auto; gap:10px; align-items:center; }
    .rhwm-segment { display:inline-flex; gap:3px; padding:3px; border:1px solid var(--nk-border); border-radius:8px; background:var(--nk-input); }
    .rhwm-segment button { min-height:30px; padding:0 10px; border:0; border-radius:5px; background:transparent; color:var(--nk-text-muted); font-size:11px; font-weight:700; cursor:pointer; }
    .rhwm-segment button.is-active { background:var(--nk-primary); color:var(--nk-on-primary); }
    .rhwm-auto-category { min-height:30px; display:inline-flex; align-items:center; padding:0 10px; border:1px solid var(--nk-border); border-radius:999px; background:var(--nk-surface); color:var(--nk-text-secondary); font-size:10px; white-space:nowrap; }
    .rhwm-quick-credentials { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto; gap:12px; align-items:end; padding:18px; }
    .rhwm-quick-key { min-width:0; display:grid; gap:7px; }
    .rhwm-quick-key-head { display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--nk-text-secondary); font-size:10px; font-weight:700; }
    .rhwm-quick-key-status { min-height:16px; margin:0; color:var(--nk-text-muted); font-size:10px; }
    .rhwm-quick-key-status.is-success { color:var(--nk-success); }
    .rhwm-quick-key-status.is-error { color:var(--nk-danger); }
    .rhwm-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .rhwm-empty { grid-column:1/-1; min-height:180px; display:grid; place-items:center; padding:24px; border:1px dashed var(--nk-border); border-radius:12px; color:var(--nk-text-muted); text-align:center; font-size:12px; }
    .rhwm-card { min-width:0; overflow:hidden; border:1px solid var(--nk-border); border-radius:12px; background:var(--nk-surface); }
    .rhwm-card-cover { position:relative; height:180px; display:flex; flex-direction:column; justify-content:space-between; padding:15px; background:var(--nk-input); border-bottom:1px solid var(--nk-border); }
    .rhwm-card-cover::after { content:''; position:absolute; left:15px; right:15px; bottom:15px; height:1px; background:var(--nk-info-bg); }
    .rhwm-card-badges { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .rhwm-badge { padding:4px 7px; border-radius:6px; background:var(--nk-surface-raised); color:var(--nk-text-secondary); font:600 9px/1.2 'Cascadia Code',Consolas,monospace; letter-spacing:.06em; }
    .rhwm-badge.is-ready { color:var(--nk-success); background:var(--nk-success-bg); }
    .rhwm-card-mark { color:var(--nk-info); font:700 30px/1 'Cascadia Code',Consolas,monospace; letter-spacing:-.06em; }
    .rhwm-card-body { display:grid; gap:11px; padding:15px; }
    .rhwm-card-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; font-weight:700; }
    .rhwm-card-description { min-height:36px; color:var(--nk-text-muted); font-size:11px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .rhwm-card-meta { display:flex; align-items:center; gap:7px; color:var(--nk-text-muted); font:500 10px/1.4 'Cascadia Code',Consolas,monospace; }
    .rhwm-card-actions { display:grid; grid-template-columns:auto 1fr; gap:8px; }
    .rhwm-delete { border-color:transparent; background:transparent; color:var(--nk-danger); }
    .rhwm-notice { min-height:18px; margin:0; color:var(--nk-text-muted); font-size:11px; }
    .rhwm-notice.is-error { color:var(--nk-danger); }
    .rhwm-notice.is-success { color:var(--nk-success); }
    @media (max-width:1280px) { .rhwm-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width:900px) { .rhwm-head { align-items:stretch; flex-direction:column; } .rhwm-credentials,.rhwm-quick-credentials { grid-template-columns:1fr; } .rhwm-quick-belt { grid-template-columns:1fr; } .rhwm-grid { grid-template-columns:1fr; } .rhwm-credential-actions { grid-template-columns:1fr; align-items:stretch; } .rhwm-credential-actions .rhwm-button { justify-self:start; } }
    @media (prefers-reduced-motion:reduce) { .rhwm-button { transition-duration:.01ms; } .rhwm-button:hover:not(:disabled),.rhwm-button:active:not(:disabled) { transform:none; } }
  `;
  document.head.append(style);
}

function message(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请检查网络和 RunningHub 配置。';
}

function stageHeading(index: string, title: string, description: string, titleId: string) {
  const heading = element('div', 'rhwm-stage-heading');
  const titleNode = element('h3', '', title);
  titleNode.id = titleId;
  heading.append(
    element('span', 'rhwm-stage-index', index),
    titleNode,
    element('p', '', description),
  );
  return heading;
}

export function createRunningHubQuickAdd(
  client: RunningHubWebAppClient,
  options: {
    onCreated?: (app: RunningHubWebAppCard) => void | Promise<void>;
    showCredentials?: boolean;
    connectDomesticOnly?: { onConnected: () => void | Promise<void> };
  } = {},
) {
  injectStyles();
  const root = element('section', 'rhwm-quick-add');
  root.setAttribute('data-nako-rh-quick-add', 'true');
  const copy = element('div', 'rhwm-quick-copy');
  copy.append(
    element('strong', '', '直接加载云端工作流'),
    element('span', '', '添加时只读取开放字段，不会创建任务或产生费用。'),
  );
  const belt = element('div', 'rhwm-quick-belt');
  const site = element('div', 'rhwm-segment');
  site.setAttribute('role', 'group');
  site.setAttribute('aria-label', 'RunningHub 站点');
  let selectedSite: RunningHubCredentialRef = 'runninghub-cn';
  const siteButtons = new Map<RunningHubCredentialRef, HTMLButtonElement>();
  const selectSite = (value: RunningHubCredentialRef) => {
    selectedSite = value;
    for (const [id, button] of siteButtons) button.classList.toggle('is-active', id === value);
  };
  for (const [id, label] of [
    ['runninghub-cn', 'CN'],
    ['runninghub-global', 'AI'],
  ] as const) {
    const button = element('button', '', label);
    button.type = 'button';
    button.setAttribute('data-nako-rh-site', id);
    button.addEventListener('click', () => selectSite(id));
    siteButtons.set(id, button);
    site.append(button);
  }
  selectSite(selectedSite);
  const reference = element('input', 'rhwm-input');
  reference.setAttribute('data-nako-rh-webapp-id', 'true');
  reference.placeholder = '粘贴 RunningHub 链接或输入应用 ID';
  const automaticCategory = element('span', 'rhwm-auto-category', '分类自动识别');
  const create = control('读取并添加', true);
  create.classList.add('is-commit');
  const notice = element('p', 'rhwm-notice');
  reference.addEventListener('input', () => {
    try {
      const parsed = parseRunningHubWebAppReference(reference.value);
      if (parsed.credentialRef) selectSite(parsed.credentialRef);
      notice.textContent = parsed.credentialRef ? '已从链接识别站点。' : '';
      notice.className = 'rhwm-notice is-success';
    } catch (error) {
      notice.textContent = reference.value.trim() ? message(error) : '';
      notice.className = 'rhwm-notice is-error';
    }
  });
  create.addEventListener('click', () => {
    void (async () => {
      const previous = create.textContent || '';
      create.disabled = true;
      create.textContent = '正在读取…';
      const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
      try {
        const parsed = parseRunningHubWebAppReference(reference.value);
        const credentialRef = parsed.credentialRef || selectedSite;
        selectSite(credentialRef);
        const status = await client.getRunningHubCredentialStatus();
        const configured =
          credentialRef === 'runninghub-cn' ? status.cnConfigured : status.globalConfigured;
        if (!configured) throw localRuntimeError('请先在上方保存对应站点的 API Key。', 'createRunningHubQuickAdd', ERRORS.credentialMissing);
        const app = await client.createRunningHubWebApp({
          webAppId: parsed.webAppId,
          credentialRef,
        });
        reference.value = '';
        notice.textContent = '云端工作流已加载，可直接添加到画布。';
        notice.className = 'rhwm-notice is-success';
        await options.onCreated?.(app);
        if (adapter) {
          const snapshot = await client.getEditorSnapshot(app.definitionId);
          if (!snapshot.deployment || !snapshot.bindingSet)
            throw localRuntimeError('工作流已导入，但参数尚未就绪，请在工作流库中检查后添加。', 'createRunningHubQuickAdd', ERRORS.invalidConfiguration);
          const blueprint = await client.createCanvasNode(app.definitionId, {
            deploymentId: snapshot.deployment.id,
            bindingSetId: snapshot.bindingSet.id,
            title: app.title,
          });
          if (browserServices.__NAKO_WORKFLOW_NODES__ !== adapter)
            throw localRuntimeError('工作流已导入，当前项目已切换，请从工作流库添加。', 'createRunningHubQuickAdd', ERRORS.inactive);
          const insertion = await adapter.addToCanvas(blueprint);
          browserServices.__NAKO_FOCUS_NODES__?.(insertion.nodeIds);
          notice.textContent = '云端工作流已添加到画布，连接素材后即可运行。';
        }
      } catch (error) {
        notice.textContent = message(error);
        notice.className = 'rhwm-notice is-error';
      } finally {
        create.disabled = false;
        create.textContent = previous;
      }
    })();
  });
  belt.append(site, reference, automaticCategory, create);
  root.append(copy);

  if (options.showCredentials || options.connectDomesticOnly) {
    copy.remove();
    appendRunningHubQuickCredentials(root, client, options.connectDomesticOnly);
    if (options.connectDomesticOnly) return root;
  }

  if (options.showCredentials) {
    const workflow = element('section', 'rhwm-stage is-workflow');
    workflow.setAttribute('data-nako-rh-stage', 'workflow');
    const workflowTitleId = `rhwm-workflow-stage-${Math.random().toString(36).slice(2)}`;
    workflow.setAttribute('aria-labelledby', workflowTitleId);
    workflow.append(
      stageHeading(
        '02',
        '添加云端工作流',
        '这里只粘贴 RunningHub 工作流链接或应用 ID，不要填写 API Key。',
        workflowTitleId,
      ),
      belt,
      notice,
    );
    root.append(workflow);
  } else {
    root.append(belt, notice);
  }
  return root;
}

export function createRunningHubWebAppManager(client: RunningHubWebAppClient) {
  injectStyles();
  const root = element('section');
  root.setAttribute('data-nako-runninghub-webapps', 'true');
  const shell = element('div', 'rhwm-shell');
  const notice = element('p', 'rhwm-notice');
  let apps: RunningHubWebAppCard[] = [];
  let categories: RunningHubWebAppCategory[] = [];
  let activeCategory = 'all';
  let credentialStatus = { cnConfigured: false, globalConfigured: false };
  const credentialValidation: Record<'cn' | 'global', 'idle' | 'valid' | 'error'> = {
    cn: 'idle',
    global: 'idle',
  };

  const { head, credentials, cnCard, cnDot, cnState, cnKey,
    globalCard, globalDot, globalState, globalKey, saveKeys, resetPaidWarning } = createRunningHubManagerView(() => {
    resetConfirmationPreference(RUNNINGHUB_PAID_CONFIRMATION_KEY);
    renderCredentials();
    setNotice('已恢复 RunningHub 付费任务提醒。', 'success');
  });

  const categoryBar = element('div', 'rhwm-category-bar');
  const grid = element('div', 'rhwm-grid');
  const quickAdd = createRunningHubQuickAdd(client, {
    onCreated: async () => {
      await load();
      setNotice('云端工作流已加载，可直接添加到画布。', 'success');
    },
  });
  shell.append(head, credentials, quickAdd, categoryBar, grid, notice);
  root.append(shell);

  const setNotice = (text: string, tone: '' | 'error' | 'success' = '') => {
    notice.textContent = text;
    notice.className = `rhwm-notice${tone ? ` is-${tone}` : ''}`;
  };

  const busy = async (button: HTMLButtonElement, label: string, action: () => Promise<void>) => {
    const previous = button.textContent || '';
    button.disabled = true;
    button.textContent = label;
    try {
      await action();
    } catch (error) {
      setNotice(message(error), 'error');
    } finally {
      button.disabled = false;
      button.textContent = previous;
    }
  };

  const renderCredentials = () => {
    const renderCredential = (
      card: HTMLElement,
      dot: HTMLElement,
      state: HTMLElement,
      configured: boolean,
      validation: 'idle' | 'valid' | 'error',
    ) => {
      card.classList.toggle('is-valid', validation === 'valid');
      card.classList.toggle('is-error', validation === 'error');
      dot.classList.toggle('is-ready', validation === 'valid');
      dot.classList.toggle('is-error', validation === 'error');
      state.className = `rhwm-key-state${validation === 'valid' ? ' is-valid' : validation === 'error' ? ' is-error' : ''}`;
      state.textContent =
        validation === 'valid'
          ? '验证通过'
          : validation === 'error'
            ? '验证失败'
            : configured
              ? '已长期保存 · 待验证'
              : '未配置';
    };
    renderCredential(
      cnCard,
      cnDot,
      cnState,
      credentialStatus.cnConfigured,
      credentialValidation.cn,
    );
    renderCredential(
      globalCard,
      globalDot,
      globalState,
      credentialStatus.globalConfigured,
      credentialValidation.global,
    );
    cnKey.placeholder = credentialStatus.cnConfigured
      ? '已长期保存；仅更换时输入新 Key'
      : '输入 runninghub.cn API Key';
    globalKey.placeholder = credentialStatus.globalConfigured
      ? '已长期保存；仅更换时输入新 Key'
      : '输入 runninghub.ai API Key';
    const paidWarningSuppressed = isConfirmationSuppressed(RUNNINGHUB_PAID_CONFIRMATION_KEY);
    resetPaidWarning.textContent = paidWarningSuppressed ? '恢复付费提醒' : '付费提醒已开启';
    resetPaidWarning.disabled = !paidWarningSuppressed;
  };

  const renderCategories = () => renderRunningHubCategories(categoryBar, apps, categories, activeCategory, id => {
    activeCategory = id;
    render();
  });

  const createCard = (app: RunningHubWebAppCard) => createRunningHubLibraryCard(app, async () => {
    await client.deleteRunningHubWebApp(app.definitionId);
    await load();
    setNotice('云端工作流已删除。', 'success');
  }, busy);

  const render = () => {
    renderCredentials();
    renderCategories();
    grid.replaceChildren();
    const visible =
      activeCategory === 'all' ? apps : apps.filter((app) => app.categoryId === activeCategory);
    if (!visible.length) {
      grid.append(
        element(
          'div',
          'rhwm-empty',
          apps.length
            ? '该分类还没有云端工作流。'
            : '还没有云端工作流。填写 API Key 后，输入 WebApp ID 即可添加。',
        ),
      );
      return;
    }
    for (const app of visible) grid.append(createCard(app));
  };

  const load = async () => {
    const [library, status] = await Promise.all([
      client.listRunningHubWebApps(),
      client.getRunningHubCredentialStatus(),
    ]);
    apps = library.apps;
    categories = library.categories;
    credentialStatus = status;
    render();
  };

  const saveAndValidateCredentials = async () => {
    const cnValue = cnKey.value.trim();
    const globalValue = globalKey.value.trim();
    const hasNewValue = Boolean(cnValue || globalValue);
    if (hasNewValue) {
      await client.saveRunningHubCredentials({ cnApiKey: cnValue, globalApiKey: globalValue });
      credentialStatus.cnConfigured ||= Boolean(cnValue);
      credentialStatus.globalConfigured ||= Boolean(globalValue);
      if (cnValue) credentialValidation.cn = 'idle';
      if (globalValue) credentialValidation.global = 'idle';
      cnKey.value = '';
      globalKey.value = '';
    }
    const references: RunningHubCredentialRef[] = [];
    if (cnValue || (!hasNewValue && credentialStatus.cnConfigured))
      references.push('runninghub-cn');
    if (globalValue || (!hasNewValue && credentialStatus.globalConfigured)) {
      references.push('runninghub-global');
    }
    if (!references.length) throw localRuntimeError('请先输入至少一个 RunningHub API Key。', 'saveAndValidateCredentials', ERRORS.credentialMissing);
    const failures: unknown[] = [];
    await Promise.all(
      references.map(async (reference) => {
        const state = reference === 'runninghub-cn' ? 'cn' : 'global';
        try {
          await client.validateRunningHubCredential(reference);
          credentialValidation[state] = 'valid';
        } catch (error) {
          credentialValidation[state] = 'error';
          failures.push(error);
        }
      }),
    );
    renderCredentials();
    if (failures.length) {
      throw localRuntimeError(`${hasNewValue ? 'API Key 已保存，但' : ''}${message(failures[0])}`, 'saveAndValidateCredentials', ERRORS.providerRequest, undefined, failures[0]);
    }
    const labels = references.map((reference) =>
      reference === 'runninghub-cn' ? '国内站 API Key' : '海外站 API Key',
    );
    setNotice(`${labels.join('、')} 验证通过。`, 'success');
  };

  saveKeys.addEventListener('click', () => {
    void busy(saveKeys, '正在验证…', saveAndValidateCredentials);
  });
  void load().catch((error) => setNotice(message(error), 'error'));
  return root;
}
import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';

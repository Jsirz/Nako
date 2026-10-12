import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { browserServices } from '../../../kernel/browser';
import { observeStableEnhancement } from '../../../canvas-ui/api/ui/lifecycle/enhancementLifecycle';
import type { AgentConversation, ConversationTools } from './agentConversation';
import type { DramaConversationState } from './agentClient';
import { productionProfileForSkill, productionProfileForBundle } from '../../../contracts/officialProductionProfiles.js';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import { buildDramaAssetNodes, buildDramaCanvasNodes, mergeDramaCanvasNodes } from './dramaCanvas';
import type { DramaCanvasBridge } from './dramaCanvasBridge';
import {
  createDramaClient,
  type DramaAssetExecution,
  type DramaClient,
  type DramaPlan,
} from './dramaClient';

const MAX_BATCH = 12;
const LABELS: Record<string, string> = {
  pending: '生成中',
  success: '已落盘',
  failed: '失败',
  cancelled: '已停止',
  unknown: '结果待确认',
};
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function latestAssets(state: DramaConversationState) {
  const latest = new Map<string, DramaAssetExecution>();
  for (const item of state.execution?.assets || []) {
    const prior = latest.get(item.assetId);
    if (
      !prior ||
      item.attemptNumber > prior.attemptNumber ||
      (item.attemptNumber === prior.attemptNumber &&
        (item.stateRevision || 0) >= (prior.stateRevision || 0))
    )
      latest.set(item.assetId, item);
  }
  return latest;
}

/** Local tools embedded in the original Agent scroll area, not another chat or wizard. */
export function installDramaConversationTools(
  canvas: DramaCanvasBridge,
  conversation: AgentConversation,
  importer: Pick<DramaClient, 'importScript'> = createDramaClient(),
) {
  const local = createDramaToolState();
  const services = createDramaToolScope(canvas, conversation, local);
  const actions = createDramaToolActions(canvas, conversation, importer, local, services);
  const controls = createDramaToolControls(conversation, local, services, actions);
  local.render = createDramaToolRenderer(canvas, conversation, local, services, actions, controls);
  return mountDramaTools(canvas, conversation, local, services, actions);
}

function createDramaToolState() {
  return {
    card: null as HTMLElement | null, attachment: null as HTMLElement | null,
    disposed: false, context: '', contextEpoch: 0, planKey: '', busy: false, running: false,
    batchEpoch: 0, paidConsent: false, compositionConsent: false, note: '', noteError: false,
    wake: null as (() => void) | null, selected: new Set<string>(), canvasSignature: '',
    canvasQueue: Promise.resolve(),
    pendingFocus: null as { control?: string; action?: string; details?: string } | null,
    renderedPlanKey: '', render: () => {},
  };
}
type DramaToolState = ReturnType<typeof createDramaToolState>;
function createDramaToolScope(canvas: DramaCanvasBridge, conversation: AgentConversation, local: DramaToolState) {
  const isDramaSelected = () => {
    const skill = conversation.snapshot().selectedSkill;
    return skill?.source === 'official' && Boolean(productionProfileForSkill(skill.slug));
  };
  const status = (text: string, error = false) => {
    local.note = text;
    local.noteError = error;
    local.render();
  };
  const current = (session: string, project: string) =>
    !local.disposed &&
    Boolean(local.card?.isConnected) &&
    isDramaSelected() &&
    conversation.isCurrent(session, project) &&
    canvas.projectId() === project;
  const scope = (session: string, project: string) => {
    const epoch = local.contextEpoch;
    return () => epoch === local.contextEpoch && current(session, project);
  };
  const stop = (message = true) => {
    local.batchEpoch += 1;
    local.wake?.();
    local.wake = null;
    local.paidConsent = false;
    if (message && local.running)
      status(
        '已停止后续提交；已提交的远端任务可能继续运行。点击“查询原任务”可取回结果，不会重新生成。',
      );
  };
  return { isDramaSelected, status, current, scope, stop };
}

type DramaToolScope = ReturnType<typeof createDramaToolScope>;
function createDramaToolActions(canvas: DramaCanvasBridge, conversation: AgentConversation,
  importer: Pick<DramaClient, 'importScript'>, local: DramaToolState,
  { isDramaSelected, status, current, scope }: DramaToolScope) {
  const pause = () =>
    new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        local.wake = null;
        resolve();
      }, 2000);
      local.wake = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });
  const mergeAssets = (state: DramaConversationState) => {
    const { plan, execution, session } = state;
    if (!plan || !execution || !execution.assets.length || !current(session.id, plan.projectId))
      return Promise.resolve();
    const active = scope(session.id, plan.projectId);
    const signature = JSON.stringify([session.id, plan.id, plan.revision, execution.assets]);
    if (signature === local.canvasSignature) return local.canvasQueue;
    local.canvasQueue = local.canvasQueue
      .catch(() => undefined)
      .then(async () => {
        if (!active() || signature === local.canvasSignature) return;
        const nodes = buildDramaAssetNodes(plan, execution);
        await canvas.commit(
          plan.projectId,
          (previous) => {
            if (!active()) return [...previous];
            return mergeDramaCanvasNodes(previous, nodes, {
              projectId: plan.projectId,
              expectedProjectId: canvas.projectId() || '',
            });
          },
          { select: false },
        );
        if (active()) local.canvasSignature = signature;
      });
    return local.canvasQueue;
  };
  const action = async (work: (tools: ConversationTools) => Promise<void>) => {
    if (local.busy || conversation.snapshot().busy || !isDramaSelected()) return;
    const snapshot = conversation.snapshot();
    if (!snapshot.sessionId || !snapshot.projectId) return;
    const { sessionId, projectId } = snapshot;
    const active = scope(sessionId, projectId);
    local.busy = true;
    local.note = '';
    local.noteError = false;
    local.render();
    try {
      await conversation.withTools(work);
    } catch (cause) {
      if (active())
        status(
          cause instanceof Error ? cause.message : '操作未完成，请查询原任务；不要重复提交。',
          true,
        );
    } finally {
      local.busy = false;
      local.running = false;
      local.render();
    }
  };
  const uploadScript = async (file: File) => {
    const initial = conversation.snapshot();
    if (local.busy || initial.busy || initial.restoring || !initial.projectId || !isDramaSelected())
      return;
    if (!/\.(txt|md|docx)$/i.test(file.name)) {
      status('支持 TXT、Markdown、DOCX 剧本文件。', true);
      return;
    }
    const project = initial.projectId;
    const generation = local.contextEpoch;
    let active = () =>
      generation === local.contextEpoch &&
      !local.disposed &&
      isDramaSelected() &&
      canvas.projectId() === project;
    local.busy = true;
    local.note = '';
    local.noteError = false;
    local.render();
    try {
      // A new chat has a default SKILL without a server task yet. Register it only
      // after an explicit attachment action; registration is not a model request.
      if (!initial.state) {
        const registration = conversation.ensureDefaultSkill();
        const intendedSession = conversation.snapshot().sessionId;
        const registrationEpoch = local.contextEpoch;
        if (
          !(await registration) ||
          registrationEpoch !== local.contextEpoch ||
          conversation.snapshot().sessionId !== intendedSession
        )
          return;
      }
      const snapshot = conversation.snapshot();
      if (!snapshot.sessionId || snapshot.projectId !== project || !isDramaSelected()) return;
      active = scope(snapshot.sessionId, project);
      await conversation.withTools(async (tools) => {
        const script = await importer.importScript(file);
        if (!active() || !tools.current()) return;
        await tools.attachScript(script);
        if (!active() || !tools.current()) return;
        status(`已添加「${script.name}」，未调用模型。发送消息后才交给当前文本模型处理。`);
      });
    } catch (cause) {
      if (active()) status(cause instanceof Error ? cause.message : '剧本添加失败，请重试。', true);
    } finally {
      local.busy = false;
      local.render();
    }
  };
  const batch = (plan: DramaPlan, ids: string[]) => {
    if (!local.paidConsent || !ids.length || ids.length > MAX_BATCH) return;
    const state = conversation.snapshot().state;
    if (!state || state.plan?.id !== plan.id || state.plan.revision !== plan.revision) return;
    const original = latestAssets(state);
    const targets = ids.map((id) => ({ id, retry: original.get(id) }));
    // Unknown/pending submissions are queried, never treated as another paid attempt.
    if (
      targets.some(({ retry }) => retry && !(retry.status === 'failed' && retry.retryable === true))
    )
      return;
    local.paidConsent = false;
    const generation = ++local.batchEpoch;
    void action(async (tools) => {
      local.running = true;
      for (const { id, retry } of targets) {
        if (generation !== local.batchEpoch || !tools.current() || document.hidden) break;
        status(
          `正在提交「${plan.assets.find((asset) => asset.id === id)?.name || id}」；仅本项图片 1 次，不生成视频。`,
        );
        let result = await tools.action({
          action: 'generate',
          planId: plan.id,
          planRevision: plan.revision,
          assetId: id,
          attemptId: crypto.randomUUID(),
          confirmPaidExecution: true,
          maxAssets: 1,
          ...(retry ? { retryOfAttemptId: retry.attemptId } : {}),
        });
        await mergeAssets(result);
        let receipt = latestAssets(result).get(id);
        // Observation is bounded and can always be stopped. It never submits another generation.
        for (let count = 0; receipt?.status === 'pending' && count < 1500; count += 1) {
          if (generation !== local.batchEpoch || !tools.current() || document.hidden) return;
          await pause();
          if (generation !== local.batchEpoch || !tools.current() || document.hidden) return;
          result = await tools.action({
            action: 'query',
            planId: plan.id,
            planRevision: plan.revision,
            assetId: id,
            attemptId: receipt.attemptId,
          });
          await mergeAssets(result);
          receipt = latestAssets(result).get(id);
        }
        if (receipt?.status !== 'success') {
          throw new AgentOperationError(
            receipt?.error || '本项尚未确认成功，已停止后续提交。请查询原任务，不会自动重新生成。',
            { operation: 'generate-drama-batch', planId: plan.id, assetId: id });
        }
        local.selected.delete(id);
      }
      if (generation === local.batchEpoch && tools.current())
        status('本批资产已生成并显示在画布。可继续对话调整；检查图像后再创建文戏节点。');
    });
  };

  return { mergeAssets, action, uploadScript, batch };
}

type DramaToolActions = ReturnType<typeof createDramaToolActions>;
function createDramaToolControls(conversation: AgentConversation, local: DramaToolState,
  { isDramaSelected }: DramaToolScope, { uploadScript }: DramaToolActions) {
  function button(label: string, kind: string, handler: () => void, disabled = false) {
    const node = element('button', label);
    node.type = 'button';
    node.disabled = disabled;
    node.dataset.nakoDramaAction = kind;
    node.addEventListener('click', handler);
    return node;
  }
  function check(
    label: string,
    key: string,
    value: boolean,
    change: (value: boolean) => void,
    disabled = false,
  ) {
    const wrapper = element('label');
    wrapper.className = 'nako-drama-inline-check';
    const control = element('input');
    control.type = 'checkbox';
    control.checked = value;
    control.disabled = disabled;
    control.setAttribute('aria-label', key);
    control.dataset.nakoDramaControl = key;
    control.addEventListener('change', () => {
      change(control.checked);
      local.render();
    });
    wrapper.append(control, element('span', label));
    return wrapper;
  }
  function renderAttachment() {
    if (!local.attachment) return;
    const snapshot = conversation.snapshot();
    local.attachment.hidden =
      !snapshot.projectId ||
      !isDramaSelected() ||
      productionProfileForSkill(snapshot.selectedSkill?.slug)?.mode === 'assets';
    if (local.attachment.hidden) {
      local.attachment.replaceChildren();
      return;
    }
    const focused = local.attachment.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.nakoDramaAction
      : null;
    local.attachment.replaceChildren();
    const chooser = element('input');
    chooser.type = 'file';
    chooser.accept = '.txt,.md,.docx';
    chooser.hidden = true;
    chooser.dataset.nakoDramaControl = '上传剧本';
    chooser.setAttribute('aria-label', '上传剧本');
    chooser.disabled = local.busy || snapshot.busy || snapshot.restoring;
    chooser.addEventListener('change', () => {
      const file = chooser.files?.[0];
      if (file) void uploadScript(file);
    });
    const upload = button(
      '添加剧本',
      'upload-script',
      () => chooser.click(),
      local.busy || snapshot.busy || snapshot.restoring,
    );
    upload.title = '添加 TXT、Markdown 或 DOCX；只在本机解析，不调用模型';
    local.attachment.append(upload, chooser);
    const script = snapshot.state?.session.workflow?.script;
    if (script) {
      const name = element('span', script.name);
      name.className = 'nako-drama-attachment-name';
      name.title = `${script.name} · ${script.text.length} 字符`;
      local.attachment.append(name);
    }
    if (!snapshot.state?.plan && (local.note || snapshot.error)) {
      const output = element('p', local.note || snapshot.error || '');
      output.setAttribute('role', local.noteError || snapshot.error ? 'alert' : 'status');
      local.attachment.append(output);
    }
    if (focused === 'upload-script') upload.focus({ preventScroll: true });
  }
  return { button, check, renderAttachment };
}

type DramaToolControls = ReturnType<typeof createDramaToolControls>;
type DramaRenderServices = {
  canvas: DramaCanvasBridge; local: DramaToolState; services: DramaToolScope;
  actions: DramaToolActions; controls: DramaToolControls;
};
function createDramaToolRenderer(canvas: DramaCanvasBridge, conversation: AgentConversation,
  local: DramaToolState, services: DramaToolScope, actions: DramaToolActions, controls: DramaToolControls) {
  const { isDramaSelected } = services;
  const { renderAttachment } = controls;
  const rendering = { canvas, local, services, actions, controls };
  function render() {
    renderAttachment();
    if (!local.card) return;
    const snapshot = conversation.snapshot();
    const state = snapshot.state;
    if (!isDramaSelected() || !state?.plan || !snapshot.sessionId || !snapshot.projectId) {
      local.card.replaceChildren();
      local.card.hidden = true;
      local.renderedPlanKey = '';
      return;
    }
    const nextRenderedPlanKey = `${snapshot.sessionId}:${state.plan.id}:${state.plan.revision}`;
    const newSummary = local.renderedPlanKey !== nextRenderedPlanKey || !local.card.childElementCount;
    const focused = local.card.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    if (focused)
      local.pendingFocus = {
        control: focused.dataset.nakoDramaControl,
        action: focused.dataset.nakoDramaAction,
        details: focused.dataset.nakoDramaDetailsSummary,
      };
    else if (document.activeElement && document.activeElement !== document.body)
      local.pendingFocus = null;
    const focusKey = local.pendingFocus?.control;
    const focusAction = local.pendingFocus?.action;
    const focusDetails = local.pendingFocus?.details;
    const expanded = new Map(
      Array.from(
        local.card.querySelectorAll<HTMLDetailsElement>('details[data-nako-drama-details]'),
      ).map((details) => [details.dataset.nakoDramaDetails, details.open]),
    );
    const scrollParent =
      local.card.closest<HTMLElement>('[data-nako-agent-scroll]') || local.card.parentElement;
    const scrollTop = scrollParent?.scrollTop;
    // Follow a newly appended compact summary only if the user was already at the
    // end of the conversation. Status updates and reading history/details stay put.
    const followSummary =
      newSummary &&
      !expanded.get('plan') &&
      Boolean(scrollParent) &&
      scrollParent!.scrollHeight - scrollParent!.clientHeight - (scrollTop || 0) <= 48;
    local.card.hidden = false;
    local.card.replaceChildren();
    const disabled = local.busy || snapshot.busy;
    const plan = state.plan;
    if (plan) renderDramaPlan(state, plan, disabled, expanded, rendering, snapshot.selectedSkill?.name || '');
    const message = local.note || snapshot.error;
    if (message) {
      const output = element('p', message);
      output.className = 'nako-drama-inline-status';
      output.setAttribute('role', local.noteError || snapshot.error ? 'alert' : 'status');
      local.card.append(output);
    }
    const focus = Array.from(local.card.querySelectorAll<HTMLElement>(
      '[data-nako-drama-control],[data-nako-drama-action],[data-nako-drama-details-summary]',
    )).find((node) => (focusKey && node.dataset.nakoDramaControl === focusKey)
      || (focusAction && node.dataset.nakoDramaAction === focusAction)
      || (focusDetails && node.dataset.nakoDramaDetailsSummary === focusDetails));
    focus?.focus({ preventScroll: true });
    if (document.activeElement === focus) local.pendingFocus = null;
    if (scrollParent && scrollTop !== undefined) {
      scrollParent.scrollTop = followSummary
        ? Math.max(0, scrollParent.scrollHeight - scrollParent.clientHeight) : scrollTop;
    }
    local.renderedPlanKey = nextRenderedPlanKey;
  }
  return render;
}

function renderDramaPlan(state: DramaConversationState, plan: DramaPlan, disabled: boolean,
  expanded: Map<string | undefined, boolean>, rendering: DramaRenderServices, skillName: string) {
  const { local, controls: { check } } = rendering;
  const card = local.card!;
  const profile = productionProfileForBundle(plan.bundleId);
  const assetOnly = profile?.mode === 'assets';
  const latest = latestAssets(state);
      const title = element('strong', plan.title);
      card.append(title);
      const completed = plan.assets.filter(
        (asset) => latest.get(asset.id)?.status === 'success',
      ).length;
      const progress = element(
        'p',
        `${plan.assets.filter((asset) => asset.kind === 'character').length} 人物 · ${plan.assets.filter((asset) => asset.kind === 'scene').length} 场景 · ${assetOnly ? '武戏资产准备' : `${plan.segments.length} 段文戏`} · 资产已落盘 ${completed}/${plan.assets.length}`,
      );
      progress.dataset.nakoDramaProgress = 'true';
      card.append(progress);
      const details = element('details');
      details.hidden = !UI_FEATURES.runningHub;
      details.dataset.nakoDramaDetails = 'plan';
      details.open = expanded.get('plan') ?? false;
      const summary = element('summary', '查看计划与执行选项');
      summary.dataset.nakoDramaDetailsSummary = 'plan';
      details.append(summary);
      details.append(
        element(
          'p',
          '在下方继续对话即可修改计划。生成开始后的改稿会保留原计划与素材，不覆盖原图。',
        ),
      );
      for (const asset of plan.assets) {
        const receipt = latest.get(asset.id);
        const eligible =
          asset.kind === 'character' &&
          (!receipt || (receipt.status === 'failed' && receipt.retryable === true));
        const row = element('div');
        row.dataset.nakoDramaAsset = asset.id;
        row.className = 'nako-drama-inline-asset';
        row.append(
          check(
            `${asset.name} · ${asset.kind === 'character' ? '人物 RH' : '场景预设线路已移除'}${receipt ? ` · ${LABELS[receipt.status] || receipt.status}` : ''}`,
            `选择资产 ${asset.name}`,
            local.selected.has(asset.id),
            (value) => {
              if (value && local.selected.size < MAX_BATCH) local.selected.add(asset.id);
              else local.selected.delete(asset.id);
              local.paidConsent = false;
            },
            disabled || !eligible,
          ),
        );
        if (receipt?.error) row.append(element('p', receipt.error));
        if (receipt?.status === 'unknown')
          row.append(element('p', '提交是否成功尚未确定，只能查询原任务，不能重新生成。'));
        details.append(row);
      }
      const segments = element('details');
      segments.dataset.nakoDramaDetails = 'segments';
      segments.open = expanded.get('segments') ?? false;
      const segmentSummary = element('summary', '查看分段与连续性');
      segmentSummary.dataset.nakoDramaDetailsSummary = 'segments';
      segments.append(segmentSummary);
      for (const segment of plan.segments)
        segments.append(
          element(
            'p',
            `${segment.title} · ${segment.duration} 秒 · ${segment.characterIds.map((id) => plan.assets.find((asset) => asset.id === id)?.name || id).join('、')}\n${segment.blocking}\n结束状态：${segment.endState}`,
          ),
        );
      if (!assetOnly) details.append(segments);
      if (profile)
        details.append(
          element(
            'p',
            `当前组合：${skillName}。视频应用 ${profile.webAppId}；创建节点不会运行视频。`,
          ),
        );
      const questions = [...plan.questions, ...plan.assets.flatMap((asset) => asset.questions)];
      if (questions.length)
        card.append(
          element('p', `待确认：${questions.join('；')}。请通过对话补充，再确认资产清单。`),
        );
  renderDramaPaidControls(plan, latest, disabled, questions, details, rendering);
  card.append(details);
  renderDramaCompositionControls(plan, latest, disabled, assetOnly, details, rendering);
}

function renderDramaPaidControls(plan: DramaPlan, latest: Map<string, DramaAssetExecution>,
  disabled: boolean, questions: string[], details: HTMLDetailsElement,
  { local, actions: { action, batch }, services: { status }, controls: { button, check } }: DramaRenderServices) {
      const approved = plan.approvedRevision === plan.revision;
      details.append(
        button(
          approved ? '资产清单已确认' : '确认资产清单（不生成）',
          'approve',
          () =>
            void action(async (tools) => {
              await tools.action({
                action: 'approve',
                planId: plan.id,
                planRevision: plan.revision,
              });
              if (!tools.current()) return;
              status('资产清单已确认。请选择本批图片，明确同意调用后才会生成。');
            }),
          disabled || approved || questions.length > 0,
        ),
      );
      const eligibleIds = plan.assets
        .filter((asset) => asset.kind === 'character' && !latest.has(asset.id))
        .map((asset) => asset.id)
        .slice(0, MAX_BATCH);
      details.append(
        button(
          '选择未生成资产',
          'select',
          () => {
            local.selected.clear();
            eligibleIds.forEach((id) => local.selected.add(id));
            local.paidConsent = false;
            local.render();
          },
          disabled || !eligibleIds.length,
        ),
      );
      const targets = plan.assets.filter(
        (asset) => asset.kind === 'character' && local.selected.has(asset.id),
      );
      const targetLabel = targets.map((asset) => asset.name).join('、') || '尚未选择';
      details.append(
        element(
          'p',
          `本批：${targetLabel}。人物使用 RunningHub 工作流，相应提示词将发送到该服务。原场景预设线路已移除，请在画布选择第三方模型生成场景并手动连线。每项最多提交 1 次，每批最多 ${MAX_BATCH} 项。失败或结果未知即停止后续。`,
        ),
      );
      details.append(
        check(
          `确认本批 ${targets.length} 项图片可能产生费用；不生成视频。失败项再次选择表示确认一次新的尝试。`,
          '确认本批资产调用（不会生成视频）',
          local.paidConsent,
          (value) => {
            local.paidConsent = value;
          },
          disabled || !approved || !targets.length,
        ),
      );
      details.append(
        button(
          local.running ? '正在生成资产…' : `生成所选资产（${targets.length} 项）`,
          'generate',
          () =>
            batch(
              plan,
              targets.map((asset) => asset.id),
            ),
          disabled || !approved || !local.paidConsent || !targets.length,
        ),
      );
}

function renderDramaCompositionControls(plan: DramaPlan, latest: Map<string, DramaAssetExecution>,
  disabled: boolean, assetOnly: boolean, details: HTMLDetailsElement,
  { canvas, local, actions: { action, mergeAssets }, services: { stop, status }, controls: { button, check } }: DramaRenderServices) {
  const card = local.card!;
      const operations = element('div');
      operations.className = 'nako-drama-inline-operations';
      operations.hidden = !UI_FEATURES.runningHub && !local.running;
      const stopButton = button('停止后续', 'stop', () => stop(), !local.running);
      stopButton.hidden = !local.running;
      operations.append(stopButton);
      if (local.running)
        operations.append(
          element('p', '本批运行时暂锁定发送；停止后续并等当前请求返回，即可继续自由对话。'),
        );
      const query = button(
        '查询原任务',
        'query',
        () =>
          void action(async (tools) => {
            const result = await tools.action({
              action: 'query',
              planId: plan.id,
              planRevision: plan.revision,
            });
            await mergeAssets(result);
            if (tools.current()) status('已查询原任务并同步真实结果；没有重新提交生成。');
          }),
        disabled,
      );
      query.hidden = !latest.size;
      operations.append(query);
      card.append(operations);
      const allReady =
        plan.assets.length > 0 &&
        plan.assets.every((asset) => latest.get(asset.id)?.status === 'success');
      details.append(
        check(
          `我已检查当前人物和场景图像，确认将它们连接到${assetOnly ? '武戏' : '文戏'}草稿；不运行视频。`,
          '确认当前资产图像',
          local.compositionConsent,
          (value) => {
            local.compositionConsent = value;
          },
          disabled || !allReady,
        ),
      );
      details.append(
        button(
          `确认资产并创建${assetOnly ? '武戏' : '文戏'}节点`,
          'compose',
          () =>
            void action(async (tools) => {
              if (!local.compositionConsent || !browserServices.__NAKO_WORKFLOW_NODES__)
                throw new AgentOperationError('请确认资产并等待工作流模块就绪。', { operation: 'compose-drama-canvas', planId: plan.id });
              local.compositionConsent = false;
              const result = await tools.action({
                action: 'compose',
                planId: plan.id,
                planRevision: plan.revision,
                confirmAssets: true,
              });
              if (!tools.current() || !result.composition)
                throw new AgentOperationError('没有取得真实组装回执，未写入文戏节点。', { operation: 'compose-drama-canvas', planId: plan.id });
              const nodes = buildDramaCanvasNodes(
                result.composition,
                browserServices.__NAKO_WORKFLOW_NODES__,
              );
              await canvas.commit(
                plan.projectId,
                (previous) =>
                  tools.current()
                    ? mergeDramaCanvasNodes(previous, nodes, {
                        projectId: plan.projectId,
                        expectedProjectId: canvas.projectId() || '',
                      })
                    : [...previous],
                { select: false },
              );
              if (tools.current())
                status(
                  `${assetOnly ? '武戏' : '文戏'}草稿及资产连线已加入当前画布，重复创建不会覆盖已有节点。视频尚未运行，请检查对应节点的提示词，再单独确认运行。`,
                );
            }),
          disabled || !allReady || !local.compositionConsent,
        ),
      );
}

function mountDramaTools(canvas: DramaCanvasBridge, conversation: AgentConversation,
  local: DramaToolState, { stop, isDramaSelected, scope, status }: DramaToolScope,
  { mergeAssets }: DramaToolActions) {

  const update = () => {
    const snapshot = conversation.snapshot();
    const key = `${snapshot.sessionId || ''}:${snapshot.projectId || ''}:${snapshot.selectedSkill?.source || ''}:${snapshot.selectedSkill?.slug || ''}`;
    if (key !== local.context) {
      local.context = key;
      local.contextEpoch += 1;
      stop(false);
      local.note = '';
      local.noteError = false;
      local.selected.clear();
      local.compositionConsent = false;
      local.canvasSignature = '';
      local.pendingFocus = null;
    }
    const nextPlan = snapshot.state?.plan
      ? `${snapshot.state.plan.id}:${snapshot.state.plan.revision}`
      : '';
    if (nextPlan !== local.planKey) {
      local.planKey = nextPlan;
      local.selected.clear();
      local.paidConsent = false;
      local.compositionConsent = false;
      // Attachment-only feedback must not keep saying "未调用模型" after a plan reply.
      local.note = '';
      local.noteError = false;
    }
    local.render();
    if (isDramaSelected() && snapshot.state && snapshot.sessionId && snapshot.projectId) {
      const active = scope(snapshot.sessionId, snapshot.projectId);
      void mergeAssets(snapshot.state).catch((cause) => {
        if (active())
          status(cause instanceof Error ? cause.message : '资产暂未写入画布，请查询原任务。', true);
      });
    }
  };
  const mount = () => {
    const content = document.querySelector('[data-nako-agent-conversation-content]');
    if (!content) {
      if (local.card || local.attachment) {
        local.contextEpoch += 1;
        stop(false);
        local.card?.remove();
        local.attachment?.remove();
        local.card = null;
        local.attachment = null;
      }
      return;
    }
    let changed = false;
    if (local.card?.parentElement !== content) {
      if (local.card) {
        local.contextEpoch += 1;
        stop(false);
        local.card.remove();
      }
      local.card = element('section');
      local.card.dataset.nakoDramaConversationTools = 'true';
      local.card.className = 'nako-drama-inline';
      local.card.setAttribute('aria-label', '当前任务');
      content.append(local.card);
      changed = true;
    }
    const composer = document.querySelector('[data-nako-agent-composer]');
    const contextSlot = document.querySelector('[data-nako-agent-context-slot]');
    const attachmentParent = contextSlot || composer?.parentElement;
    if (attachmentParent && local.attachment?.parentElement !== attachmentParent) {
      local.attachment?.remove();
      local.attachment = element('div');
      local.attachment.dataset.nakoDramaAttachment = 'true';
      local.attachment.className = 'nako-drama-attachment';
      if (contextSlot) contextSlot.append(local.attachment);
      else composer?.before(local.attachment);
      changed = true;
    }
    if (!composer && local.attachment) {
      local.attachment.remove();
      local.attachment = null;
      changed = true;
    }
    if (changed) update();
  };
  const unsubscribe = conversation.subscribe(update);
  const uncanvas = canvas.subscribe(update);
  const unobserve = observeStableEnhancement(mount);
  const hidden = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', hidden);
  const style = element('style');
  style.textContent = `.nako-drama-inline{margin:12px 0;padding:8px 0;border-top:1px solid var(--nk-border);color:var(--nk-text);font:12px/1.6 Inter,"Microsoft YaHei UI",sans-serif;overflow-wrap:anywhere}.nako-drama-inline[hidden],.nako-drama-attachment[hidden]{display:none}.nako-drama-inline p{margin:6px 0;color:var(--nk-text-secondary);white-space:pre-wrap}.nako-drama-inline strong{display:block;font-size:13px}.nako-drama-inline details{margin-top:8px}.nako-drama-inline summary{cursor:pointer;font-weight:600}.nako-drama-inline button,.nako-drama-attachment button{margin:6px 6px 0 0;padding:6px 8px;border:1px solid var(--nk-border-control);border-radius:6px;background:var(--nk-surface-raised);color:var(--nk-text);cursor:pointer;font:inherit}.nako-drama-inline button:disabled,.nako-drama-inline input:disabled,.nako-drama-attachment button:disabled{opacity:.45;cursor:not-allowed}.nako-drama-inline :is(button,input,summary):focus-visible,.nako-drama-attachment button:focus-visible{outline:2px solid var(--nk-info);outline-offset:2px}.nako-drama-inline-check{display:flex;align-items:flex-start;gap:7px;margin:8px 0}.nako-drama-inline-check input{margin-top:4px;accent-color:var(--nk-border-control);flex:none}.nako-drama-inline-asset{border-top:1px solid var(--nk-border);padding-top:2px}.nako-drama-inline .nako-drama-inline-status{color:var(--nk-text)}.nako-drama-inline [role=alert],.nako-drama-attachment [role=alert]{color:var(--nk-danger)}.nako-drama-attachment{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0;margin:0 0 6px;color:var(--nk-text-secondary);font:12px/1.5 Inter,"Microsoft YaHei UI",sans-serif}.nako-drama-attachment button{flex:none;margin:0;padding:4px 7px;background:transparent}.nako-drama-attachment-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;max-width:calc(100% - 90px)}.nako-drama-attachment p{flex-basis:100%;margin:0;overflow-wrap:anywhere}.nako-drama-inline-operations:empty{display:none}`;
  document.head.append(style);
  return () => {
    local.disposed = true;
    stop(false);
    unsubscribe();
    uncanvas();
    unobserve();
    local.card?.remove();
    local.attachment?.remove();
    style.remove();
    document.removeEventListener('visibilitychange', hidden);
  };
}

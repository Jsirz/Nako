import { SKILL_CATALOG_CHANGED, SKILL_SELECT_EVENT } from '../../../contracts/skillCatalog.js';
import type { AgentSkillSelectionRequest } from '../../../contracts/skillCatalog.js';
import { browserHost, browserServices } from '../../../kernel/browser';
import { observeStableEnhancement } from '../../../kernel/ui/enhancementLifecycle';
import {
  createAgentSkillClient,
  type AgentSkill,
  type AgentSkillClient,
} from '../skills/skillClient';
import {
  createAgentConversation,
  type AgentConversation,
} from './agentConversation';
import type { DramaCanvasBridge } from './dramaCanvasBridge';
import { createAgentSkillPicker } from './AgentSkillPicker';

export const SELECT_AGENT_SKILL_EVENT = 'nako:select-agent-skill';
const ATTRIBUTE = 'data-nako-agent-skills';

/** Selection only saves the current conversation's skill; it never submits a chat or generation. */
export function installDramaConversationShortcut(
  canvas: DramaCanvasBridge,
  conversation: AgentConversation = createAgentConversation(() => canvas.projectId()),
  skills: AgentSkillClient = browserServices.__NAKO_SKILLS__ || createAgentSkillClient(),
) {
  browserServices.__NAKO_AGENT_CONVERSATION__ = conversation;
  window.dispatchEvent(new Event('nako:agent-conversation-ready'));
  const local = createSkillShortcutState();
  const actions = createSkillShortcutActions(canvas, conversation, skills, local);
  const mount = createSkillShortcutMount(conversation, local, actions);
  const unbindSelection = browserHost.events.on(SKILL_SELECT_EVENT, (value) => {
    const request = value as AgentSkillSelectionRequest;
    if (typeof request?.slug === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(request.slug) &&
      typeof request.projectId === 'string' && request.projectId === canvas.projectId()) void actions.select(request.slug);
  });
  const unbind = bindSkillShortcut(conversation, local, actions, mount);
  return () => { unbindSelection(); unbind(); };
}

function createSkillShortcutState() {
  return {
    disposed: false, selecting: false, root: null as HTMLElement | null, expanded: false,
    catalog: null as AgentSkill[] | null, loading: false, error: '', filter: '', category: '',
    context: '', feedback: '', feedbackTimer: undefined as number | undefined,
    selectionChip: null as HTMLElement | null, refresh: () => {}, collapse: () => {}, syncPlacement: () => {},
    closeSkillOverlays: () => {}, disposeSkillPicker: () => {},
    catalogRevision: 0, missingSelection: '',
  };
}
type SkillShortcutState = ReturnType<typeof createSkillShortcutState>;
function createSkillShortcutActions(canvas: DramaCanvasBridge, conversation: AgentConversation,
  skills: AgentSkillClient, local: SkillShortcutState) {
  const skillName = (slug: string) =>
    local.catalog?.find((skill) => skill.slug === slug)?.name ||
    (conversation.snapshot().selectedSkill?.slug === slug ? conversation.snapshot().selectedSkill?.name : '') ||
    slug;
  const clearFeedback = () => {
    window.clearTimeout(local.feedbackTimer);
    local.feedback = '';
  };

  const select = async (slug: string | null, focusComposer = true) => {
    if (local.disposed || local.selecting) return;
    local.selecting = true;
    clearFeedback();
    local.error = '';
    local.refresh();
    const project = canvas.projectId();
    const session = conversation.snapshot().sessionId;
    const current = () =>
      !local.disposed &&
      project === canvas.projectId() &&
      (!session || session === conversation.snapshot().sessionId);
    try {
      const openingAgent = !document.querySelector('[data-nako-agent-panel]');
      if (openingAgent) {
        document.querySelector<HTMLButtonElement>('[data-nako-agent-launcher]')?.click();
      }
      for (let i = 0; i < 30 && !document.querySelector('[data-nako-agent-composer]'); i += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 40));
        if (!current()) return;
      }
      // Opening the native panel binds its conversation in a React effect. Let that
      // binding settle, then wait only for its read-only history restoration.
      if (openingAgent) await new Promise((resolve) => window.setTimeout(resolve, 16));
      for (let i = 0; i < 250 && (!conversation.snapshot().ready || conversation.snapshot().restoring); i += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 40));
        if (!current()) return;
      }
      if (!current()) return;
      const selected = await conversation.selectSkill(slug);
      if (!current()) return;
      if (!selected) {
        local.error = '请等待当前回复或操作完成，再切换技能。';
        local.refresh();
        return;
      }
      local.error = '';
      local.feedback = slug ? `已使用「${skillName(slug)}」` : '已取消技能';
      if (local.selectionChip) {
        local.selectionChip.dataset.feedback = 'true';
      }
      local.feedbackTimer = window.setTimeout(() => {
        local.feedback = '';
        if (local.selectionChip) delete local.selectionChip.dataset.feedback;
        local.refresh();
      }, 2600);
      local.collapse();
      if (!focusComposer || document.querySelector('[aria-modal="true"]')) return;
      // The native React commit may still be enabling the textarea.
      for (
        let i = 0;
        i < 30 &&
        document.querySelector<HTMLTextAreaElement>('[data-nako-agent-composer]')?.disabled;
        i += 1
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, 16));
        if (!current()) return;
      }
      document.querySelector<HTMLTextAreaElement>('[data-nako-agent-composer]')?.focus();
    } catch (cause) {
      if (current()) {
        local.error = cause instanceof Error ? cause.message : '暂时无法切换技能。';
        local.refresh();
      }
    } finally {
      local.selecting = false;
      if (!local.disposed) local.refresh();
    }
  };

  const readCatalog = async () => {
    const revision = local.catalogRevision;
    if (local.loading || local.disposed) return;
    local.loading = true;
    local.error = '';
    local.refresh();
    try {
      const result = await skills.list();
      if (!local.disposed && revision === local.catalogRevision) local.catalog = result;
    } catch (cause) {
      if (!local.disposed) local.error = cause instanceof Error ? cause.message : '读取技能库失败，请重试。';
    } finally {
      local.loading = false;
      if (!local.disposed) {
        local.refresh();
        if (revision !== local.catalogRevision) void readCatalog();
      }
    }
  };

  return { select, readCatalog, skillName, clearFeedback };
}

type SkillShortcutActions = ReturnType<typeof createSkillShortcutActions>;
function createSkillShortcutMount(conversation: AgentConversation, local: SkillShortcutState,
  actions: SkillShortcutActions) {
  const { select, readCatalog } = actions;
  const mount = () => {
    if (local.disposed) return;
    if (local.root?.isConnected) {
      local.syncPlacement();
      return;
    }
    local.disposeSkillPicker();
    const composer = document.querySelector<HTMLTextAreaElement>('[data-nako-agent-composer]');
    const agentPanel = composer?.closest('[data-nako-agent-panel]');
    if (!composer || !agentPanel) return;
    // Keep the original attachment / textarea / model-control box untouched.
    const anchor =
      composer.parentElement && composer.parentElement !== agentPanel
        ? composer.parentElement
        : composer;
    local.selectionChip?.remove();
    local.selectionChip = document.createElement('div');
    local.selectionChip.className = 'nako-agent-skill-context';
    local.selectionChip.dataset.nakoAgentSelectedSkill = 'true';
    const chip = document.createElement('div');
    chip.className = 'nako-agent-skill-chip';
    const chipLabel = document.createElement('span');
    chipLabel.className = 'nako-agent-skill-name';
    const chipIcon = document.createElement('span');
    chipIcon.className = 'nako-agent-skill-symbol';
    chipIcon.setAttribute('aria-hidden', 'true');
    chipIcon.textContent = '✦';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'nako-agent-skill-cancel';
    cancel.textContent = '×';
    cancel.title = '取消使用此技能';
    cancel.addEventListener('click', () => {
      void select(null);
    });
    chip.append(chipIcon, chipLabel, cancel);
    local.selectionChip.append(chip);
    const contextSlot = agentPanel.querySelector('[data-nako-agent-context-slot]');
    if (contextSlot) contextSlot.append(local.selectionChip);
    else composer.before(local.selectionChip);
    local.root = document.createElement('section');
    local.root.setAttribute(ATTRIBUTE, 'true');
    local.root.dataset.nakoSkillCatalog = 'true';
    local.root.className = 'nako-agent-skills';
    local.expanded = false;
    local.filter = '';
    const heading = document.createElement('h2');
    heading.className = 'nako-agent-skills-heading';
    heading.textContent = '技能库';
    const categories = document.createElement('select');
    categories.className = 'nako-agent-skills-categories';
    categories.setAttribute('aria-label', '技能分类');
    categories.addEventListener('change', () => { local.category = categories.value; local.refresh(); });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nako-agent-skills-toggle';
    toggle.setAttribute('aria-controls', 'nako-agent-skills-options');
    toggle.setAttribute('aria-label', '技能库');
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.className = 'nako-agent-skills-chevron';
    arrow.textContent = '›';
    const hint = document.createElement('span');
    hint.className = 'nako-agent-skills-hint';
    hint.setAttribute('aria-hidden', 'true');
    toggle.append(hint, arrow);
    const options = document.createElement('div');
    options.id = 'nako-agent-skills-options';
    options.className = 'nako-agent-skills-options';
    options.setAttribute('role', 'region');
    options.setAttribute('aria-label', '选择技能');
    const optionsInner = document.createElement('div');
    optionsInner.className = 'nako-agent-skills-inner';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜索技能';
    search.setAttribute('aria-label', '搜索技能');
    const list = document.createElement('div');
    list.className = 'nako-agent-skills-list';
    const note = document.createElement('p');
    note.setAttribute('role', 'status');
    note.className = 'nako-agent-skills-note';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新读取';
    retry.className = 'nako-agent-skills-retry';
    retry.addEventListener('click', () => {
      void readCatalog();
    });
    const filters = document.createElement('div');
    filters.className = 'nako-agent-skills-filters';
    filters.append(categories, search);
    const more = document.createElement('button');
    more.type = 'button'; more.className = 'nako-agent-skills-more';
    more.textContent = '查看更多 →';
    more.addEventListener('click', () => {
      local.collapse();
      window.dispatchEvent(new Event('nako:open-skill-community'));
    });
    optionsInner.append(filters, list, more);
    options.append(optionsInner);
    local.root.append(heading, toggle, options, note, retry);
    const skillsSlot =
      agentPanel.querySelector('[data-nako-agent-welcome-skills-slot]') ||
      agentPanel.querySelector('[data-nako-agent-skills-slot]');
    if (skillsSlot) skillsSlot.append(local.root);
    else anchor.before(local.root);
    bindSkillShortcutControls(agentPanel, { heading, toggle, options, hint, chipLabel, chip,
      chipIcon, cancel, note, retry, search, categories, list }, conversation, local, actions);
  };
  return mount;
}

type SkillShortcutControls = {
  heading: HTMLHeadingElement; toggle: HTMLButtonElement; options: HTMLDivElement; hint: HTMLSpanElement;
  chipLabel: HTMLSpanElement; chip: HTMLDivElement; chipIcon: HTMLSpanElement; cancel: HTMLButtonElement;
  note: HTMLParagraphElement; retry: HTMLButtonElement; search: HTMLInputElement;
  categories: HTMLSelectElement; list: HTMLDivElement;
};
function bindSkillShortcutControls(agentPanel: Element, controls: SkillShortcutControls,
  conversation: AgentConversation, local: SkillShortcutState,
  { select, readCatalog, skillName }: SkillShortcutActions) {
  const { heading, toggle, options, hint, chipLabel, chip, chipIcon, cancel, note, retry, search, categories, list } = controls;
    const picker = createAgentSkillPicker((slug) => void select(slug), () => local.collapse());
    local.closeSkillOverlays = picker.close;
    local.disposeSkillPicker = picker.dispose;
    let listSignature = '';
    local.collapse = () => {
      local.expanded = false;
      picker.hidePreview();
      local.refresh();
    };
    local.refresh = () => {
      if (!local.root?.isConnected || local.disposed) return;
      const snapshot = conversation.snapshot();
      const welcome =
        local.root.parentElement?.hasAttribute('data-nako-agent-welcome-skills-slot') ?? false;
      const showOptions = welcome || local.expanded;
      local.root.dataset.presentation = welcome ? 'welcome' : 'compact';
      heading.hidden = !welcome;
      toggle.hidden = welcome;
      toggle.setAttribute('aria-expanded', String(showOptions));
      local.root.dataset.expanded = String(showOptions);
      options.setAttribute('aria-hidden', String(!showOptions));
      options.inert = !showOptions;
      hint.textContent = local.expanded ? '收起' : '选择技能';
      const active = snapshot.selectedSkill;
      const missing = active && local.catalog && !local.catalog.some(skill => skill.slug === active.slug);
      if (!missing) local.missingSelection = '';
      const selectionKey = `${snapshot.sessionId}:${active?.slug}`;
      if (missing && local.missingSelection !== selectionKey && !snapshot.busy && !snapshot.restoring && !local.selecting) {
        local.missingSelection = selectionKey;
        void select(null, false);
      }
      const name = active ? skillName(active.slug) : '';
      if (local.selectionChip) local.selectionChip.hidden = !active && !snapshot.restoring;
      chipLabel.textContent = snapshot.restoring ? '正在恢复技能…' : name;
      chipLabel.title = name;
      chip.dataset.active = String(Boolean(active) && !snapshot.restoring);
      chipIcon.hidden = !active || snapshot.restoring;
      cancel.hidden = !active || snapshot.restoring;
      cancel.disabled = local.selecting || snapshot.busy;
      cancel.setAttribute('aria-label', `取消使用${name}`);
      chip.setAttribute('aria-busy', String(local.selecting || snapshot.restoring));
      note.textContent =
        local.error ||
        (local.selecting ? '正在切换技能…' : local.feedback) ||
        (showOptions && local.loading
          ? '正在读取技能库…'
          : showOptions && snapshot.restoring
            ? '正在读取当前选择…'
            : '');
      note.hidden = !note.textContent;
      note.dataset.nakoState = local.error ? 'error' : local.feedback ? 'success' : 'loading';
      retry.hidden = !local.error || local.selecting;
      retry.disabled = local.loading;
      const skillCatalog = local.catalog || [];
      search.hidden = skillCatalog.length <= 4;
      const names = [...new Set(skillCatalog.map(skill => skill.category || '其他'))];
      const categorySignature = JSON.stringify(names);
      if (categories.dataset.signature !== categorySignature) {
        categories.dataset.signature = categorySignature;
        categories.replaceChildren(new Option('全部分类', ''), ...names.map(name => new Option(name, name)));
        if (!names.includes(local.category)) local.category = '';
      }
      categories.value = local.category;
      const signature = JSON.stringify([
        showOptions,
        skillCatalog,
        local.category,
        local.filter,
        local.loading,
        snapshot.restoring,
        active,
        snapshot.busy,
        local.selecting,
      ]);
      if (signature === listSignature || !showOptions) return;
      listSignature = signature;
      const focusedSlug =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.dataset.nakoSkill
          : null;
      picker.hidePreview();
      list.replaceChildren();
      const matching = skillCatalog
        .filter((skill) => !local.category || (skill.category || '其他') === local.category)
        .filter((skill) =>
          `${skill.name} ${skill.description} ${skill.slug}`.toLowerCase().includes(local.filter),
        );
      if (!local.loading && local.catalog && !matching.length) {
        const empty = document.createElement('p');
        empty.className = 'nako-agent-skills-note';
        empty.textContent = local.filter ? '没有匹配的技能。' : '此分类暂无技能，可通过“查看更多”导入。';
        list.append(empty);
      }
      for (const skill of matching) {
        const selected =
          !snapshot.restoring &&
          snapshot.selectedSkill?.slug === skill.slug;
        const row = picker.createRow(skill, selected, local.selecting || snapshot.busy || snapshot.restoring);
        list.append(row);
        if (focusedSlug === skill.slug) row.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      }
    };
    toggle.addEventListener('click', () => {
      local.expanded = !local.expanded;
      picker.hidePreview();
      local.refresh();
      if (local.expanded && !local.catalog) void readCatalog();
    });
    search.addEventListener('input', () => {
      local.filter = search.value.trim().toLowerCase();
      local.refresh();
    });
    local.root!.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !local.expanded) return;
      event.preventDefault();
      event.stopPropagation();
      local.collapse();
      toggle.focus();
    });
    local.syncPlacement = () => {
      if (!local.root?.isConnected) return;
      const target =
        agentPanel.querySelector('[data-nako-agent-welcome-skills-slot]') ||
        agentPanel.querySelector('[data-nako-agent-skills-slot]');
      if (target && local.root.parentElement !== target) {
        target.append(local.root);
        local.expanded = false;
        local.filter = '';
        search.value = '';
        listSignature = '';
        local.refresh();
      }
      if (
        target?.hasAttribute('data-nako-agent-welcome-skills-slot') &&
        !local.catalog &&
        !local.loading &&
        !local.error
      )
        void readCatalog();
    };
    local.refresh();
    local.syncPlacement();
}
function bindSkillShortcut(conversation: AgentConversation, local: SkillShortcutState,
  { clearFeedback, readCatalog, select }: SkillShortcutActions, mount: () => void) {
  const unobserve = observeStableEnhancement(mount);
  const unsubscribe = conversation.subscribe(() => {
    const snapshot = conversation.snapshot();
    const next = `${snapshot.projectId || ''}:${snapshot.sessionId || ''}`;
    if (next !== local.context) {
      local.closeSkillOverlays();
      local.context = next;
      local.expanded = false;
      local.error = '';
      local.filter = '';
      clearFeedback();
      if (local.selectionChip) delete local.selectionChip.dataset.feedback;
      const search = local.root?.querySelector<HTMLInputElement>('input[type=search]');
      if (search) search.value = '';
    }
    local.refresh();
    if (snapshot.selectedSkill?.source === 'local' && !local.catalog && !local.loading && !local.error)
      void readCatalog();
  });
  const onSelect = (event: Event) => {
    const slug = (event as CustomEvent<{ slug?: unknown }>).detail?.slug;
    if (typeof slug === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) void select(slug);
  };
  const onOutside = (event: MouseEvent) => {
    if (local.expanded && event.target instanceof Node && !local.root?.contains(event.target)) local.collapse();
  };
  const style = document.createElement('style');
  style.textContent = `
    .nako-agent-skills,.nako-agent-skill-context{color:var(--nk-text);font:12px/1.5 Inter,"Microsoft YaHei UI",system-ui,sans-serif}
    .nako-agent-skills{position:relative;margin-bottom:8px;min-width:0}
    .nako-agent-skills-heading{margin:0 0 12px;font-size:14px;font-weight:700;color:var(--nk-text)}
    .nako-agent-skills [hidden],.nako-agent-skill-context[hidden],.nako-agent-skill-context [hidden]{display:none}
    .nako-agent-skills-toggle{display:flex;align-items:center;gap:8px;width:100%;min-height:38px;padding:6px 4px;border:0;background:transparent;color:var(--nk-text);font-size:14px;font-weight:700;cursor:pointer;transition:color 160ms ease}
    .nako-agent-skills-toggle:hover{color:var(--nk-text)}
    .nako-agent-skills-hint{margin-left:auto;color:var(--nk-text-muted);font-size:11px;font-weight:400}
    .nako-agent-skills-chevron{font-size:20px;line-height:16px;width:16px;text-align:center;transform:rotate(90deg);transition:transform 200ms ease}
    .nako-agent-skills[data-expanded=true] .nako-agent-skills-chevron{transform:rotate(-90deg)}
    .nako-agent-skills-options{display:none;position:absolute;bottom:calc(100% + 8px);left:0;right:0;z-index:70;border:1px solid var(--nk-border);border-radius:14px;background:var(--nk-surface-raised);box-shadow:var(--nk-shadow);overflow:hidden}
    .nako-agent-skills[data-expanded=true] .nako-agent-skills-options{display:block}
    .nako-agent-skills-inner{display:flex;flex-direction:column;max-height:min(440px,calc(100dvh - 240px));min-height:0}
    .nako-agent-skills-filters{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid var(--nk-border);flex-shrink:0}
    .nako-agent-skills input,.nako-agent-skills select{box-sizing:border-box;min-width:0;max-width:100%;height:32px;margin:0;padding:5px 8px;border:1px solid var(--nk-border-control);border-radius:7px;background:var(--nk-input);color:var(--nk-text-secondary);font:inherit}
    .nako-agent-skills-categories{flex:0 1 112px}
    .nako-agent-skills input{flex:1;width:0}
    .nako-agent-skills-list{display:flex;flex-direction:column;gap:2px;min-height:0;max-height:min(320px,38vh);overflow:auto;overscroll-behavior:contain;padding:6px 8px;scrollbar-width:thin;scrollbar-color:var(--nk-border-control) transparent}
    .nako-agent-skills-row{display:flex;align-items:center;gap:8px;min-height:68px;flex-shrink:0;padding:0 10px;border-radius:10px;background:transparent;transition:background 150ms ease}
    .nako-agent-skills-row:is(:hover,:focus-within),.nako-agent-skills-row[data-selected=true]{background:var(--nk-hover)}
    .nako-agent-skills-option{flex:1;min-width:0;padding:10px 0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
    .nako-agent-skills-card-content{display:flex;flex-direction:column;gap:4px;min-width:0}
    .nako-agent-skills-option strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:22px;font-weight:650;color:var(--nk-text)}
    .nako-agent-skills-description{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--nk-text-muted);font-size:12px;line-height:20px}
    .nako-agent-skills-detail{flex-shrink:0;padding:5px 12px;border:0;border-radius:8px;background:var(--nk-surface);color:var(--nk-text);font-size:12px;cursor:pointer;opacity:0;pointer-events:none}
    .nako-agent-skills-row:is(:hover,:focus-within) .nako-agent-skills-detail{opacity:1;pointer-events:auto}
    .nako-agent-skills-more{width:100%;min-height:42px;flex-shrink:0;border:0;border-top:1px solid var(--nk-border);background:transparent;color:var(--nk-text-muted);font-size:12px;cursor:pointer}
    .nako-agent-skills-more:hover{background:var(--nk-hover);color:var(--nk-text)}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-options{position:static}
    .nako-agent-skills button:disabled{opacity:.5;cursor:wait}
    .nako-agent-skill-preview{position:fixed;z-index:90;max-height:calc(100dvh - 24px);overflow:hidden;border:1px solid var(--nk-border);border-radius:16px;background:var(--nk-surface-raised);color:var(--nk-text);box-shadow:var(--nk-shadow);pointer-events:none;font:12px/1.6 Inter,"Microsoft YaHei UI",system-ui,sans-serif}
    .nako-agent-skill-preview img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--nk-input)}
    .nako-agent-skill-preview-text{padding:14px 16px}
    .nako-agent-skill-preview strong{display:block;font-size:15px;line-height:22px;overflow-wrap:anywhere}
    .nako-agent-skill-preview p{display:-webkit-box;margin:6px 0 0;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--nk-text-muted)}
    @media(hover:none){.nako-agent-skills-detail{opacity:1;pointer-events:auto}}
    .nako-agent-skills-note{margin:4px 4px 0;color:var(--nk-text-secondary);font-size:11px}
    .nako-agent-skills-note[data-nako-state=success]{color:var(--nk-text)}
    .nako-agent-skills-note[data-nako-state=error]{color:var(--nk-warning)}
    .nako-agent-skills-retry{border:1px solid var(--nk-border);border-radius:6px;padding:4px 8px;background:var(--nk-surface-raised);color:var(--nk-text)}
    .nako-agent-skill-context{display:inline-flex;align-items:center;vertical-align:middle;min-width:0;max-width:100%;margin:2px 8px 10px 0}
    .nako-agent-skill-context + .nako-drama-attachment:not([hidden]):not(:has(.nako-drama-attachment-name,p)){display:inline-flex;vertical-align:middle;margin-bottom:10px}
    .nako-agent-skill-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;box-sizing:border-box;min-height:30px;padding:2px 3px 2px 10px;border:1px solid var(--nk-border-control);border-radius:8px;background:var(--nk-hover);color:var(--nk-text);transition:background 180ms ease,border-color 180ms ease}
    .nako-agent-skill-chip[data-active=false]{color:var(--nk-text-secondary);background:transparent;border-color:transparent;padding-left:0}
    .nako-agent-skill-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:500}
    .nako-agent-skill-symbol{color:var(--nk-text);font-size:13px}
    .nako-agent-skill-cancel{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:26px;height:26px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--nk-text-secondary);font-size:19px;cursor:pointer;transition:background 150ms ease,color 150ms ease}
    .nako-agent-skill-cancel:hover{background:var(--nk-hover);color:var(--nk-text)}
    .nako-agent-skill-cancel:disabled{opacity:.45;cursor:wait}
    .nako-agent-skill-context[data-feedback=true] .nako-agent-skill-chip{animation:nako-skill-selected 360ms ease-out}
    @keyframes nako-skill-selected{0%{transform:translateY(3px);background:var(--nk-hover)}100%{transform:translateY(0)}}
    .nako-agent-skills button:focus-visible,.nako-agent-skills input:focus-visible,.nako-agent-skill-cancel:focus-visible{outline:2px solid var(--nk-info);outline-offset:2px}
    @media(prefers-reduced-motion:reduce){.nako-agent-skills *,.nako-agent-skill-context *{transition:none!important;animation:none!important}}
  `;
  document.head.append(style);
  const onCatalogChanged = () => { local.catalogRevision++; local.catalog = null; void readCatalog(); };
  window.addEventListener(SKILL_CATALOG_CHANGED, onCatalogChanged);
  window.addEventListener(SELECT_AGENT_SKILL_EVENT, onSelect);
  document.addEventListener('mousedown', onOutside);
  return () => {
    local.disposed = true;
    local.disposeSkillPicker();
    clearFeedback();
    unobserve();
    unsubscribe();
    style.remove();
    local.root?.remove();
    local.selectionChip?.remove();
    window.removeEventListener(SKILL_CATALOG_CHANGED, onCatalogChanged);
    window.removeEventListener(SELECT_AGENT_SKILL_EVENT, onSelect);
    document.removeEventListener('mousedown', onOutside);
    conversation.dispose();
    if (browserServices.__NAKO_AGENT_CONVERSATION__ === conversation)
      delete browserServices.__NAKO_AGENT_CONVERSATION__;
  };
}

import { SKILL_CATALOG_CHANGED } from '../../../contracts/skillCatalog.js';
import { browserServices } from '../../../kernel/browser';
import { observeStableEnhancement } from '../../../canvas-ui/api/ui/lifecycle/enhancementLifecycle';
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
import { productionProfileForSkill } from '../../../contracts/officialProductionProfiles.js';

export const DRAMA_SHORTCUT_LABEL = '剧本文戏';
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
  return bindSkillShortcut(conversation, local, actions, mount);
}

function createSkillShortcutState() {
  return {
    disposed: false, selecting: false, root: null as HTMLElement | null, expanded: false,
    catalog: null as AgentSkill[] | null, loading: false, error: '', filter: '', category: '',
    context: '', feedback: '', feedbackTimer: undefined as number | undefined,
    selectionChip: null as HTMLElement | null, refresh: () => {}, collapse: () => {}, syncPlacement: () => {},
    catalogRevision: 0, missingSelection: '',
  };
}
type SkillShortcutState = ReturnType<typeof createSkillShortcutState>;
function createSkillShortcutActions(canvas: DramaCanvasBridge, conversation: AgentConversation,
  skills: AgentSkillClient, local: SkillShortcutState) {
  const skillName = (slug: string) =>
    local.catalog?.find((skill) => skill.slug === slug)?.name ||
    productionProfileForSkill(slug)?.name ||
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
      for (let i = 0; i < 30 && conversation.snapshot().restoring; i += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 40));
        if (!current()) return;
      }
      if (!current()) return;
      const selected = await conversation.selectSkill(slug);
      if (!current()) return;
      if (!selected) {
        local.error = '请等待当前回复或操作完成，再切换 SKILL。';
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
        local.error = cause instanceof Error ? cause.message : '暂时无法切换 SKILL。';
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
    const manage = document.createElement('button');
    manage.type = 'button'; manage.className = 'nako-agent-skills-retry';
    manage.textContent = '管理技能';
    manage.addEventListener('click', () => window.dispatchEvent(new Event('nako:open-skill-community')));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nako-agent-skills-toggle';
    toggle.setAttribute('aria-controls', 'nako-agent-skills-options');
    toggle.setAttribute('aria-label', '技能库');
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.className = 'nako-agent-skills-chevron';
    arrow.textContent = '›';
    const label = document.createElement('span');
    label.textContent = '切换技能';
    const hint = document.createElement('span');
    hint.className = 'nako-agent-skills-hint';
    hint.setAttribute('aria-hidden', 'true');
    toggle.append(label, hint, arrow);
    const options = document.createElement('div');
    options.id = 'nako-agent-skills-options';
    options.className = 'nako-agent-skills-options';
    options.setAttribute('role', 'region');
    options.setAttribute('aria-label', '选择SKILL');
    const optionsInner = document.createElement('div');
    optionsInner.className = 'nako-agent-skills-inner';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜索SKILL';
    search.setAttribute('aria-label', '搜索SKILL');
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
    optionsInner.append(categories, manage, search, list);
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
    let listSignature = '';
    local.collapse = () => {
      local.expanded = false;
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
      list.replaceChildren();
      const matching = skillCatalog
        .filter((skill) => !local.category || (skill.category || '其他') === local.category)
        .filter((skill) =>
          `${skill.name} ${skill.description} ${skill.slug}`.toLowerCase().includes(local.filter),
        );
      if (!local.loading && local.catalog && !matching.length) {
        const empty = document.createElement('p');
        empty.className = 'nako-agent-skills-note';
        empty.textContent = local.filter ? '没有匹配的 SKILL。' : '此分类暂无技能，可在“管理技能”中添加。';
        list.append(empty);
      }
      for (const skill of matching) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'nako-agent-skills-option';
        option.dataset.nakoSkill = skill.slug;
        const selected =
          !snapshot.restoring &&
          snapshot.selectedSkill?.slug === skill.slug;
        option.setAttribute('aria-pressed', String(selected));
        option.disabled = local.selecting || snapshot.busy;
        const name = document.createElement('strong');
        name.textContent = skill.name;
        const description = document.createElement('span');
        description.className = 'nako-agent-skills-description';
        description.textContent = skill.description;
        const content = document.createElement('span');
        content.className = 'nako-agent-skills-card-content';
        content.append(name, description);
        option.append(content);
        option.addEventListener('click', () => {
          void select(skill.slug);
        });
        list.append(option);
        if (focusedSlug === skill.slug && !option.disabled) option.focus();
      }
    };
    toggle.addEventListener('click', () => {
      local.expanded = !local.expanded;
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
  const style = document.createElement('style');
  style.textContent = `
    .nako-agent-skills,.nako-agent-skill-context{color:var(--nk-text);font:12px/1.5 Inter,"Microsoft YaHei UI",system-ui,sans-serif}
    .nako-agent-skills{margin-bottom:8px;min-width:0}
    .nako-agent-skills-categories{display:flex;gap:6px;margin:0 0 12px}.nako-agent-skills-categories button{border:0;border-radius:8px;padding:7px 12px;background:transparent;color:var(--nk-text-secondary);font:inherit;cursor:pointer}.nako-agent-skills-categories button[aria-selected=true]{background:var(--nk-hover);color:var(--nk-text)}
    .nako-agent-skills-heading{margin:0 0 12px;font-size:14px;font-weight:700;color:var(--nk-text)}
    .nako-agent-skills [hidden],.nako-agent-skill-context[hidden],.nako-agent-skill-context [hidden]{display:none}
    .nako-agent-skills-toggle{display:flex;align-items:center;gap:8px;width:100%;min-height:38px;padding:6px 4px;border:0;background:transparent;color:var(--nk-text);font-size:14px;font-weight:700;cursor:pointer;transition:color 160ms ease}
    .nako-agent-skills-toggle:hover{color:var(--nk-text)}
    .nako-agent-skills-hint{margin-left:auto;color:var(--nk-text-muted);font-size:11px;font-weight:400}
    .nako-agent-skills-chevron{font-size:20px;line-height:16px;width:16px;text-align:center;transform:rotate(90deg);transition:transform 200ms ease}
    .nako-agent-skills[data-expanded=true] .nako-agent-skills-chevron{transform:rotate(-90deg)}
    .nako-agent-skills-options{display:grid;grid-template-rows:0fr;opacity:0;visibility:hidden;transition:grid-template-rows 220ms cubic-bezier(.2,.7,.2,1),opacity 160ms ease,visibility 220ms;}
    .nako-agent-skills[data-expanded=true] .nako-agent-skills-options{grid-template-rows:1fr;opacity:1;visibility:visible}
    .nako-agent-skills-inner{min-height:0;overflow:hidden}
    .nako-agent-skills input{box-sizing:border-box;width:100%;margin:4px 0 8px;padding:9px 12px;border:1px solid var(--nk-border-control);border-radius:8px;background:var(--nk-surface);color:var(--nk-text);font-size:12px}
    .nako-agent-skills-list{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;max-height:min(300px,32vh);overflow:auto;overscroll-behavior:contain;padding:2px 2px 6px;scrollbar-width:thin}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-list{max-height:none;overflow:visible}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-options{transition:none}
    .nako-agent-skills-option{position:relative;isolation:isolate;min-width:0;min-height:110px;width:100%;padding:0;overflow:hidden;border:1px solid var(--nk-border);border-radius:10px;background:var(--nk-surface-raised);color:inherit;text-align:left;cursor:pointer;transition:background 150ms ease,border-color 150ms ease,transform 150ms ease}
    .nako-agent-skills-option:hover{background:var(--nk-surface-raised);border-color:var(--nk-border-control);transform:translateY(-1px)}
    .nako-agent-skills-option:active{transform:scale(.99)}
    .nako-agent-skills-option[aria-pressed=true]{background:var(--nk-surface-raised);border-color:var(--nk-border-control)}
    .nako-agent-skills-option::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--nk-recommendation-surface) 28%,color-mix(in srgb,var(--nk-recommendation-surface) 100%,transparent) 43%,color-mix(in srgb,var(--nk-recommendation-surface) 96%,transparent) 82%,color-mix(in srgb,var(--nk-recommendation-surface) 6%,transparent) 100%);pointer-events:none}
    .nako-agent-skills-card-content{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:14px;max-width:100%;min-height:110px;box-sizing:border-box}
    .nako-agent-skills-option strong{min-width:0;overflow-wrap:anywhere;font-size:14px;font-weight:700;color:var(--nk-text)}
    .nako-agent-skills-description{color:var(--nk-text-secondary);font-size:12px;line-height:1.6;overflow-wrap:anywhere;text-shadow:none}
    .nako-agent-skills-option small{margin-top:auto;font-size:10px;color:var(--nk-text);white-space:nowrap}
    @container(min-width:640px){.nako-agent-skills-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .nako-agent-skills[data-presentation=welcome]{container:agent-welcome-skills / inline-size;font-size:clamp(14px,2.2cqi,16px)}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-list{grid-template-columns:minmax(0,1fr);gap:clamp(12px,2cqi,18px)}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-heading{font-size:clamp(16px,2.8cqi,20px)}
    .nako-agent-skills[data-presentation=welcome] input{font-size:inherit;min-height:42px}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-card-content{min-height:clamp(148px,22cqi,180px);padding:clamp(16px,2.5cqi,22px);gap:10px;max-width:100%}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-option strong{font-size:clamp(16px,2.6cqi,18px)}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-description{font-size:clamp(14px,2.2cqi,16px)}
    .nako-agent-skills[data-presentation=welcome] .nako-agent-skills-option small{font-size:12px}
    .nako-agent-skills-option:disabled{opacity:.5;cursor:wait;transform:none}
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
    .nako-agent-skills select{max-width:100%;padding:6px 10px;border:1px solid var(--nk-border-control);border-radius:8px;background:var(--nk-input);color:var(--nk-text)}
    .nako-agent-skills button:focus-visible,.nako-agent-skills input:focus-visible,.nako-agent-skill-cancel:focus-visible{outline:2px solid var(--nk-info);outline-offset:2px}
    @media(prefers-reduced-motion:reduce){.nako-agent-skills *,.nako-agent-skill-context *{transition:none!important;animation:none!important}}
  `;
  document.head.append(style);
  const onCatalogChanged = () => { local.catalogRevision++; local.catalog = null; void readCatalog(); };
  window.addEventListener(SKILL_CATALOG_CHANGED, onCatalogChanged);
  window.addEventListener(SELECT_AGENT_SKILL_EVENT, onSelect);
  return () => {
    local.disposed = true;
    clearFeedback();
    unobserve();
    unsubscribe();
    style.remove();
    local.root?.remove();
    local.selectionChip?.remove();
    window.removeEventListener(SKILL_CATALOG_CHANGED, onCatalogChanged);
    window.removeEventListener(SELECT_AGENT_SKILL_EVENT, onSelect);
    conversation.dispose();
    if (browserServices.__NAKO_AGENT_CONVERSATION__ === conversation)
      delete browserServices.__NAKO_AGENT_CONVERSATION__;
  };
}

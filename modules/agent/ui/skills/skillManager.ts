import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import { SKILL_CATEGORIES } from '../../../contracts/skillCatalog.js';
import type { AgentSkill, AgentSkillClient } from './skillClient';
import { button, element, skillManagerCard } from './skillManagerCards';
import { openSkillImportDialog } from './skillImportDialog';
import { openSkillDetailView } from './skillDetailView';
import { SKILL_CATALOG_CHANGED } from '../../../contracts/skillCatalog.js';

export function openSkillManager(client: AgentSkillClient, select: (skill: AgentSkill) => void) {
  const overlay = element('div', 'nako-skill-overlay');
  overlay.dataset.nakoSkillCommunity = 'true';
  const dialog = element('section', 'nako-skill-dialog');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', '技能管理');
  const head = element('header', 'nako-skill-head'), title = element('div');
  title.append(element('h2', 'nako-skill-title', '技能管理'), element('p', 'nako-skill-subtitle', '官方预设随应用更新，用户自定义独立保存。'));
  const actions = element('div', 'nako-skill-actions'), toolbar = element('div', 'nako-skill-filters');
  const categories = element('select'), search = element('input');
  const tabs = element('div', 'nako-skill-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '技能来源');
  let source = 'official';
  const officialTab = button('官方预设', () => switchSource('official'));
  const customTab = button('用户自定义', () => switchSource('local'));
  tabs.append(officialTab, customTab);
  categories.setAttribute('aria-label', '筛选技能分类');
  search.type = 'search'; search.placeholder = '搜索技能名称或描述'; search.setAttribute('aria-label', '搜索技能');
  toolbar.append(categories, search);
  const body = element('div', 'nako-skill-body'), message = element('div', 'nako-skill-message');
  message.setAttribute('role', 'status');
  message.textContent = '选择技能不会自动发送消息或生成。';
  let skills: AgentSkill[] = [], disposed = false, revision = 0;
  let release: (() => void) | undefined;
  let closeImport: (() => void) | undefined;
  let closeDetail: (() => void) | undefined;
  const refresh = () => void load();
  const close = () => { if (disposed) return; disposed = true; window.removeEventListener(SKILL_CATALOG_CHANGED, refresh); closeImport?.(); closeDetail?.(); release?.(); overlay.remove(); };
  const choose = (skill: AgentSkill) => { close(); select(skill); };
  const showDetail = (skill: AgentSkill) => {
    closeDetail?.();
    let dispose: (() => void) | undefined;
    dispose = openSkillDetailView(skill, () => { dispose?.(); closeDetail = undefined; }, () => {
      dispose?.(); closeDetail = undefined; choose(skill);
    }, client);
    closeDetail = dispose;
  };
  const render = () => {
    body.replaceChildren();
    officialTab.setAttribute('aria-pressed', String(source === 'official'));
    customTab.setAttribute('aria-pressed', String(source === 'local'));
    const matching = skills.filter(skill => (skill.source === 'official' ? 'official' : 'local') === source
      && (categories.value === '' || skill.category === categories.value)
      && `${skill.name} ${skill.description} ${skill.slug}`.toLowerCase().includes(search.value.trim().toLowerCase()));
    if (!matching.length) body.append(element('div', 'nako-skill-empty', source === 'official'
      ? '暂无匹配的官方预设，请调整分类或搜索条件。' : '暂无匹配的自定义技能，可导入技能或调整筛选。'));
    const grid = element('div', 'nako-skill-grid');
    for (const skill of matching) {
      grid.append(skillManagerCard(skill, { select: showDetail }));
    }
    body.append(grid);
  };
  function switchSource(value: string) {
    source = value; categories.value = ''; search.value = ''; render();
  }
  const load = async () => {
    const owner = ++revision;
    body.textContent = '正在读取…';
    try {
      const result = await client.list();
      if (disposed || owner !== revision) return;
      skills = result.map(skill => ({ ...skill, category: skill.category || '其他' }));
      const selected = categories.value;
      const names = [...new Set([...SKILL_CATEGORIES, ...skills.map(skill => skill.category!)])];
      categories.replaceChildren(new Option('全部分类', ''), ...names.map(name => new Option(name, name)));
      categories.value = names.includes(selected) ? selected : '';
      render();
    } catch (error) { if (!disposed) body.textContent = error instanceof Error ? error.message : '读取技能失败'; }
  };
  const importSkill = button('导入技能', () => {
    let dispose: (() => void) | undefined;
    dispose = openSkillImportDialog(client, () => dispose?.(), () => {
      source = 'local'; categories.value = ''; search.value = ''; message.textContent = '已导入用户自定义技能'; void load();
    });
    closeImport = dispose;
  }); importSkill.classList.add('is-primary');
  const dismiss = button('×', close); dismiss.classList.add('nako-skill-close'); dismiss.setAttribute('aria-label', '关闭技能管理');
  actions.append(importSkill, dismiss);
  head.append(title, actions); dialog.append(head, tabs, toolbar, body, message); overlay.append(dialog); document.body.append(overlay);
  categories.addEventListener('change', render); search.addEventListener('input', render);
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  release = activateModal(overlay, close, { initialFocus: dismiss });
  window.addEventListener(SKILL_CATALOG_CHANGED, refresh);
  void load();
  return close;
}

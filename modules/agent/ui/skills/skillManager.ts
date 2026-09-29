import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import { SKILL_CATEGORIES } from '../../../contracts/skillCatalog.js';
import type { AgentSkill, AgentSkillClient } from './skillClient';
import { button, element, skillManagerCard } from './skillManagerCards';
import { restoreSkillManagerFocus } from './skillManagerFocus';
import { openSkillImportDialog } from './skillImportDialog';
import { openSkillDetailView } from './skillDetailView';

export function openSkillManager(client: AgentSkillClient, select: (skill: AgentSkill) => void) {
  const overlay = element('div', 'nako-skill-overlay');
  overlay.dataset.nakoSkillCommunity = 'true';
  const dialog = element('section', 'nako-skill-dialog');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', 'SKILL 管理');
  const head = element('header', 'nako-skill-head'), title = element('div');
  title.append(element('h2', 'nako-skill-title', 'SKILL 管理'), element('p', 'nako-skill-subtitle', '按类别管理技能，选择后在 Agent 对话中使用。'));
  const actions = element('div', 'nako-skill-actions'), toolbar = element('div', 'nako-skill-filters');
  const categories = element('select'), search = element('input');
  categories.setAttribute('aria-label', '筛选 SKILL 分类');
  search.type = 'search'; search.placeholder = '搜索技能名称、描述或指令'; search.setAttribute('aria-label', '搜索 SKILL');
  toolbar.append(categories, search);
  const body = element('div', 'nako-skill-body'), message = element('div', 'nako-skill-message');
  message.setAttribute('role', 'status');
  message.textContent = '选择技能不会自动发送消息或生成。';
  let skills: AgentSkill[] = [], busy = false, disposed = false, revision = 0;
  let release: (() => void) | undefined;
  let closeImport: (() => void) | undefined;
  let closeDetail: (() => void) | undefined;
  const close = () => { if (disposed) return; disposed = true; closeImport?.(); closeDetail?.(); release?.(); overlay.remove(); };
  const choose = (skill: AgentSkill) => { close(); select(skill); };
  const showDetail = (skill: AgentSkill) => {
    closeDetail?.();
    let dispose: (() => void) | undefined;
    dispose = openSkillDetailView(skill, () => { dispose?.(); closeDetail = undefined; }, () => {
      dispose?.(); closeDetail = undefined; choose(skill);
    });
    closeDetail = dispose;
  };
  const render = () => {
    body.replaceChildren();
    const matching = skills.filter(skill => (categories.value === '' || skill.category === categories.value)
      && `${skill.name} ${skill.description} ${skill.slug}`.toLowerCase().includes(search.value.trim().toLowerCase()));
    if (!matching.length) body.append(element('div', 'nako-skill-empty', '此分类暂无技能，可导入文件或选择其他分类。'));
    const grid = element('div', 'nako-skill-grid');
    for (const skill of matching) {
      grid.append(skillManagerCard(skill, { client, select: showDetail, mutate }));
    }
    body.append(grid);
  };
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
  const mutate = async (action: () => Promise<unknown>, success: string) => {
    if (busy || disposed) return;
    const restoreFocus = restoreSkillManagerFocus(dialog, search);
    busy = true;
    dialog.setAttribute('aria-busy', 'true');
    dialog.querySelectorAll<HTMLButtonElement>('button').forEach(item => { item.disabled = true; });
    message.textContent = '正在更新…';
    try { await action(); if (!disposed) { message.textContent = success; await load(); } }
    catch (error) { if (!disposed) message.textContent = error instanceof Error ? error.message : '更新失败，请重试'; }
    finally {
      busy = false; dialog.setAttribute('aria-busy', 'false');
      dialog.querySelectorAll<HTMLButtonElement>('button').forEach(item => { item.disabled = false; });
      if (!disposed) restoreFocus();
    }
  };
  const importSkill = button('导入 Skill', () => {
    let dispose: (() => void) | undefined;
    dispose = openSkillImportDialog(client, () => dispose?.(), () => {
      categories.value = ''; search.value = ''; message.textContent = 'Skill 已导入'; void load();
    });
    closeImport = dispose;
  }); importSkill.classList.add('is-primary');
  const dismiss = button('×', close); dismiss.classList.add('nako-skill-close'); dismiss.setAttribute('aria-label', '关闭 SKILL 管理');
  actions.append(importSkill, dismiss);
  head.append(title, actions); dialog.append(head, toolbar, body, message); overlay.append(dialog); document.body.append(overlay);
  categories.addEventListener('change', render); search.addEventListener('input', render);
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  release = activateModal(overlay, () => {
    const cancel = dialog.querySelector<HTMLButtonElement>('.nako-skill-delete-confirm:not([hidden]) button');
    if (cancel) cancel.click();
    else close();
  }, { initialFocus: dismiss });
  void load();
  return close;
}

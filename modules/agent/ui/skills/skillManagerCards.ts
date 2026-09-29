import type { AgentSkill, AgentSkillClient } from './skillClient';
import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';

export const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};
export function button(text: string, action: () => void) {
  const node = element('button', 'nako-skill-button', text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
type Options = {
  client: AgentSkillClient;
  select(skill: AgentSkill): void;
  mutate(action: () => Promise<unknown>, message: string): Promise<void>;
};
function management(skill: AgentSkill, options: Options) {
  const controls = element('div', 'nako-skill-card-controls');
  const category = element('input');
  category.value = skill.category || '其他';
  category.maxLength = 40;
  category.setAttribute('list', 'nako-skill-category-options');
  category.setAttribute('aria-label', `${skill.name}分类`);
  const save = button('保存分类', () => {
    void options.mutate(() => options.client.updateCategory(skill.slug, category.value), '分类已保存');
  });
  const remove = button('删除', () => {
    confirmation.hidden = false;
    remove.hidden = true;
    cancel.focus();
  });
  remove.setAttribute('aria-label', `删除 ${skill.name}`);
  const confirmation = element('div', 'nako-skill-delete-confirm');
  confirmation.hidden = true;
  confirmation.setAttribute('role', 'group');
  confirmation.setAttribute('aria-label', `确认删除 ${skill.name}`);
  const dismiss = () => { confirmation.hidden = true; remove.hidden = false; remove.focus(); };
  const cancel = button('取消', dismiss);
  const confirm = button('确认删除', () => {
    void options.mutate(() => options.client.remove(skill.slug), `已删除 ${skill.name}`);
  });
  confirmation.append(element('p', '', `删除「${skill.name}」？已有对话记录保留。`), cancel, confirm);
  confirmation.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
  });
  controls.append(category, save, remove, confirmation);
  return controls;
}
export function skillManagerCard(skill: AgentSkill, options: Options) {
  const group = element('div', 'nako-skill-card-group');
  group.dataset.nakoSkill = skill.slug;
  const card = button('', () => options.select(skill));
  card.className = 'nako-skill-card';
  const content = element('span', 'nako-skill-card-content');
  content.append(element('strong', 'nako-skill-name', skill.name),
    element('span', 'nako-skill-description', skill.description || '暂无简介'));
  const cover = element('img', 'nako-skill-cover');
  cover.src = skill.coverUrl || CARD_PLACEHOLDER_IMAGE; cover.alt = ''; cover.loading = 'lazy'; cover.decoding = 'async'; cover.draggable = false;
  cover.onerror = () => { cover.src = CARD_PLACEHOLDER_IMAGE; };
  card.append(cover, content);
  group.append(card, management(skill, options));
  return group;
}

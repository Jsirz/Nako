import type { AgentSkill } from './skillClient';
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
  select(skill: AgentSkill): void;
};
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
  group.append(card);
  return group;
}

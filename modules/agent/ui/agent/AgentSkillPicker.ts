import type { AgentSkill } from '../../../contracts/skillCatalog.js';
import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';
import { button, element } from '../skills/skillManagerCards';
import { openSkillDetailView } from '../skills/skillDetailView';
import { installSkillStyles } from '../skills/skillCommunityStyles';

/** Covers preview locally; only an explicit selection invokes the existing skill action. */
export function createAgentSkillPicker(useSkill: (slug: string) => void, beforeDetails: () => void) {
  let preview: HTMLDivElement | undefined;
  let closeDetail: (() => void) | undefined;
  const hidePreview = () => { preview?.remove(); preview = undefined; };
  const close = () => { hidePreview(); closeDetail?.(); closeDetail = undefined; };
  const showPreview = (skill: AgentSkill, row: HTMLElement) => {
    hidePreview();
    const bounds = row.getBoundingClientRect();
    const leftRoom = bounds.left - 24, rightRoom = window.innerWidth - bounds.right - 24;
    const width = Math.min(320, Math.max(leftRoom, rightRoom));
    if (width < 224 || row.closest('[inert]')) return;
    preview = element('div', 'nako-agent-skill-preview');
    preview.setAttribute('role', 'tooltip');
    const cover = element('img');
    cover.src = skill.coverUrl || CARD_PLACEHOLDER_IMAGE;
    cover.alt = ''; cover.decoding = 'async';
    cover.onerror = () => { if (cover.getAttribute('src') !== CARD_PLACEHOLDER_IMAGE) cover.src = CARD_PLACEHOLDER_IMAGE; };
    const text = element('div', 'nako-agent-skill-preview-text');
    text.append(element('strong', '', skill.name), element('p', '', skill.description || '暂无简介'));
    preview.append(cover, text);
    preview.style.width = `${width}px`;
    preview.style.left = `${leftRoom >= width ? bounds.left - width - 12 : bounds.right + 12}px`;
    document.body.append(preview);
    const height = preview.getBoundingClientRect().height;
    preview.style.top = `${Math.max(12, Math.min(bounds.top, window.innerHeight - height - 12))}px`;
  };
  const details = (skill: AgentSkill) => {
    close();
    beforeDetails();
    installSkillStyles();
    closeDetail = openSkillDetailView(skill, close, () => { close(); useSkill(skill.slug); });
  };
  const createRow = (skill: AgentSkill, selected: boolean, disabled: boolean) => {
    const row = element('div', 'nako-agent-skills-row');
    row.dataset.selected = String(selected);
    const option = button('', () => { hidePreview(); useSkill(skill.slug); });
    option.className = 'nako-agent-skills-option';
    option.dataset.nakoSkill = skill.slug;
    option.setAttribute('aria-pressed', String(selected));
    option.disabled = disabled;
    const content = element('span', 'nako-agent-skills-card-content');
    content.append(element('strong', '', skill.name),
      element('span', 'nako-agent-skills-description', skill.description || '暂无简介'));
    option.append(content);
    const detail = button('详情', () => details(skill));
    detail.className = 'nako-agent-skills-detail';
    detail.setAttribute('aria-label', `${skill.name}详情`);
    detail.disabled = disabled;
    row.append(option, detail);
    row.addEventListener('mouseenter', () => { if (!disabled) showPreview(skill, row); });
    row.addEventListener('mouseleave', hidePreview);
    row.addEventListener('focusin', () => { if (!disabled) showPreview(skill, row); });
    row.addEventListener('focusout', (event) => {
      if (!(event.relatedTarget instanceof Node) || !row.contains(event.relatedTarget)) hidePreview();
    });
    return row;
  };
  window.addEventListener('resize', hidePreview);
  window.addEventListener('scroll', hidePreview, true);
  return {
    createRow, hidePreview, close,
    dispose() {
      close();
      window.removeEventListener('resize', hidePreview);
      window.removeEventListener('scroll', hidePreview, true);
    },
  };
}

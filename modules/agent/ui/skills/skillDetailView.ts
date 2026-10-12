import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';
import type { AgentSkill } from '../../../contracts/skillCatalog.js';
import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import { button, element } from './skillManagerCards';

export function openSkillDetailView(skill: AgentSkill, onClose: () => void, onUse?: () => void) {
  const overlay = element('div', 'nako-skill-detail-overlay');
  const dialog = element('section', 'nako-skill-detail');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', skill.name);
  const hero = element('div', 'nako-skill-detail-hero');
  const cover = element('img', 'nako-skill-detail-cover');
  cover.src = skill.coverUrl || CARD_PLACEHOLDER_IMAGE; cover.alt = '';
  cover.onerror = () => { cover.src = CARD_PLACEHOLDER_IMAGE; };
  const close = button('×', onClose); close.className = 'nako-skill-close'; close.setAttribute('aria-label', '关闭技能详情');
  const heading = element('div', 'nako-skill-detail-heading');
  heading.append(element('h2', '', skill.name), element('span', '', `${skill.source === 'official' ? '官方预设' : '用户自定义'} · ${skill.category || '其他'} · ${skill.fileCount} 个文件`));
  hero.append(cover, heading, close);
  const body = element('div', 'nako-skill-detail-body');
  const description = element('section', 'nako-skill-detail-section');
  description.append(element('h3', '', '简介'), element('p', '', skill.description || '暂无简介'));
  body.append(description);
  dialog.append(hero, body);
  if (onUse) {
    const footer = element('footer', 'nako-skill-detail-footer');
    footer.append(button('使用技能', onUse));
    footer.lastElementChild?.classList.add('is-primary');
    dialog.append(footer);
  }
  overlay.append(dialog); document.body.append(overlay);
  const release = activateModal(overlay, onClose, { initialFocus: close });
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) onClose(); });
  return () => { release(); overlay.remove(); };
}

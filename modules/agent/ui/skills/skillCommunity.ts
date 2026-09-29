import type { AgentSkill, AgentSkillClient } from './skillClient';
import { SKILL_CATALOG_CHANGED, SKILL_PREVIEW_EVENT } from '../../../contracts/skillCatalog.js';
import { installSkillStyles } from './skillCommunityStyles';
import { openSkillManager } from './skillManager';
import { SkillSlashMenu } from './skillSlashMenu';
const OPEN_EVENT = 'nako:open-skill-community';

function selectSkill(skill: AgentSkill) {
  if (document.querySelector('[data-nako-project-dashboard]')) {
    window.dispatchEvent(new CustomEvent(SKILL_PREVIEW_EVENT, { detail: skill }));
    return;
  }
  window.dispatchEvent(
    new CustomEvent('nako:select-agent-skill', { detail: { slug: skill.slug } }),
  );
}

export function installSkillCommunity(client: AgentSkillClient) {
  installSkillStyles();
  let cachedSkills: AgentSkill[] | null = null,
    catalogRevision = 0;
  const getSkills = async (): Promise<AgentSkill[]> => {
    if (!cachedSkills) {
      const revision = catalogRevision,
        skills = await client.list();
      if (revision !== catalogRevision) return getSkills();
      cachedSkills = skills;
    }
    return cachedSkills;
  };
  const menu = new SkillSlashMenu(getSkills, selectSkill);
  let releaseDialog: (() => void) | undefined;
  const onOpen = () => {
    menu.close();
    releaseDialog?.();
    releaseDialog = openSkillManager(client, selectSkill);
  };
  const onChanged = () => {
    catalogRevision++;
    cachedSkills = null;
    menu.close();
  };
  window.addEventListener(SKILL_CATALOG_CHANGED, onChanged);
  window.addEventListener(OPEN_EVENT, onOpen);
  return () => {
    menu.dispose();
    releaseDialog?.();
    window.removeEventListener(OPEN_EVENT, onOpen);
    window.removeEventListener(SKILL_CATALOG_CHANGED, onChanged);
  };
}

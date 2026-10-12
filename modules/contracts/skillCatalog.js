import { AgentSkillError } from './agentSkillError.js';

export const SKILL_CATEGORIES = Object.freeze(['文本创作', '图像设计', '视频制作', '音频处理', '工作流', '其他']);
export const SKILL_DESCRIPTION_MAX_LENGTH = 4000;
export const SKILL_CATALOG_CHANGED = 'nako:skill-catalog-changed';
export const SKILL_PREVIEW_EVENT = 'nako:preview-skill';
export const SKILL_NEW_CANVAS_EVENT = 'agent.skill.new-canvas';
export const SKILL_SELECT_EVENT = 'agent.skill.select';
export function skillCategory(value) {
  if (value === undefined || value === null || value === '') return '其他';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 40 || /[\x00-\x1f]/.test(value))
    throw new AgentSkillError('分类须为 1–40 个字符');
  return value.trim();
}

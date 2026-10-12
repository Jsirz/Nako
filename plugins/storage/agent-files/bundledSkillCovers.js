import path from 'node:path';
import { BUNDLED_MODULES_DIRECTORY } from './bundledPaths.js';
import { productionProfileForSkill } from '../../../modules/contracts/officialProductionProfiles.js';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';
import { readPresetSkillCover } from './presetSkillCovers.js';

export function bundledSkillCoverUrl(slug) {
  return productionProfileForSkill(slug) ? `/api/agent-skills/${slug}/cover` : undefined;
}

export async function readBundledSkillCover(slug) {
  if (!productionProfileForSkill(slug)) throw new AgentSkillError('技能封面不存在', 404);
  const directory = path.join(BUNDLED_MODULES_DIRECTORY, 'agent', 'server', 'agent', 'builtin');
  const cover = await readPresetSkillCover(directory, slug);
  if (!cover) throw new AgentSkillError('技能封面不存在或不是目录内的普通文件', 404);
  return cover;
}

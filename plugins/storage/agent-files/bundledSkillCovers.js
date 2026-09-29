import fs from 'node:fs/promises';
import path from 'node:path';
import { RUNTIME_PATHS } from '../../../modules/project/api/server/workspace/runtimePaths.js';
import { productionProfileForSkill } from '../../../modules/contracts/officialProductionProfiles.js';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';

export function bundledSkillCoverUrl(slug) {
  return productionProfileForSkill(slug) ? `/api/agent-skills/${slug}/cover` : undefined;
}

export async function readBundledSkillCover(slug) {
  if (!productionProfileForSkill(slug)) throw new AgentSkillError('SKILL 封面不存在', 404);
  const directory = path.join(RUNTIME_PATHS.MODULES_DIR, 'agent', 'server', 'agent', 'builtin', slug);
  const filename = path.join(directory, 'cover.webp');
  const [directoryStat, fileStat] = await Promise.all([fs.lstat(directory), fs.lstat(filename)]);
  if (directoryStat.isSymbolicLink() || fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw new AgentSkillError('SKILL 封面必须是技能目录内的普通文件');
  }
  return { content: await fs.readFile(filename), contentType: 'image/webp' };
}

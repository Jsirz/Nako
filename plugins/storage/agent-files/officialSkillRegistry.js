import { AgentOperationError, AGENT_ERROR_CODES } from '../../../modules/contracts/agentErrors.js';
import path from 'node:path';
import { OFFICIAL_PRODUCTION_PROFILES } from '../../../modules/contracts/officialProductionProfiles.js';
import { BUNDLED_MODULES_DIRECTORY } from './bundledPaths.js';
import { readSkillMetadata } from './skillFrontmatter.js';

/** Routing identity comes from contracts; display copy comes from each bundled directory. */
export function createOfficialSkillRegistry(entries, reader) {
  entries ??= OFFICIAL_PRODUCTION_PROFILES.map(profile => ({
    metadata: { slug: profile.slug, bundleId: profile.id, version: profile.version },
    readMetadata: () => readSkillMetadata(path.join(BUNDLED_MODULES_DIRECTORY, 'agent', 'server', 'agent', 'builtin', profile.slug)),
    readInstructions: () => reader(profile.id),
  }));
  const registry = new Map();
  for (const entry of entries) {
    const metadata = entry?.metadata;
    if (!metadata || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(metadata.slug)
      || metadata.slug.startsWith('local--') || registry.has(metadata.slug)
      || typeof metadata.version !== 'string' || !metadata.version
      || typeof entry.readInstructions !== 'function') {
      throw new AgentOperationError('官方技能注册信息无效或重复', {
        moduleId: 'storage.agent-files', operation: 'register-official-skill',
      }, AGENT_ERROR_CODES.invalidRequest);
    }
    registry.set(metadata.slug, {
      metadata: Object.freeze({ ...metadata, category: metadata.category || '视频制作',
        openness: metadata.openness === 'closed' ? 'closed' : 'open', source: 'official' }),
      readInstructions: entry.readInstructions,
      readMetadata: entry.readMetadata,
    });
  }
  return Object.freeze({
    async list() {
      const skills = await Promise.all([...registry.values()].map(async ({ metadata, readMetadata }) => {
        try {
          return { ...metadata, ...await readMetadata?.(),
            slug: metadata.slug, bundleId: metadata.bundleId, version: metadata.version, source: 'official', updatedAt: '' };
        } catch (error) {
          if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
          throw error;
        }
      }));
      return skills.filter(Boolean);
    },
    async readInstructions(slug, context) {
      const skill = registry.get(slug);
      if (!skill) throw new AgentOperationError('官方技能尚未就绪', {
        moduleId: 'storage.agent-files', operation: 'read-official-skill', slug,
      }, AGENT_ERROR_CODES.unavailable);
      return skill.readInstructions(context);
    },
  });
}

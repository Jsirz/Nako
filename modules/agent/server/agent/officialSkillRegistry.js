import { AgentOperationError, AGENT_ERROR_CODES } from '../../../contracts/agentErrors.js';
import { OFFICIAL_DRAMA_BUNDLE } from './drama/officialDramaBundle.js';

export const DEFAULT_OFFICIAL_SKILL_SLUG = OFFICIAL_DRAMA_BUNDLE.skillSlug;

/** Only trusted bundled code registers official skills; imports never populate this registry. */
export function createOfficialSkillRegistry(entries) {
  const registry = new Map();
  for (const entry of entries) {
    const metadata = entry?.metadata;
    if (!metadata || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(metadata.slug)
      || metadata.slug.startsWith('local--') || registry.has(metadata.slug)
      || typeof metadata.version !== 'string' || !metadata.version
      || typeof entry.readInstructions !== 'function') {
      throw new AgentOperationError('官方技能注册信息无效或重复', { operation: 'register-official-skill' }, AGENT_ERROR_CODES.invalidRequest);
    }
    registry.set(metadata.slug, {
      metadata: Object.freeze({ ...metadata, category: metadata.category || '视频制作', openness: metadata.openness === 'closed' ? 'closed' : 'open', source: 'official' }),
      readInstructions: entry.readInstructions,
    });
  }
  return Object.freeze({
    list: () => [...registry.values()].map(({ metadata }) => ({ ...metadata })),
    readInstructions: async (slug, context) => {
      const skill = registry.get(slug);
      if (!skill) throw new AgentOperationError('官方技能尚未就绪', { operation: 'read-official-skill', slug }, AGENT_ERROR_CODES.unavailable);
      return skill.readInstructions(context);
    },
  });
}

import { AgentOperationError, AGENT_ERROR_CODES } from '../../../modules/contracts/agentErrors.js';
import { OFFICIAL_PRODUCTION_SKILLS } from '../../../modules/contracts/officialDramaBundle.js';

/** Only the bundled contract catalog can provide official skill metadata. */
export function createOfficialSkillRegistry(entries, reader) {
  entries ??= OFFICIAL_PRODUCTION_SKILLS.map(metadata => ({
    metadata,
    readInstructions: () => reader(metadata.bundleId),
  }));
  const registry = new Map();
  for (const entry of entries) {
    const metadata = entry?.metadata;
    if (!metadata || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(metadata.slug)
      || metadata.slug.startsWith('local--') || registry.has(metadata.slug)
      || typeof metadata.version !== 'string' || !metadata.version
      || typeof entry.readInstructions !== 'function') {
      throw new AgentOperationError('官方 SKILL 注册信息无效或重复', {
        moduleId: 'storage.agent-files', operation: 'register-official-skill',
      }, AGENT_ERROR_CODES.invalidRequest);
    }
    registry.set(metadata.slug, {
      metadata: Object.freeze({ ...metadata, category: metadata.category || '视频制作',
        openness: metadata.openness === 'closed' ? 'closed' : 'open', source: 'official' }),
      readInstructions: entry.readInstructions,
    });
  }
  return Object.freeze({
    list: () => [...registry.values()].map(({ metadata }) => ({ ...metadata })),
    async readInstructions(slug, context) {
      const skill = registry.get(slug);
      if (!skill) throw new AgentOperationError('官方 SKILL 尚未就绪', {
        moduleId: 'storage.agent-files', operation: 'read-official-skill', slug,
      }, AGENT_ERROR_CODES.unavailable);
      return skill.readInstructions(context);
    },
  });
}

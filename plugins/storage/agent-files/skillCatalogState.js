import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';
import { skillCategory } from '../../../modules/contracts/skillCatalog.js';

const queues = new Map();

// Instances for the same user share a queue; other users remain independent.
export function createSkillCatalogState(rootDirectory, list) {
  const filename = path.join(rootDirectory, 'catalog.json');
  const queueKey = path.resolve(rootDirectory);
  const serialize = action => {
    const result = (queues.get(queueKey) || Promise.resolve()).then(action);
    const settled = result.catch(() => {});
    queues.set(queueKey, settled);
    void settled.then(() => { if (queues.get(queueKey) === settled) queues.delete(queueKey); });
    return result;
  };
  async function read() {
    try {
      const value = JSON.parse(await fs.readFile(filename, 'utf8'));
      if (value.version !== 1 || !Array.isArray(value.removed) || value.removed.some(id => typeof id !== 'string')
        || !value.categories || typeof value.categories !== 'object' || Array.isArray(value.categories))
        throw new AgentSkillError('技能分类目录损坏，请检查本地存储', 500);
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return { version: 1, removed: [], categories: {} };
      throw error;
    }
  }
  async function write(state) {
    await fs.mkdir(rootDirectory, { recursive: true });
    const temporary = path.join(rootDirectory, `.catalog-${crypto.randomUUID()}.json`);
    try {
      await fs.writeFile(temporary, JSON.stringify(state, null, 2));
      await fs.rename(temporary, filename);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  const validSlug = slug => {
    if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug))
      throw new AgentSkillError('技能标识无效');
  };
  async function requireSkill(slug) {
    validSlug(slug);
    const skill = (await list()).find(item => item.slug === slug);
    if (!skill) throw new AgentSkillError('技能不存在或已删除', 404);
    if (skill.source === 'official') throw new AgentSkillError('官方预设随应用版本更新，不能修改或删除', 403);
    return skill;
  }
  const updateCategory = (slug, category) => serialize(async () => {
    const value = skillCategory(category), skill = await requireSkill(slug), state = await read();
    state.categories[slug] = value;
    await write(state);
    return { ...skill, category: value };
  });
  const remove = slug => serialize(async () => {
    const skill = await requireSkill(slug), state = await read();
    const target = path.resolve(rootDirectory, slug);
    if (path.dirname(target) !== path.resolve(rootDirectory)) throw new AgentSkillError('技能路径无效');
    await fs.rm(target, { recursive: true, force: true });
    delete state.categories[slug];
    await write(state);
  });
  return { read, updateCategory, remove, serialize };
}

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';
import { BUNDLED_MODULES_DIRECTORY } from './bundledPaths.js';
import { readSkillMetadata } from './skillFrontmatter.js';
import { readSkillInstructionFiles } from './skillInstructions.js';
import { resolvePresetSkillCover, readPresetSkillCover } from './presetSkillCovers.js';

export const DEFAULT_SKILL_PRESET_DIRECTORY = path.join(
  BUNDLED_MODULES_DIRECTORY, 'agent', 'server', 'agent', 'builtin', 'presets',
);

/** Official presets are read from the installed application, never copied to user storage. */
export function createBundledSkillPresets(presetDirectory) {
  const slugFor = id => `preset-${/^[a-z0-9][a-z0-9-]{0,56}$/.test(id)
    ? id : crypto.createHash('sha256').update(id).digest('hex').slice(0, 24)}`;
  async function entries() {
    if (presetDirectory === null) return [];
    const root = await fs.lstat(presetDirectory).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!root) return [];
    if (!root.isDirectory() || root.isSymbolicLink()) throw new AgentSkillError('官方技能预设目录不能是链接');
    const files = await fs.readdir(presetDirectory, { withFileTypes: true });
    if (files.some(entry => entry.isSymbolicLink())) throw new AgentSkillError('官方技能预设不能是链接');
    return files.filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))
      .map(entry => ({ id: entry.name, slug: slugFor(entry.name), directory: path.join(presetDirectory, entry.name) }));
  }
  async function requirePreset(slug) {
    const preset = (await entries()).find(entry => entry.slug === slug);
    if (!preset) throw new AgentSkillError('官方技能不存在或已移除', 404);
    return preset;
  }
  return {
    async list() {
      return Promise.all((await entries()).map(async ({ id, slug, directory }) => {
        const metadata = await readSkillMetadata(directory);
        const instruction = await fs.lstat(path.join(directory, 'SKILL.md'));
        if (!instruction.isFile() || instruction.isSymbolicLink()) throw new AgentSkillError('官方技能指令必须是普通文件');
        return { ...metadata, slug, source: 'official', preset: true, updatedAt: '',
          ...(await resolvePresetSkillCover(presetDirectory, id) ? { coverUrl: `/api/agent-skills/${slug}/cover` } : {}) };
      }));
    },
    async readInstructions(slug) {
      return readSkillInstructionFiles((await requirePreset(slug)).directory);
    },
    async readCover(slug) {
      const cover = await readPresetSkillCover(presetDirectory, (await requirePreset(slug)).id);
      if (!cover) throw new AgentSkillError('官方技能封面不存在', 404);
      return cover;
    },
  };
}

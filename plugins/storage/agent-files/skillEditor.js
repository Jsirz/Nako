import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';
import { parseSkillMetadata } from './skillFrontmatter.js';
import { readSkillInstructionFiles } from './skillInstructions.js';

const TEXT_FILE = /\.(?:md|txt|json|ya?ml|py|[cm]?js|ts|css|html|csv|xml|toml|sh|bat|ps1)$/i;
const COVER_FILE = /\.(?:gif|webp|png|jpe?g)$/i;
function filePath(value) {
  if (typeof value !== 'string' || !value || /[<>"|?*\x00-\x1f]/.test(value) ||
      value.includes('\\') || value.includes(':') || value.startsWith('/') ||
      value.split('/').some(part => !part || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new AgentSkillError('技能文件路径无效');
  }
  return value;
}
async function filesIn(directory, prefix = '') {
  const folder = await fs.lstat(directory);
  if (!folder.isDirectory() || folder.isSymbolicLink()) throw new AgentSkillError('技能目录不能是链接');
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new AgentSkillError('技能文件不能是链接');
    const relative = prefix + entry.name;
    filePath(relative);
    if (entry.isDirectory()) result.push(...await filesIn(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) result.push(relative);
    else throw new AgentSkillError('技能只能包含普通文件和目录');
  }
  return result.sort();
}

/** User-only editing lives in the storage adapter, under the shared catalog queue. */
export function createSkillEditor({ rootDirectory, catalog, rename }) {
  const directoryFor = slug => path.join(rootDirectory, slug);
  async function read(slug) {
    const skill = await catalog.requireSkill(slug), directory = directoryFor(slug);
    const files = await Promise.all((await filesIn(directory)).filter(file => file !== 'metadata.json').map(async relative => {
      if (!TEXT_FILE.test(relative)) return { path: relative };
      const content = await fs.readFile(path.join(directory, relative));
      return { path: relative, ...(!content.includes(0) ? { text: content.toString('utf8') } : {}) };
    }));
    const metadata = JSON.parse(await fs.readFile(path.join(directory, 'metadata.json'), 'utf8'));
    return { skill, files, ...(metadata.coverFile ? { coverFile: metadata.coverFile } : {}) };
  }
  async function save(slug, request) {
    const skill = await catalog.requireSkill(slug);
    if (typeof request?.updatedAt !== 'string' || request.updatedAt !== skill.updatedAt) {
      throw new AgentSkillError('技能已被修改，请重新打开编辑界面后重试', 409);
    }
    const display = parseSkillMetadata(JSON.stringify(request));
    if (!Array.isArray(request.files) || !Array.isArray(request.removedPaths)) throw new AgentSkillError('技能编辑文件列表无效');
    const changes = request.files.map(file => {
      const relative = filePath(file?.path);
      if (typeof file.contentBase64 !== 'string') throw new AgentSkillError('技能文件内容无效');
      return { relative, content: Buffer.from(file.contentBase64, 'base64') };
    });
    const removed = request.removedPaths.map(filePath);
    if (changes.some(file => file.relative.toLowerCase() === 'metadata.json') ||
        removed.some(file => ['metadata.json', 'skill.md'].includes(file.toLowerCase()))) {
      throw new AgentSkillError('不能直接删除根技能指令或编辑存储元数据');
    }
    const changedNames = changes.map(file => file.relative.toLowerCase());
    if (new Set(changedNames).size !== changedNames.length) throw new AgentSkillError('技能不能包含重复文件');
    const directory = directoryFor(slug);
    const originals = await filesIn(directory);
    if (changes.some(file => originals.some(original => original.toLowerCase() === file.relative.toLowerCase()
      && original !== file.relative && !removed.includes(original)))) throw new AgentSkillError('替换文件时请保持原路径的大小写');
    const metadata = JSON.parse(await fs.readFile(path.join(directory, 'metadata.json'), 'utf8'));
    const state = await catalog.read();
    const staging = path.join(rootDirectory, `.edit-${crypto.randomUUID()}`);
    const backup = path.join(rootDirectory, `.backup-${crypto.randomUUID()}`);
    let moved = false, installed = false;
    try {
      await fs.cp(directory, staging, { recursive: true });
      for (const relative of removed) {
        if (!originals.includes(relative)) throw new AgentSkillError('要删除的技能文件不存在');
        await fs.rm(path.join(staging, relative));
      }
      for (const { relative, content } of changes) {
        const filename = path.join(staging, relative);
        await fs.mkdir(path.dirname(filename), { recursive: true });
        await fs.writeFile(filename, content);
      }
      const files = await filesIn(staging);
      if (new Set(files.map(file => file.toLowerCase())).size !== files.length) throw new AgentSkillError('技能不能包含仅大小写不同的文件');
      if (request.coverFile !== undefined && request.coverFile !== null) {
        const cover = filePath(request.coverFile);
        if (!COVER_FILE.test(cover) || !files.includes(cover)) throw new AgentSkillError('技能封面文件不存在或格式无效');
      }
      const coverFile = request.coverFile === undefined ? metadata.coverFile : request.coverFile;
      if (coverFile && !files.includes(coverFile)) throw new AgentSkillError('请先移除或替换封面，再删除对应文件');
      try { await readSkillInstructionFiles(staging); }
      catch (error) { throw new AgentSkillError(error.message); }
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(skill.updatedAt) + 1 || 0)).toISOString();
      const updated = { slug, ...display, openness: metadata.openness || 'open', source: 'local', updatedAt, fileCount: files.length,
        ...(coverFile ? { coverFile } : {}) };
      await fs.writeFile(path.join(staging, 'metadata.json'), JSON.stringify(updated, null, 2));
      await rename(directory, backup); moved = true;
      await rename(staging, directory); installed = true;
      state.categories[slug] = display.category;
      await catalog.write(state);
    } catch (error) {
      if (moved) {
        if (installed) await fs.rm(directory, { recursive: true, force: true });
        await rename(backup, directory);
      }
      throw error;
    } finally {
      await fs.rm(staging, { recursive: true, force: true });
    }
    await fs.rm(backup, { recursive: true, force: true });
    return catalog.requireSkill(slug);
  }
  return {
    read: slug => catalog.serialize(() => read(slug)),
    save: (slug, request) => catalog.serialize(() => save(slug, request)),
  };
}

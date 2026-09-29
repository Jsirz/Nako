import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';
import { RUNTIME_PATHS } from '../../../modules/project/api/server/workspace/runtimePaths.js';

export const DEFAULT_SKILL_PRESET_DIRECTORY = path.join(
  RUNTIME_PATHS.MODULES_DIR, 'agent', 'server', 'agent', 'builtin', 'presets',
);
const CATEGORIES = {
  'deepwhite-image-prompt-builder': '图像设计',
  'deepwhite-screenwriting-v1': '文本创作',
  'hook-opening-master-dev': '文本创作',
  'mj-asset-prompt-builder': '图像设计',
  'neoimage-prompt-engine': '图像设计',
  'screenplay-master': '文本创作',
  '角色资产场景生成-公开版': '图像设计',
};

async function readFiles(directory, relative = '') {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AgentSkillError('SKILL 预设目录不能是链接');
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name), filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new AgentSkillError('SKILL 预设文件不能是链接');
    if (entry.isDirectory()) files.push(...await readFiles(filename, name));
    else if (entry.isFile()) files.push({ relativePath: name, content: await fs.readFile(filename) });
    else throw new AgentSkillError('SKILL 预设只能包含普通文件和目录');
  }
  if (!relative && !files.some(file => file.relativePath === 'SKILL.md')) {
    throw new AgentSkillError('SKILL 预设缺少根 SKILL.md');
  }
  return files;
}

function addInstructionManifest(files) {
  if (files.some(file => file.relativePath === 'agent-skill.json')) return files;
  const instructionReferences = files
    .map(file => file.relativePath)
    .filter(name => /^(?:reference|references|templates|assets)\/(?:[^/]+\/)*[^/]+\.(?:md|txt)$/i.test(name))
    .sort((left, right) => left.localeCompare(right));
  if (!instructionReferences.length) return files;
  return [...files, {
    relativePath: 'agent-skill.json',
    content: Buffer.from(JSON.stringify({ instructionReferences }, null, 2)),
  }];
}

async function readState(filename) {
  try {
    const state = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (state.version !== 1 || !Array.isArray(state.initialized)
      || state.initialized.some(id => typeof id !== 'string')) {
      throw new AgentSkillError('用户 SKILL 预设初始化记录损坏', 500);
    }
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, initialized: [] };
    throw error;
  }
}

async function writeState(filename, state) {
  const temporary = filename + '.' + crypto.randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, JSON.stringify(state, null, 2));
    await fs.rename(temporary, filename);
  } finally { await fs.rm(temporary, { force: true }); }
}

async function copiedPresets(rootDirectory) {
  const copied = new Set();
  for (const entry of await fs.readdir(rootDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.name)) continue;
    try {
      const metadata = JSON.parse(await fs.readFile(path.join(rootDirectory, entry.name, 'metadata.json'), 'utf8'));
      if (typeof metadata.presetId === 'string' && metadata.slug === entry.name) copied.add(metadata.presetId);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return copied;
}

// Called under the user catalog's mutation queue. Completed entries remain recorded
// after deletion; a restart neither restores deleted skills nor overwrites edits.
export async function initializeUserSkillPresets({ rootDirectory, presetDirectory, install }) {
  if (presetDirectory === null) return;
  const sourceStat = await fs.lstat(presetDirectory);
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) throw new AgentSkillError('SKILL 预设根目录不能是链接');
  await fs.mkdir(rootDirectory, { recursive: true });
  const filename = path.join(rootDirectory, 'preset-state.json');
  const state = await readState(filename), completed = new Set(state.initialized);
  const copied = await copiedPresets(rootDirectory);
  const entries = await fs.readdir(presetDirectory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) throw new AgentSkillError('SKILL 预设目录不能是链接');
    if (!entry.isDirectory() || completed.has(entry.name)) continue;
    if (!copied.has(entry.name)) {
      const files = addInstructionManifest(await readFiles(path.join(presetDirectory, entry.name)));
      await install(files, CATEGORIES[entry.name] || '视频制作', entry.name);
    }
    completed.add(entry.name);
    await writeState(filename, { version: 1, initialized: [...completed] });
  }
}

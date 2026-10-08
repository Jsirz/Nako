import { PluginError } from '../../../modules/contracts/index.js';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { BUNDLED_MODULES_DIRECTORY } from './bundledPaths.js';
import { productionProfileForBundle } from '../../../modules/contracts/officialProductionProfiles.js';
import { OFFICIAL_DRAMA_BUNDLE, SKILL_INSTRUCTION_LIMITS } from '../../../modules/contracts/officialDramaBundle.js';
// Bundled resources use the configured application root shared with the model catalog.
const officialDirectory = path.join(BUNDLED_MODULES_DIRECTORY, 'agent', 'server', 'agent', 'builtin', 'minimax-drama-prompt');

function instructionError(message) {
  return new PluginError('INVALID_AGENT_SKILL_INSTRUCTIONS', message, { context: { moduleId: 'storage.agent-files', operation: 'readSkillInstructions' } });
}

export function parseSkillInstructionManifest(text) {
  if (text === undefined || text === null) return [];
  if (Buffer.byteLength(text, 'utf8') > SKILL_INSTRUCTION_LIMITS.manifestBytes) {
    throw instructionError('SKILL 参考清单超过大小限制');
  }
  let manifest;
  try { manifest = JSON.parse(text); } catch { throw instructionError('SKILL 参考清单不是有效 JSON'); }
  const references = manifest?.instructionReferences;
  if (!Array.isArray(references) || references.length > SKILL_INSTRUCTION_LIMITS.referenceCount) {
    throw instructionError('SKILL 参考清单必须显式声明文本文件');
  }
  for (const reference of references) {
    if (
      typeof reference !== 'string' || reference.length > 240 ||
      !/^(?:reference|references|templates|assets)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:md|txt)$/.test(reference)
    ) {
      throw instructionError('SKILL 只允许 reference/references/templates/assets 内明确声明的 Markdown 或文本参考');
    }
  }
  if (new Set(references.map((reference) => reference.toLowerCase())).size !== references.length) {
    throw instructionError('SKILL 参考清单不能包含重复文件');
  }
  return references;
}

async function readBoundedFile(directory, relative, limit, { optional = false } = {}) {
  const rootStat = await fs.lstat(directory);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw instructionError('SKILL 根目录不能是链接');
  }
  const realRoot = await fs.realpath(directory);
  let filename = directory;
  let expectedStat;
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index += 1) {
    filename = path.join(filename, parts[index]);
    let stat;
    try { stat = await fs.lstat(filename); } catch (error) {
      if (optional && error?.code === 'ENOENT') return null;
      throw instructionError('SKILL 声明的指令文件不存在或无法读取');
    }
    if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory())) {
      throw instructionError('SKILL 指令文件不能经过符号链接');
    }
    if (index === parts.length - 1 && (!stat.isFile() || stat.size > limit)) {
      throw instructionError('SKILL 指令文件不是常规文本或超过大小限制');
    }
    expectedStat = stat;
  }
  const realFilename = await fs.realpath(filename);
  const contained = path.relative(realRoot, realFilename);
  if (!contained || contained === '..' || contained.startsWith(`..${path.sep}`) || path.isAbsolute(contained)) {
    throw instructionError('SKILL 指令文件不能越出技能目录');
  }
  // Validate the opened file identity as well as its path. A concurrent replacement
  // must not turn a checked reference into a read through an outside symlink.
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile() || openedStat.size > limit ||
      openedStat.ino !== expectedStat.ino || openedStat.dev !== expectedStat.dev ||
      await fs.realpath(filename) !== realFilename
    ) throw instructionError('SKILL 指令文件在读取期间发生变化');
    const readLimit = Math.min(limit, openedStat.size);
    const buffer = Buffer.alloc(readLimit + 1);
    let bytes = 0;
    while (bytes <= readLimit) {
      const result = await handle.read(buffer, bytes, buffer.length - bytes, null);
      if (!result.bytesRead) break;
      bytes += result.bytesRead;
    }
    const content = buffer.subarray(0, bytes);
    if (bytes !== openedStat.size || content.includes(0)) {
      throw instructionError('SKILL 指令文件不是有效文本或超过大小限制');
    }
    return content.toString('utf8');
  } finally {
    await handle.close();
  }
}

// No recursive discovery, Markdown-link following, shell evaluation, or script execution.
export async function readSkillInstructionFiles(directory) {
  const limits = SKILL_INSTRUCTION_LIMITS;
  const root = await readBoundedFile(directory, 'SKILL.md', limits.rootBytes);
  if (!root.trim()) throw instructionError('SKILL.md 不能为空');
  const manifest = await readBoundedFile(directory, 'agent-skill.json', limits.manifestBytes, { optional: true });
  const references = parseSkillInstructionManifest(manifest);
  const sections = [root];
  let totalBytes = Buffer.byteLength(root, 'utf8');
  for (const reference of references) {
    const text = await readBoundedFile(directory, reference, limits.referenceBytes);
    totalBytes += Buffer.byteLength(text, 'utf8');
    if (totalBytes > limits.totalBytes) throw instructionError('SKILL 指令与参考合计超过 128 KB');
    sections.push(`### 参考文件：${reference}\n${text}`);
  }
  return sections.join('\n\n');
}

export async function readOfficialDramaInstructions(bundleId = 'minimax-drama') {
  const profile = productionProfileForBundle(bundleId);
  if (!profile) throw instructionError('官方制作组合不存在');
  const assets = "";
  if (profile.mode === 'assets') return (await readSkillInstructionFiles(path.join(BUNDLED_MODULES_DIRECTORY, 'agent', 'server', 'agent', 'builtin', 'minimax-fight-assets'))) + '\n\n' + assets;
  const instructions = (await readSkillInstructionFiles(officialDirectory)) + '\n\n' + assets;
  return profile.id === 'minimax-drama' ? instructions : instructions.replaceAll('2094859983199498241', profile.webAppId).replaceAll('低配文戏', '高配文戏');
}

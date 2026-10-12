import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentSkillError } from '../../../modules/contracts/agentSkillError.js';
import { skillCategory, SKILL_DESCRIPTION_MAX_LENGTH } from '../../../modules/contracts/skillCatalog.js';

export function parseSkillMetadata(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new AgentSkillError('技能 metadata.json 不是有效 JSON'); }
  if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120 ||
      typeof value.description !== 'string' || value.description.length > SKILL_DESCRIPTION_MAX_LENGTH) {
    throw new AgentSkillError('技能 metadata.json 的名称或简介无效');
  }
  return { name: value.name.trim(), description: value.description.trim(), category: skillCategory(value.category),
    openness: value.openness === 'closed' ? 'closed' : 'open',
    fileCount: Number.isSafeInteger(value.fileCount) ? value.fileCount : 0 };
}

export async function readSkillMetadata(directory) {
  const filename = path.join(directory, 'metadata.json');
  const [folder, file] = await Promise.all([fs.lstat(directory), fs.lstat(filename)]);
  if (!folder.isDirectory() || folder.isSymbolicLink() || !file.isFile() || file.isSymbolicLink()) {
    throw new AgentSkillError('技能元数据必须位于技能目录内且不能是链接');
  }
  return parseSkillMetadata(await fs.readFile(filename, 'utf8'));
}

// Read the scalar fields used by SKILL metadata, including YAML block scalars.
export function skillDisplayMetadata(fields) {
  return {
    name: String(fields['display-name'] || fields.name || '未命名技能').trim().slice(0, 120),
    description: String(fields['display-description'] || fields.description || '').trim().slice(0, SKILL_DESCRIPTION_MAX_LENGTH),
  };
}

export function skillFrontmatter(text) {
  const match = String(text).replace(/^\uFEFF/, '').match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/), fields = {};
  for (let index = 0; index < lines.length; index += 1) {
    const entry = lines[index].match(/^([A-Za-z][\w-]*):\s*(.+)$/);
    if (!entry) continue;
    const key = entry[1].toLowerCase(), value = entry[2].trim();
    if (/^[>|][-+]?$/.test(value)) {
      const block = [];
      while (index + 1 < lines.length && /^(?:\s|$)/.test(lines[index + 1])) {
        block.push(lines[++index]);
      }
      const indent = Math.min(...block.filter(line => line.trim()).map(line => line.match(/^\s*/)[0].length));
      fields[key] = block.map(line => line.slice(indent)).join(value[0] === '>' ? ' ' : '\n').trim();
    } else if (value.startsWith('"') && value.endsWith('"')) {
      try { fields[key] = JSON.parse(value); } catch { fields[key] = value.slice(1, -1); }
    } else {
      fields[key] = value.replace(/^'|'$/g, '').replaceAll("''", "'");
    }
  }
  return fields;
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { skillDisplayMetadata, skillFrontmatter } from './skillFrontmatter.js';

/** Inherit shipped display copy without rewriting user instructions or metadata. */
export async function presetSkillDisplay(presetDirectory, metadata) {
  const id = metadata.presetId;
  if (!presetDirectory || typeof id !== 'string' || !id ||
      /[\\/:\x00-\x1f]/.test(id) || ['.', '..'].includes(id)) return {};
  const directory = path.join(presetDirectory, id), filename = path.join(directory, 'SKILL.md');
  try {
    const [root, folder, file] = await Promise.all([
      fs.lstat(presetDirectory), fs.lstat(directory), fs.lstat(filename),
    ]);
    if (!root.isDirectory() || root.isSymbolicLink() || !folder.isDirectory() ||
        folder.isSymbolicLink() || !file.isFile() || file.isSymbolicLink()) return {};
    const fields = skillFrontmatter(await fs.readFile(filename, 'utf8'));
    const display = skillDisplayMetadata(fields);
    // Only replace the original defaults; individually edited fields remain the user's choice.
    return {
      ...(fields['display-name'] && metadata.name === String(fields.name || '').trim().slice(0, 120)
        ? { name: display.name } : {}),
      ...(fields['display-description'] && metadata.description === String(fields.description || '').trim().slice(0, 500)
        ? { description: display.description } : {}),
    };
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return {};
    throw error;
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';

/** Preset artwork is inherited at read time; user skill copies are never rewritten. */
export async function resolvePresetSkillCover(presetDirectory, presetId) {
  if (!presetDirectory || typeof presetId !== 'string' || !presetId ||
      /[\\/:\x00-\x1f]/.test(presetId) || ['.', '..'].includes(presetId)) return null;
  const directory = path.join(presetDirectory, presetId);
  const filename = path.join(directory, 'cover.webp');
  try {
    const [root, folder, file] = await Promise.all([
      fs.lstat(presetDirectory), fs.lstat(directory), fs.lstat(filename),
    ]);
    if (!root.isDirectory() || root.isSymbolicLink() || !folder.isDirectory() ||
        folder.isSymbolicLink() || !file.isFile() || file.isSymbolicLink()) return null;
    return filename;
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  }
}

export async function readPresetSkillCover(presetDirectory, presetId) {
  const filename = await resolvePresetSkillCover(presetDirectory, presetId);
  return filename ? { content: await fs.readFile(filename), contentType: 'image/webp' } : null;
}

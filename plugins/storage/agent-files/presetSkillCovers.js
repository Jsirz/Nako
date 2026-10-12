import fs from 'node:fs/promises';
import path from 'node:path';

const COVER_CONTENT_TYPES = {
  '.gif': 'image/gif', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
};

/** Official artwork is read from the bundled directory without copying user files. */
export async function resolvePresetSkillCover(presetDirectory, presetId) {
  if (!presetDirectory || typeof presetId !== 'string' || !presetId ||
      /[\\/:\x00-\x1f]/.test(presetId) || ['.', '..'].includes(presetId)) return null;
  const directory = path.join(presetDirectory, presetId);
  try {
    const [root, folder] = await Promise.all([
      fs.lstat(presetDirectory), fs.lstat(directory),
    ]);
    if (!root.isDirectory() || root.isSymbolicLink() || !folder.isDirectory() ||
        folder.isSymbolicLink()) return null;
    const names = await fs.readdir(directory);
    const name = Object.keys(COVER_CONTENT_TYPES).map(extension => `cover${extension}`).find(value => names.includes(value));
    if (!name) return null;
    const filename = path.join(directory, name), file = await fs.lstat(filename);
    return file.isFile() && !file.isSymbolicLink() ? filename : null;
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  }
}

export async function readPresetSkillCover(presetDirectory, presetId) {
  const filename = await resolvePresetSkillCover(presetDirectory, presetId);
  return filename ? { content: await fs.readFile(filename), contentType: COVER_CONTENT_TYPES[path.extname(filename)] } : null;
}

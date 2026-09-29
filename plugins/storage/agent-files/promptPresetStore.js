import crypto from 'node:crypto';
import fs from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
const EMPTY_PRESETS = { text: [], image: [], video: [], audio: [] };
class PromptPresetError extends Error {
  constructor(message, status = 400, code = 'INVALID_PROMPT_PRESET') {
    super(message);
    this.name = 'PromptPresetError';
    this.status = status;
    this.code = code;
  }
}

async function writeJsonAtomic(filePath, data) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`,
  );
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(filePath)) {
      await copyFile(filePath, `${filePath}.bak`);
    }
    try {
      await rename(temporaryPath, filePath);
    } catch (error) {
      if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error;
      await copyFile(temporaryPath, filePath);
    }
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function readOrInitializeConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    await mkdir(path.dirname(configPath), { recursive: true });
    try {
      await writeFile(configPath, JSON.stringify(EMPTY_PRESETS, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  let data;
  try {
    data = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new PromptPresetError(
        '提示词预设配置格式无效，请先修复或恢复该文件。',
        500,
        'INVALID_PROMPT_PRESET_CONFIG',
      );
    }
    throw error;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new PromptPresetError('提示词预设配置格式无效', 500, 'INVALID_PROMPT_PRESET_CONFIG');
  }
  return data;
}

function localPreviewPath(libraryDirectory, previewUrl) {
  const prefix = '/library/prompts/previews/';
  if (typeof previewUrl !== 'string' || !previewUrl.startsWith(prefix)) return null;
  const filename = decodeURIComponent(previewUrl.slice(prefix.length));
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    return null;
  }
  return path.join(libraryDirectory, 'prompts', 'previews', filename);
}

export function createPromptPresetStore({ libraryDirectory }) {
  const configPath = path.join(libraryDirectory, 'prompts', 'prompt.json'),
    creativePath = path.join(libraryDirectory, 'prompts', 'creative-library.json');
  let queue = Promise.resolve();
  return {
    mutate(operation) {
      const next = queue.then(operation, operation);
      queue = next.catch(() => {});
      return next;
    },
    readConfig: () => readOrInitializeConfig(configPath),
    saveConfig: (data) => writeJsonAtomic(configPath, data),
    async readCreativeLibrary() {
      try {
        return JSON.parse(await readFile(creativePath, 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') return { favorites: [], custom: [] };
        throw error;
      }
    },
    saveCreativeLibrary: (data) => writeJsonAtomic(creativePath, data),
    async savePreview(preview) {
      const filename = crypto.randomUUID() + '.' + preview.extension;
      const target = path.join(libraryDirectory, 'prompts', 'previews', filename);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, preview.buffer, { flag: 'wx' });
      return '/library/prompts/previews/' + filename;
    },
    async removePreview(url) {
      const target = localPreviewPath(libraryDirectory, url);
      if (target) await rm(target, { force: true });
    },
  };
}

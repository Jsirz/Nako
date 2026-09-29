import fs from 'node:fs';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';

export const ARCHIVE_FORMAT = 'nako-project';

export const LIBRARY_ARCHIVE_FORMAT = 'nako-library';

export const ARCHIVE_VERSION = 1;

export const DEFAULT_MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024;

export const DEFAULT_MAX_ARCHIVE_ENTRIES = 20_000;

export class ProjectTransferError extends Error {
  constructor(message, status = 400, code = 'INVALID_PROJECT_ARCHIVE') {
    super(message);
    this.name = 'ProjectTransferError';
    this.status = status;
    this.code = code;
  }
}

export function sanitizeDownloadName(value) {
  return (
    String(value || 'project')
      // eslint-disable-next-line no-control-regex -- Deliberately reject or strip control characters.
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .trim() || 'project'
  );
}

export function normalizeArchivePath(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/\/+$/, '');
}

export function isAllowedArchiveEntry(entryPath) {
  const normalized = normalizeArchivePath(entryPath);
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false;
  if (normalized.split('/').some((part) => part === '..' || part === '')) return false;
  return (
    normalized === 'manifest.json' ||
    normalized === 'agent.json' ||
    normalized === 'workflow.json' ||
    normalized === 'media' ||
    normalized.startsWith('media/')
  );
}

export function isAllowedLibraryArchiveEntry(entryPath) {
  const normalized = normalizeArchivePath(entryPath);
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false;
  if (normalized.split('/').some((part) => part === '..' || part === '')) return false;
  return (
    normalized === 'manifest.json' ||
    normalized === 'agent.json' ||
    normalized === 'catalog.json' ||
    normalized === 'files' ||
    normalized === 'files/media' ||
    normalized.startsWith('files/media/') ||
    normalized === 'files/assets' ||
    normalized.startsWith('files/assets/') ||
    normalized === 'files/prompts' ||
    normalized.startsWith('files/prompts/') ||
    normalized === 'files/workflows' ||
    normalized.startsWith('files/workflows/')
  );
}

export function isAllowedArchiveType(type) {
  return type === 'File' || type === 'Directory';
}

export function isSafePathSegment(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 255 &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('\0')
  );
}

export function validateLibraryCatalog(manifest, catalog) {
  if (!Array.isArray(catalog?.workflows) || !Array.isArray(catalog?.folders)) {
    throw new ProjectTransferError('整库备份目录无效');
  }
  if (
    Number(manifest?.workflowCount) !== catalog.workflows.length ||
    Number(manifest?.folderCount) !== catalog.folders.length
  ) {
    throw new ProjectTransferError('整库备份清单数量与目录不一致');
  }

  const folderIds = new Set();
  for (const folder of catalog.folders) {
    if (!folder || typeof folder !== 'object' || Array.isArray(folder) || !folder.id) {
      throw new ProjectTransferError('整库备份包含无效文件夹');
    }
    if (folderIds.has(folder.id)) {
      throw new ProjectTransferError(`整库备份包含重复文件夹标识：${folder.id}`);
    }
    folderIds.add(folder.id);
  }
  for (const folder of catalog.folders) {
    if (folder.parentId && !folderIds.has(folder.parentId)) {
      throw new ProjectTransferError(`整库备份文件夹的父级不存在：${folder.id}`);
    }
  }

  const workflowIds = new Set();
  for (const workflow of catalog.workflows) {
    if (
      !workflow ||
      typeof workflow !== 'object' ||
      Array.isArray(workflow) ||
      !isSafePathSegment(workflow.id) ||
      !Array.isArray(workflow.nodes) ||
      !Array.isArray(workflow.groups)
    ) {
      throw new ProjectTransferError('整库备份包含无效工作流');
    }
    if (workflowIds.has(workflow.id)) {
      throw new ProjectTransferError(`整库备份包含重复工作流标识：${workflow.id}`);
    }
    if (workflow.folderId && !folderIds.has(workflow.folderId)) {
      throw new ProjectTransferError(`整库备份工作流的文件夹不存在：${workflow.id}`);
    }
    workflowIds.add(workflow.id);
  }
}

export async function copyNewTree(sourceDirectory, targetDirectory, createdPaths) {
  if (!fs.existsSync(sourceDirectory)) return;
  if (!fs.existsSync(targetDirectory)) {
    await mkdir(targetDirectory, { recursive: true });
    createdPaths.push(targetDirectory);
  }

  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyNewTree(sourcePath, targetPath, createdPaths);
    } else if (entry.isFile() && !fs.existsSync(targetPath)) {
      await cp(sourcePath, targetPath, { force: false, errorOnExist: true });
      createdPaths.push(targetPath);
    }
  }
}

export async function removeCreatedPaths(createdPaths) {
  const uniquePaths = [...new Set(createdPaths)].sort((a, b) => b.length - a.length);
  for (const createdPath of uniquePaths) {
    await rm(createdPath, { recursive: true, force: true });
  }
}

export function rewriteProjectMediaReferences(value, sourceId, targetId) {
  if (typeof value === 'string') {
    return value.replaceAll(`/library/media/${sourceId}/`, `/library/media/${targetId}/`);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteProjectMediaReferences(item, sourceId, targetId));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      rewriteProjectMediaReferences(item, sourceId, targetId),
    ]),
  );
}

export async function receiveArchive(request, archivePath, maxArchiveBytes) {
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > maxArchiveBytes) {
    throw new ProjectTransferError('项目备份文件过大', 413, 'ARCHIVE_TOO_LARGE');
  }

  let receivedBytes = 0;
  const sizeGuard = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxArchiveBytes) {
        callback(new ProjectTransferError('项目备份文件过大', 413, 'ARCHIVE_TOO_LARGE'));
        return;
      }
      callback(null, chunk);
    },
  });

  await pipeline(request, sizeGuard, fs.createWriteStream(archivePath, { flags: 'wx' }));
  if (receivedBytes === 0) {
    throw new ProjectTransferError('项目备份文件为空');
  }
}

export async function statLocalArchive(value, maxArchiveBytes) {
  if (typeof value !== 'string' || !value || value.includes('\0') || !path.isAbsolute(value)) {
    throw new ProjectTransferError('项目备份路径无效', 400, 'ARCHIVE_PATH_INVALID');
  }
  let stats;
  try {
    stats = await stat(value);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      throw new ProjectTransferError('项目备份文件不存在', 404, 'ARCHIVE_NOT_FOUND');
    }
    throw new ProjectTransferError('无法读取项目备份文件');
  }
  if (!stats.isFile())
    throw new ProjectTransferError('项目备份路径不是文件', 400, 'ARCHIVE_PATH_INVALID');
  if (stats.size > maxArchiveBytes) {
    throw new ProjectTransferError('项目备份文件过大', 413, 'ARCHIVE_TOO_LARGE');
  }
  if (stats.size === 0) throw new ProjectTransferError('项目备份文件为空');
  return value;
}

export async function validateArchive(
  archivePath,
  maxArchiveEntries,
  {
    isAllowedEntry = isAllowedArchiveEntry,
    requiredEntries = ['manifest.json', 'workflow.json'],
    label = '项目备份',
  } = {},
) {
  let entryCount = 0;
  let validationError = null;
  const seenEntries = new Set();

  try {
    await tar.list({
      file: archivePath,
      strict: true,
      onentry(entry) {
        entryCount += 1;
        const entryPath = normalizeArchivePath(entry.path);
        if (
          !validationError &&
          entryPath === 'agent.json' &&
          (entry.type !== 'File' || entry.size > 32 * 1024 * 1024)
        ) {
          validationError = new ProjectTransferError('聊天记录文件无效或超过 32 MB');
        } else if (!validationError && entryCount > maxArchiveEntries) {
          validationError = new ProjectTransferError(
            '项目备份文件包含过多文件',
            413,
            'TOO_MANY_ENTRIES',
          );
        } else if (
          !validationError &&
          (!isAllowedEntry(entryPath) || !isAllowedArchiveType(entry.type))
        ) {
          validationError = new ProjectTransferError(`${label}包含不安全条目：${entryPath}`);
        } else if (!validationError && seenEntries.has(entryPath)) {
          validationError = new ProjectTransferError(`${label}包含重复条目：${entryPath}`);
        }
        seenEntries.add(entryPath);
      },
    });
  } catch (error) {
    if (error instanceof ProjectTransferError) throw error;
    throw new ProjectTransferError('无法读取项目备份文件');
  }

  if (validationError) throw validationError;

  const missingEntries = requiredEntries.filter((entry) => !seenEntries.has(entry));
  if (missingEntries.length > 0) {
    throw new ProjectTransferError(`${label}缺少 ${missingEntries.join(' 或 ')}`);
  }
}

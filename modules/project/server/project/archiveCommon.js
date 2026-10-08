import { ProjectTransferError } from '../../../contracts/projectErrors.js';
export { ProjectTransferError } from '../../../contracts/projectErrors.js';

export const ARCHIVE_FORMAT = 'nako-project';

export const LIBRARY_ARCHIVE_FORMAT = 'nako-library';

export const ARCHIVE_VERSION = 1;

export const DEFAULT_MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024;

export const DEFAULT_MAX_ARCHIVE_ENTRIES = 20_000;


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

export const copyNewTree = (files, source, target, created) => files.copyNewTree(source, target, created);
export const removeCreatedPaths = (files, created) => files.removeCreatedPaths(created);

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

export const receiveArchive = (files, request, archivePath, limit) => files.receiveArchive(request, archivePath, limit);
export const statLocalArchive = (files, value, limit) => files.statLocalArchive(value, limit);
export function validateArchive(files, archivePath, limit, {
  isAllowedEntry = isAllowedArchiveEntry,
  requiredEntries = ['manifest.json', 'workflow.json'],
  label = '项目备份',
} = {}) {
  return files.validateArchive(archivePath, limit, { isAllowedEntry, requiredEntries, label });
}

import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { ERRORS, PluginError } from '../../../modules/contracts/index.js';

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
function exposed(operation) {
  return new PluginError(ERRORS.permission, '执行记录私有存储不能位于 /library 静态目录内', {
    context: { moduleId: 'storage.agent-files', operation },
  });
}
export function resolvePrivateStorageDirectory({ libraryDirectory, storageDirectory }) {
  if (!libraryDirectory) throw new PluginError(ERRORS.invalidConfiguration, '私有存储缺少 libraryDirectory', {
    context: { moduleId: 'storage.agent-files', operation: 'resolvePrivateStorage' },
  });
  const libraryRoot = path.resolve(libraryDirectory);
  const privateRoot = path.resolve(storageDirectory);
  if (isInside(libraryRoot, privateRoot)) throw exposed('resolvePrivateStorage');
  return privateRoot;
}
export async function assertPrivateStorageDirectory({ libraryDirectory, storageDirectory }) {
  const [libraryRoot, privateRoot] = await Promise.all([
    realpath(libraryDirectory).catch(() => path.resolve(libraryDirectory)),
    realpath(storageDirectory).catch(() => path.resolve(storageDirectory)),
  ]);
  if (isInside(libraryRoot, privateRoot)) throw exposed('assertPrivateStorage');
}

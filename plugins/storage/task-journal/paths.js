import { ERRORS, PluginError } from '../../../modules/contracts/index.js';
import path from 'node:path';
function isInsideOrEqual(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveGenerationRuntimePaths({ libraryDirectory, privateDirectory }) {
  if (!libraryDirectory) throw new PluginError(ERRORS.invalidConfiguration, 'Generation runtime requires libraryDirectory', { context: { moduleId: 'storage.task-journal', operation: 'resolvePaths' } });
  const libraryRoot = path.resolve(libraryDirectory);
  const privateRoot = path.resolve(
    privateDirectory || path.join(path.dirname(libraryRoot), 'private', 'generation'),
  );
  if (isInsideOrEqual(libraryRoot, privateRoot)) {
    throw new PluginError('GENERATION_STORAGE_EXPOSED', '生成任务私有存储不能位于 /library 静态目录内', {
      context: { moduleId: 'storage.task-journal', operation: 'resolvePaths' }
    });
  }
  return {
    privateJournalPath: path.join(privateRoot, 'generation-tasks.json'),
  };
}


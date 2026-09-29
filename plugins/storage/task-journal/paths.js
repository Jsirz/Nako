import path from 'node:path';
function isInsideOrEqual(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveGenerationRuntimePaths({ libraryDirectory, privateDirectory }) {
  if (!libraryDirectory) throw new Error('Generation runtime requires libraryDirectory');
  const libraryRoot = path.resolve(libraryDirectory);
  const privateRoot = path.resolve(
    privateDirectory || path.join(path.dirname(libraryRoot), 'private', 'generation'),
  );
  if (isInsideOrEqual(libraryRoot, privateRoot)) {
    throw Object.assign(new Error('生成任务私有存储不能位于 /library 静态目录内'), {
      code: 'GENERATION_STORAGE_EXPOSED',
    });
  }
  return {
    privateJournalPath: path.join(privateRoot, 'generation-tasks.json'),
  };
}


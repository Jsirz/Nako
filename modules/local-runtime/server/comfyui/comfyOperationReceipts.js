import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function createComfyOperationReceipts(libraryDirectory) {
  const directory = path.join(libraryDirectory, 'comfy-operations');
  const file = (projectId, operationId) =>
    path.join(directory, projectId, `${operationId}.json`);

  async function read(projectId, operationId) {
    try {
      return JSON.parse(await readFile(file(projectId, operationId), 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async function write(projectId, operationId, value) {
    const target = file(projectId, operationId);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(value), 'utf8');
    await rename(temporary, target);
  }

  return { read, write };
}

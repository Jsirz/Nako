import crypto from 'node:crypto';
import path from 'node:path';
import { writeAgentHistories, readAgentHistories } from './archiveHistory.js';
import {
  LIBRARY_ARCHIVE_FORMAT,
  ARCHIVE_VERSION,
  ProjectTransferError,
  isAllowedLibraryArchiveEntry,
  isAllowedArchiveType,
  validateLibraryCatalog,
  copyNewTree,
  removeCreatedPaths,
  rewriteProjectMediaReferences,
  validateArchive,
} from './archiveCommon.js';

export async function createLibraryArchive({ store, directories, libraryDirectory, agentArchive, files }) {
  const temporaryDirectory = await files.createTemporaryDirectory('nako-library-backup-');
  const stagingDirectory = path.join(temporaryDirectory, 'staging');
  const filesDirectory = path.join(stagingDirectory, 'files');
  const archivePath = path.join(temporaryDirectory, 'library.nako-library');

  try {
    await files.mkdir(filesDirectory, { recursive: true });
    const summaries = await store.list();
    const catalog = {
      workflows: (await Promise.all(summaries.map(item => store.get(item.id)))).filter(Boolean),
      folders: await directories.listFolders(),
    };
    await files.writeText(
      path.join(stagingDirectory, 'manifest.json'),
      JSON.stringify(
        {
          format: LIBRARY_ARCHIVE_FORMAT,
          version: ARCHIVE_VERSION,
          createdAt: new Date().toISOString(),
          workflowCount: catalog.workflows.length,
          folderCount: catalog.folders.length,
        },
        null,
        2,
      ),
    );
    await files.writeText(
      path.join(stagingDirectory, 'catalog.json'),
      JSON.stringify(catalog, null, 2),
    );

    const historyEntries = await writeAgentHistories(
      files,
      stagingDirectory,
      catalog.workflows.map((item) => item.id),
      agentArchive,
    );
    for (const directoryName of ['media', 'assets', 'prompts', 'workflows']) {
      const sourceDirectory = path.join(libraryDirectory, directoryName);
      if (!files.exists(sourceDirectory)) continue;
      await files.copy(sourceDirectory, path.join(filesDirectory, directoryName), {
        recursive: true,
        filter(sourcePath) {
          const relativePath = path.relative(sourceDirectory, sourcePath);
          return !relativePath.split(path.sep).includes('.thumbnails');
        },
      });
    }

    const entries = ['manifest.json', 'catalog.json'];
    entries.push(...historyEntries);
    if (files.exists(filesDirectory)) entries.push('files');
    await files.createArchive(
      {
        cwd: stagingDirectory,
        file: archivePath,
        gzip: true,
        portable: true,
      },
      entries,
    );
    return { archivePath, temporaryDirectory };
  } catch (error) {
    await files.remove(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function readLibraryArchive({ archivePath, extractionDirectory, maxArchiveEntries, files }) {
  await validateArchive(files, archivePath, maxArchiveEntries, {
    isAllowedEntry: isAllowedLibraryArchiveEntry,
    requiredEntries: ['manifest.json', 'catalog.json'],
    label: '整库备份',
  });
  await files.mkdir(extractionDirectory, { recursive: true });
  try {
    await files.extractArchive({
      cwd: extractionDirectory,
      file: archivePath,
      preservePaths: false,
      strict: true,
      filter(entryPath, entry) {
        return isAllowedLibraryArchiveEntry(entryPath) && isAllowedArchiveType(entry.type);
      },
    });
  } catch {
    throw new ProjectTransferError('整库备份解压失败');
  }

  let manifest;
  let catalog;
  try {
    manifest = JSON.parse(await files.readText(path.join(extractionDirectory, 'manifest.json')));
    catalog = JSON.parse(await files.readText(path.join(extractionDirectory, 'catalog.json')));
  } catch {
    throw new ProjectTransferError('整库备份中的 JSON 已损坏');
  }
  if (manifest?.format !== LIBRARY_ARCHIVE_FORMAT || manifest?.version !== ARCHIVE_VERSION) {
    throw new ProjectTransferError('不支持的 Nako 整库备份版本');
  }
  validateLibraryCatalog(manifest, catalog);
  return { catalog, manifest };
}

export async function restoreLibraryArchive({
  archivePath,
  extractionDirectory,
  store,
  directories,
  transactions,
  files,
  libraryDirectory,
  mediaDirectory,
  writeSnapshot,
  sanitizeNodes,
  syncFolderProjectCounts,
  maxArchiveEntries,
  agentArchive,
}) {
  const { catalog } = await readLibraryArchive({
    archivePath,
    extractionDirectory,
    maxArchiveEntries,
    files,
  });
  const histories = await readAgentHistories(
    files,
    extractionDirectory,
    catalog.workflows.map((item) => item.id),
    agentArchive,
  );
  const { folderIdMap, restoredWorkflows, collisionCount } = await planLibraryRestore(
    catalog,
    store,
    mediaDirectory,
    directories,
    files,
  );

  const archivedFilesDirectory = path.join(extractionDirectory, 'files');
  const createdPaths = [];
  const rollbackHistories = [];
  try {
    for (const directoryName of ['assets', 'prompts', 'workflows']) {
      await copyNewTree(
        files,
        path.join(archivedFilesDirectory, directoryName),
        path.join(libraryDirectory, directoryName),
        createdPaths,
      );
    }

    for (const { archivedWorkflow, targetId } of restoredWorkflows) {
      const sourceProjectMedia = path.join(archivedFilesDirectory, 'media', archivedWorkflow.id);
      const targetProjectMedia = path.join(mediaDirectory, targetId);
      if (files.exists(sourceProjectMedia)) {
        await files.copy(sourceProjectMedia, targetProjectMedia, {
          recursive: true,
          force: false,
          errorOnExist: true,
        });
        createdPaths.push(targetProjectMedia);
      } else if (!files.exists(targetProjectMedia)) {
        // 快照写入器可能创建该目录；失败回滚时也必须清理。
        createdPaths.push(targetProjectMedia);
      }
    }

    await transactions.runInTransaction(async () => {
      for (const folder of catalog.folders) {
        await directories.saveFolder({
          ...folder,
          id: folderIdMap.get(folder.id),
          parentId: folder.parentId ? folderIdMap.get(folder.parentId) || null : null,
          projectCount: 0,
        });
      }

      for (const { restoredWorkflow, archivedWorkflow } of restoredWorkflows) {
        restoredWorkflow.nodes = sanitizeNodes(restoredWorkflow.nodes, restoredWorkflow.id);
        const result = await store.save(restoredWorkflow);
        if (histories.has(archivedWorkflow.id) && agentArchive)
          rollbackHistories.push(
            await agentArchive.importProject(histories.get(archivedWorkflow.id), result.id),
          );
        const savedWorkflow = await store.get(result.id);
        if (savedWorkflow) await writeSnapshot(savedWorkflow);
      }
      await syncFolderProjectCounts();
    });
  } catch (error) {
    for (const rollback of rollbackHistories.reverse()) await rollback();
    await removeCreatedPaths(files, createdPaths);
    throw error;
  }
  return {
    workflowCount: catalog.workflows.length,
    folderCount: catalog.folders.length,
    collisionCount,
  };
}

async function planLibraryRestore(catalog, store, mediaDirectory, directories, files) {
  const existingFolders = await directories.listFolders();
  const existingWorkflows = await store.list();
  const existingFolderIds = new Set(existingFolders.map((folder) => folder.id));
  const existingWorkflowIds = new Set(existingWorkflows.map((workflow) => workflow.id));
  const folderIdMap = new Map();
  const workflowIdMap = new Map();

  for (const folder of catalog.folders) {
    if (!folder?.id) throw new ProjectTransferError('整库备份包含无效文件夹');
    folderIdMap.set(folder.id, existingFolderIds.has(folder.id) ? crypto.randomUUID() : folder.id);
  }
  for (const workflow of catalog.workflows) {
    if (!workflow?.id) throw new ProjectTransferError('整库备份包含无效工作流');
    const mediaCollision = files.exists(path.join(mediaDirectory, workflow.id));
    workflowIdMap.set(
      workflow.id,
      existingWorkflowIds.has(workflow.id) || mediaCollision ? crypto.randomUUID() : workflow.id,
    );
  }

  let collisionCount = 0;
  const restoredWorkflows = catalog.workflows.map((archivedWorkflow) => {
    const targetId = workflowIdMap.get(archivedWorkflow.id);
    const collision = targetId !== archivedWorkflow.id;
    if (collision) collisionCount += 1;
    const restoredWorkflow = rewriteProjectMediaReferences(
      archivedWorkflow,
      archivedWorkflow.id,
      targetId,
    );
    restoredWorkflow.id = targetId;
    restoredWorkflow.revision = 0;
    restoredWorkflow.folderId = archivedWorkflow.folderId
      ? folderIdMap.get(archivedWorkflow.folderId) || null
      : null;
    restoredWorkflow.status = 'work';
    if (collision) {
      restoredWorkflow.title = `${restoredWorkflow.title || 'Untitled'}（迁移副本）`;
    }
    return { archivedWorkflow, restoredWorkflow, targetId };
  });

  return { folderIdMap, restoredWorkflows, collisionCount };
}

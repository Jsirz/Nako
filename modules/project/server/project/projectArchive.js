import crypto from 'node:crypto';
import path from 'node:path';
import { resetSharedProject, validateSharedProject } from './sharedProject.js';
import { writeAgentHistories, readAgentHistories } from './archiveHistory.js';
import {
  ARCHIVE_FORMAT,
  ARCHIVE_VERSION,
  ProjectTransferError,
  isAllowedArchiveEntry,
  isAllowedArchiveType,
  isSafePathSegment,
  rewriteProjectMediaReferences,
  validateArchive,
} from './archiveCommon.js';

export async function createProjectArchive({ workflow, mediaDirectory, agentArchive, files }) {
  const temporaryDirectory = await files.createTemporaryDirectory('nako-project-backup-');
  const stagingDirectory = path.join(temporaryDirectory, 'staging');
  const archivePath = path.join(temporaryDirectory, 'project.nako');

  try {
    await files.mkdir(stagingDirectory, { recursive: true });
    await files.writeText(
      path.join(stagingDirectory, 'manifest.json'),
      JSON.stringify(
        {
          format: ARCHIVE_FORMAT,
          version: ARCHIVE_VERSION,
          createdAt: new Date().toISOString(),
          project: { id: workflow.id, title: workflow.title || 'Untitled' },
        },
        null,
        2,
      ),
    );
    await files.writeText(
      path.join(stagingDirectory, 'workflow.json'),
      JSON.stringify(workflow, null, 2),
    );

    const historyEntries = await writeAgentHistories(files, stagingDirectory, [workflow.id], agentArchive);
    const sourceMediaDirectory = path.join(mediaDirectory, workflow.id);
    if (files.exists(sourceMediaDirectory)) {
      await files.copy(sourceMediaDirectory, path.join(stagingDirectory, 'media'), { recursive: true });
    }

    const entries = ['manifest.json', 'workflow.json'];
    entries.push(...historyEntries);
    if (files.exists(path.join(stagingDirectory, 'media'))) entries.push('media');
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

export async function readProjectArchive({ archivePath, extractionDirectory, maxArchiveEntries, files }) {
  await validateArchive(files, archivePath, maxArchiveEntries);
  await files.mkdir(extractionDirectory, { recursive: true });
  try {
    await files.extractArchive({
      cwd: extractionDirectory,
      file: archivePath,
      preservePaths: false,
      strict: true,
      filter(entryPath, entry) {
        return isAllowedArchiveEntry(entryPath) && isAllowedArchiveType(entry.type);
      },
    });
  } catch {
    throw new ProjectTransferError('项目备份解压失败');
  }

  return readProjectArchiveDocument({ extractionDirectory, files });
}

export async function readProjectArchiveDocument({ extractionDirectory, files }) {
  let manifest;
  let workflow;
  try {
    manifest = JSON.parse(await files.readText(path.join(extractionDirectory, 'manifest.json')));
    workflow = JSON.parse(await files.readText(path.join(extractionDirectory, 'workflow.json')));
  } catch {
    throw new ProjectTransferError('项目备份中的 JSON 已损坏');
  }

  if (manifest?.format !== ARCHIVE_FORMAT || manifest?.version !== ARCHIVE_VERSION) {
    throw new ProjectTransferError('不支持的 Nako 项目备份版本');
  }
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    throw new ProjectTransferError('项目备份中的工作流无效');
  }
  if (!isSafePathSegment(workflow.id) || manifest?.project?.id !== workflow.id) {
    throw new ProjectTransferError('项目备份标识不一致');
  }
  try {
    validateSharedProject(workflow);
  } catch (error) {
    throw new ProjectTransferError(error.message);
  }

  return { manifest, workflow };
}

export async function restoreProjectArchive({
  archivePath,
  extractionDirectory,
  store,
  transactions,
  files,
  mediaDirectory,
  writeSnapshot,
  sanitizeNodes,
  syncFolderProjectCounts,
  maxArchiveEntries,
  agentArchive,
  copy = false,
}) {
  const { workflow: archivedWorkflow } = await readProjectArchive({
    archivePath,
    extractionDirectory,
    maxArchiveEntries,
    files,
  });
  const sourceId = archivedWorkflow.id;
  const histories = await readAgentHistories(files, extractionDirectory, [sourceId], agentArchive);
  const sourceMediaDirectory = path.join(extractionDirectory, 'media');
  const idExists = Boolean(await store.get(sourceId));
  const mediaExists = files.exists(path.join(mediaDirectory, sourceId));
  const collision = idExists || mediaExists;
  const targetId = copy || collision ? crypto.randomUUID() : sourceId;
  const targetMediaDirectory = path.join(mediaDirectory, targetId);
  const restoredWorkflow = rewriteProjectMediaReferences(
    copy ? resetSharedProject(archivedWorkflow, targetId) : archivedWorkflow,
    sourceId,
    targetId,
  );
  restoredWorkflow.id = targetId;
  restoredWorkflow.revision = 0;
  restoredWorkflow.folderId = null;
  restoredWorkflow.status = 'work';
  if (collision)
    restoredWorkflow.title = `${restoredWorkflow.title || 'Untitled'}（${copy ? '导入' : '恢复'}副本）`;

  let rollbackHistory;
  try {
    if (files.exists(sourceMediaDirectory)) {
      await files.copy(sourceMediaDirectory, targetMediaDirectory, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
    }

    const result = await transactions.runInTransaction(async () => {
      restoredWorkflow.nodes = sanitizeNodes(restoredWorkflow.nodes, restoredWorkflow.id);
      const result = await store.save(restoredWorkflow);
      if (histories.has(sourceId) && agentArchive)
        rollbackHistory = await agentArchive.importProject(histories.get(sourceId), result.id);
      const savedWorkflow = await store.get(result.id);
      if (savedWorkflow) await writeSnapshot(savedWorkflow);
      await syncFolderProjectCounts();
      return result;
    });
    return { id: result.id, revision: result.revision, sourceId, collision };
  } catch (error) {
    try {
      await rollbackHistory?.();
    } finally {
      await files.remove(targetMediaDirectory, { recursive: true, force: true });
    }
    throw error;
  }
}

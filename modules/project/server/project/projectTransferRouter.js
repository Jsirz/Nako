import crypto from 'node:crypto';
import path from 'node:path';
import { createModuleLogger } from '../../../kernel/logger.js';
import express from 'express';
import {
  DEFAULT_MAX_ARCHIVE_BYTES,
  DEFAULT_MAX_ARCHIVE_ENTRIES,
  ProjectTransferError,
  sanitizeDownloadName,
  receiveArchive,
  statLocalArchive,
} from './archiveCommon.js';
import { createProjectArchive, readProjectArchive, restoreProjectArchive } from './projectArchive.js';
import { createLibraryArchive, restoreLibraryArchive } from './libraryArchive.js';
import { PROJECT_ERRORS } from '../../../contracts/projectErrors.js';

export function createProjectTransferRouter({
  store,
  directories,
  transactions,
  files,
  showcaseArchives,
  libraryDirectory,
  mediaDirectory,
  writeSnapshot,
  sanitizeNodes,
  syncFolderProjectCounts,
  maxArchiveBytes = DEFAULT_MAX_ARCHIVE_BYTES,
  maxArchiveEntries = DEFAULT_MAX_ARCHIVE_ENTRIES,
  logger = createModuleLogger('project.transfer'),
  getAgentArchive = () => undefined,
}) {
  const router = express.Router();
  const archivePathJson = express.json({ limit: '16kb', strict: true });
  const archivePreviews = new Map();
  const resolvedLibraryDirectory = libraryDirectory || path.dirname(mediaDirectory);
  const options = {
    store,
    directories,
    transactions,
    files,
    showcaseArchives,
    libraryDirectory,
    mediaDirectory,
    writeSnapshot,
    sanitizeNodes,
    syncFolderProjectCounts,
    maxArchiveBytes,
    maxArchiveEntries,
    logger,
    getAgentArchive,
    archivePathJson,
    archivePreviews,
    resolvedLibraryDirectory,
  };
  attachLibraryRoutes(router, options);
  attachJsonImportRoutes(router, options);
  attachPreviewRoutes(router, options);
  attachRestoreRoutes(router, options);
  attachDuplicateRoutes(router, options);
  attachBackupRoutes(router, options);
  attachJsonExportRoutes(router, options);
  return router;
}

function rewritePreviewMedia(value, projectId, previewId) {
  if (typeof value === 'string') {
    const prefix = `/library/media/${projectId}/`;
    return value.startsWith(prefix)
      ? `/api/workflows/previews/${previewId}/media/${value.slice(prefix.length)}`
      : value;
  }
  if (Array.isArray(value)) return value.map((item) => rewritePreviewMedia(item, projectId, previewId));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewritePreviewMedia(item, projectId, previewId)]));
  return value;
}

function attachPreviewRoutes(
  router,
  { maxArchiveBytes, maxArchiveEntries, logger, archivePreviews, files, showcaseArchives, archivePathJson },
) {
  router.get('/workflows/previews/:id/media/*path', async (req, res) => {
    const preview = archivePreviews.get(req.params.id);
    const parts = req.params.path;
    if (!preview || !Array.isArray(parts) || !parts.length ||
      parts.some((part) => !/^[a-zA-Z0-9._-]+$/.test(part) || part === '.' || part === '..'))
      return res.status(404).json({ error: '预览素材不存在或已过期' });
    const file = path.resolve(preview.mediaDirectory, ...parts);
    const root = path.resolve(preview.mediaDirectory) + path.sep;
    if (!file.startsWith(root)) return res.sendStatus(404);
    try {
      const release = showcaseArchives?.acquire?.();
      if (release) { res.once('finish', release); res.once('close', release); }
      await files.readable(file);
      // Check dotfiles only inside the preview root, not in host directories such as .desktop-dev.
      return res.sendFile(path.join(...parts), { root: preview.mediaDirectory });
    } catch (error) {
      if (error?.code === PROJECT_ERRORS.cacheBusy) return res.status(409).json({ error: error.message, code: error.code });
      return res.sendStatus(404);
    }
  });
  router.post('/workflows/preview', (req, res, next) => {
    if (req.is('application/json')) archivePathJson(req, res, next);
    else next();
  }, async (req, res) => {
    let temporaryDirectory;
    let releaseCache;
    try {
      if (req.is('application/json')) {
        if (!showcaseArchives) throw new ProjectTransferError('案例缓存服务不可用。', 503);
        releaseCache = showcaseArchives.acquire?.();
        const cached = await showcaseArchives.get(req.body?.archive);
        const previewId = crypto.createHash('sha256').update(cached.archivePath).digest('hex');
        archivePreviews.set(previewId, { mediaDirectory: path.join(cached.extractionDirectory, 'media') });
        return res.json({ success: true, manifest: cached.manifest,
          workflow: rewritePreviewMedia(cached.workflow, cached.workflow.id, previewId) });
      }
      temporaryDirectory = await files.createTemporaryDirectory('nako-project-preview-');
      const archivePath = path.join(temporaryDirectory, 'preview.nako');
      const extractionDirectory = path.join(temporaryDirectory, 'extracted');
      await receiveArchive(files, req, archivePath, maxArchiveBytes);
      const { workflow, manifest } = await readProjectArchive({
        archivePath,
        extractionDirectory,
        maxArchiveEntries,
        files,
      });
      const previewId = crypto.randomUUID();
      const mediaDirectory = path.join(extractionDirectory, 'media');
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const timeout = setTimeout(() => {
        const entry = archivePreviews.get(previewId);
        archivePreviews.delete(previewId);
        if (entry) void files.remove(entry.temporaryDirectory, { recursive: true, force: true });
      }, 15 * 60 * 1000);
      timeout.unref?.();
      archivePreviews.set(previewId, { temporaryDirectory, mediaDirectory, expiresAt });
      const previewWorkflow = rewritePreviewMedia(workflow, workflow.id, previewId);
      res.json({ success: true, manifest, workflow: previewWorkflow });
      return;
    } catch (error) {
      const status =
        error instanceof ProjectTransferError || error?.code === 'INVALID_PROJECT_ARCHIVE' || error?.code === PROJECT_ERRORS.cacheBusy
          ? error.status
          : 500;
      if (status >= 500) logger.error('Preview project archive error:', { error, operation: 'previewArchive' });
      res.status(status).json({
        error: error?.message || '项目预览失败',
        code: error?.code || 'PROJECT_PREVIEW_FAILED',
      });
    } finally {
      releaseCache?.();
      if (temporaryDirectory && ![...archivePreviews.values()].some((entry) => entry.temporaryDirectory === temporaryDirectory))
        await files.remove(temporaryDirectory, { recursive: true, force: true });
    }
  });
}

function attachLibraryRoutes(
  router,
  {
    store,
    directories,
    transactions,
    files,
    libraryDirectory,
    mediaDirectory,
    writeSnapshot,
    sanitizeNodes,
    syncFolderProjectCounts,
    maxArchiveBytes,
    maxArchiveEntries,
    logger,
    getAgentArchive,
    resolvedLibraryDirectory,
  },
) {
  router.get('/library/backup', async (_req, res) => {
    let temporaryDirectory = null;
    try {
      const archive = await createLibraryArchive({
        agentArchive: getAgentArchive(),
        store,
        directories,
        files,
        libraryDirectory: resolvedLibraryDirectory,
      });
      temporaryDirectory = archive.temporaryDirectory;
      const date = new Date().toISOString().slice(0, 10);
      res.type('application/vnd.nako.library');
      res.download(archive.archivePath, `Nako-library-${date}.nako-library`, async (error) => {
        await files.remove(archive.temporaryDirectory, { recursive: true, force: true });
        if (error && !res.headersSent) {
          res.status(500).json({ error: '整库备份文件发送失败' });
        }
      });
      temporaryDirectory = null;
    } catch (error) {
      if (temporaryDirectory) {
        await files.remove(temporaryDirectory, { recursive: true, force: true });
      }
      logger.error('Create library archive error:', { error, operation: 'backupLibrary' });
      res.status(500).json({
        error: error?.message || '整库备份失败',
        code: error?.code || 'LIBRARY_BACKUP_FAILED',
      });
    }
  });

  router.post('/library/restore', async (req, res) => {
    const temporaryDirectory = await files.createTemporaryDirectory('nako-library-restore-');
    const archivePath = path.join(temporaryDirectory, 'upload.nako-library');
    const extractionDirectory = path.join(temporaryDirectory, 'extracted');

    try {
      await receiveArchive(files, req, archivePath, maxArchiveBytes);
      const result = await restoreLibraryArchive({
        agentArchive: getAgentArchive(),
        archivePath,
        extractionDirectory,
        store,
        directories,
        transactions,
        files,
        libraryDirectory: resolvedLibraryDirectory,
        mediaDirectory,
        writeSnapshot,
        sanitizeNodes,
        syncFolderProjectCounts,
        maxArchiveEntries,
      });
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      const status =
        error instanceof ProjectTransferError || error?.code === 'INVALID_PROJECT_ARCHIVE'
          ? error.status
          : 500;
      if (status >= 500) logger.error('Restore library archive error:', { error, operation: 'restoreLibrary' });
      res.status(status).json({
        error: error?.message || '整库恢复失败',
        code: error?.code || 'LIBRARY_RESTORE_FAILED',
      });
    } finally {
      await files.remove(temporaryDirectory, { recursive: true, force: true });
    }
  });
}

function attachJsonImportRoutes(
  router,
  { store, writeSnapshot, sanitizeNodes, syncFolderProjectCounts, logger },
) {
  router.post('/workflows/import', async (req, res) => {
    try {
      const incomingWorkflow = req.body;
      if (
        !incomingWorkflow ||
        typeof incomingWorkflow !== 'object' ||
        Array.isArray(incomingWorkflow)
      ) {
        throw new ProjectTransferError('导入的工作流 JSON 无效');
      }

      const sourceId =
        typeof incomingWorkflow.id === 'string' && incomingWorkflow.id ? incomingWorkflow.id : null;
      const collision = sourceId ? Boolean(await store.get(sourceId)) : false;
      const targetId = !sourceId || collision ? crypto.randomUUID() : sourceId;
      const importedWorkflow = {
        ...incomingWorkflow,
        id: targetId,
        revision: 0,
        folderId: null,
        status: 'work',
        nodes: Array.isArray(incomingWorkflow.nodes) ? incomingWorkflow.nodes : [],
        groups: Array.isArray(incomingWorkflow.groups) ? incomingWorkflow.groups : [],
      };
      if (collision) {
        importedWorkflow.title = `${importedWorkflow.title || 'Untitled'}（导入副本）`;
      }

      importedWorkflow.nodes = sanitizeNodes(importedWorkflow.nodes, importedWorkflow.id);
      const result = await store.save(importedWorkflow);
      const savedWorkflow = await store.get(result.id);
      if (savedWorkflow) await writeSnapshot(savedWorkflow);
      await syncFolderProjectCounts();
      res.status(201).json({
        success: true,
        id: result.id,
        revision: result.revision,
        sourceId,
        collision,
      });
    } catch (error) {
      const status =
        error instanceof ProjectTransferError || error?.code === 'INVALID_PROJECT_ARCHIVE'
          ? error.status
          : 500;
      if (status >= 500) logger.error('Import workflow JSON error:', { error, operation: 'importJson' });
      res.status(status).json({
        error: error?.message || '导入工作流失败',
        code: error?.code || 'WORKFLOW_IMPORT_FAILED',
      });
    }
  });
}

function attachRestoreRoutes(
  router,
  {
    store,
    transactions,
    files,
    mediaDirectory,
    writeSnapshot,
    sanitizeNodes,
    syncFolderProjectCounts,
    maxArchiveBytes,
    maxArchiveEntries,
    logger,
    getAgentArchive,
    archivePathJson,
    showcaseArchives,
  },
) {
  router.post(
    '/workflows/restore',
    (req, res, next) => {
      if (req.is('application/json')) archivePathJson(req, res, next);
      else next();
    },
    async (req, res) => {
      const temporaryDirectory = await files.createTemporaryDirectory('nako-project-restore-');
      const extractionDirectory = path.join(temporaryDirectory, 'extracted');
      let releaseCache;

      try {
        let archivePath;
        if (req.is('application/json')) {
          if (req.body?.archive !== undefined) {
            if (!showcaseArchives) throw new ProjectTransferError('案例缓存服务不可用。', 503);
            releaseCache = showcaseArchives.acquire?.();
            archivePath = (await showcaseArchives.get(req.body.archive)).archivePath;
          } else {
            archivePath = await statLocalArchive(files, req.body?.path, maxArchiveBytes);
          }
        } else {
          archivePath = path.join(temporaryDirectory, 'upload.nako');
          await receiveArchive(files, req, archivePath, maxArchiveBytes);
        }
        const result = await restoreProjectArchive({
          agentArchive: getAgentArchive(),
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
          copy: req.body?.archive !== undefined || req.query.copy === 'true',
        });
        res.status(201).json({ success: true, ...result });
      } catch (error) {
        const status =
          error instanceof ProjectTransferError || error?.code === 'INVALID_PROJECT_ARCHIVE' || error?.code === PROJECT_ERRORS.cacheBusy
            ? error.status
            : 500;
        if (status >= 500) logger.error('Restore project archive error:', { error, operation: 'restoreArchive' });
        res.status(status).json({
          error: error?.message || '恢复项目失败',
          code: error?.code || 'PROJECT_RESTORE_FAILED',
        });
      } finally {
        releaseCache?.();
        await files.remove(temporaryDirectory, { recursive: true, force: true });
      }
    },
  );
}

function attachDuplicateRoutes(
  router,
  {
    store,
    transactions,
    files,
    mediaDirectory,
    writeSnapshot,
    sanitizeNodes,
    syncFolderProjectCounts,
    maxArchiveEntries,
    logger,
    getAgentArchive,
  },
) {
  router.post('/workflows/:id/duplicate', async (req, res) => {
    let temporaryDirectory = null;
    try {
      const workflow = await store.get(req.params.id);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
      const archive = await createProjectArchive({
        workflow,
        mediaDirectory,
        files,
        agentArchive: getAgentArchive(),
      });
      temporaryDirectory = archive.temporaryDirectory;
      const result = await restoreProjectArchive({
        agentArchive: getAgentArchive(),
        archivePath: archive.archivePath,
        extractionDirectory: path.join(archive.temporaryDirectory, 'extracted'),
        store,
        transactions,
        files,
        mediaDirectory,
        writeSnapshot,
        sanitizeNodes,
        syncFolderProjectCounts,
        maxArchiveEntries,
      });
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      const status =
        error instanceof ProjectTransferError || error?.code === 'INVALID_PROJECT_ARCHIVE'
          ? error.status
          : 500;
      if (status >= 500) logger.error('Duplicate project error:', { error, operation: 'duplicateProject' });
      res.status(status).json({
        error: error?.message || '复制项目失败',
        code: error?.code || 'PROJECT_DUPLICATE_FAILED',
      });
    } finally {
      if (temporaryDirectory) await files.remove(temporaryDirectory, { recursive: true, force: true });
    }
  });
}

function attachBackupRoutes(router, { store, mediaDirectory, logger, getAgentArchive, files }) {
  router.get('/workflows/:id/backup', async (req, res) => {
    let temporaryDirectory = null;
    try {
      const workflow = await store.get(req.params.id);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

      const archive = await createProjectArchive({
        workflow,
        mediaDirectory,
        files,
        agentArchive: getAgentArchive(),
      });
      temporaryDirectory = archive.temporaryDirectory;
      const downloadName = `${sanitizeDownloadName(workflow.title)}_${workflow.id}.nako`;
      res.type('application/vnd.nako.project');
      res.download(archive.archivePath, downloadName, async (error) => {
        await files.remove(archive.temporaryDirectory, { recursive: true, force: true });
        if (error && !res.headersSent) {
          res.status(500).json({ error: '项目备份文件发送失败' });
        }
      });
      temporaryDirectory = null;
    } catch (error) {
      if (temporaryDirectory) {
        await files.remove(temporaryDirectory, { recursive: true, force: true });
      }
      logger.error('Create project archive error:', { error, operation: 'backupProject' });
      res.status(500).json({ error: error?.message || '备份项目失败' });
    }
  });
}

function attachJsonExportRoutes(router, { store, logger }) {
  router.get('/workflows/:id/export', async (req, res) => {
    try {
      const workflow = await store.get(req.params.id);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
      const downloadName = `${sanitizeDownloadName(workflow.title)}_${workflow.id}.nako.json`;
      res.attachment(downloadName).json(workflow);
    } catch (error) {
      logger.error('Export workflow JSON error:', { error, operation: 'exportJson' });
      res.status(500).json({ error: error?.message || '导出工作流失败' });
    }
  });
}

import { createModuleLogger } from '../../../kernel/logger.js';
import express from 'express';

export function createFolderRouter({ store, directories, writeSnapshot, logger = createModuleLogger('project.folders') }) {
    const router = express.Router();

    router.get('/', async (_req, res) => {
        try {
            res.json(await directories.listFolders());
        } catch (error) {
            logger.error('List folders error:', { error, operation: 'listFolders' });
            res.status(500).json({ error: error?.message || 'List folders failed' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const folder = await directories.saveFolder(req.body || {});
            await directories.syncFolderProjectCounts();
            res.json(await directories.getFolderById(folder.id));
        } catch (error) {
            logger.error('Save folder error:', { error, operation: 'saveFolder' });
            res.status(500).json({ error: error?.message || 'Save folder failed' });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const folder = await directories.getFolderById(req.params.id);
            if (!folder) return res.status(404).json({ error: 'Folder not found' });

            const affectedWorkflowIds = await directories.clearFolderReferences(req.params.id);
            await directories.deleteFolder(req.params.id);
            await directories.syncFolderProjectCounts();

            for (const workflowId of affectedWorkflowIds) {
                const workflow = await store.get(workflowId);
                if (workflow) await writeSnapshot(workflow);
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('Delete folder error:', { error, operation: 'deleteFolder', folderId: req.params.id });
            res.status(500).json({ error: error?.message || 'Delete folder failed' });
        }
    });

    return router;
}

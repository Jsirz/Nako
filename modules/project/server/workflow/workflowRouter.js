import crypto from 'node:crypto';
import express from 'express';
import { createModuleLogger } from '../../../kernel/logger.js';
import { PROJECT_ERRORS } from '../../../contracts/projectErrors.js';

const WORKFLOW_COVER_IMAGE = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/iu;
export function normalizeWorkflowCoverUrl(value) {
    const candidate = String(value || '').trim();
    if (!candidate || candidate.length > 2_048 || candidate.includes('\0')) return null;
    try {
        const parsed = new URL(candidate, 'http://nako.local');
        if (parsed.origin !== 'http://nako.local' || !parsed.pathname.startsWith('/library/')) return null;
        if (!WORKFLOW_COVER_IMAGE.test(parsed.pathname)) return null;
        if (decodeURIComponent(parsed.pathname).split('/').some(segment => segment === '..')) return null;
        return candidate;
    } catch { return null; }
}

/** @param {{ store: import('../../../contracts/index.js').ProjectRepository,
 * recovery: import('../../../contracts/projectRepositoryExtensions.js').ProjectRecoveryRepository,
 * sanitizeNodes: Function, writeSnapshot: Function, syncFolderProjectCounts: Function,
 * logger?: import('../../../contracts/index.js').Logger }} options */
export function createWorkflowRouter({ store, recovery, sanitizeNodes, writeSnapshot,
    syncFolderProjectCounts, logger = createModuleLogger('project.workflow') }) {
    const router = express.Router();
    const snapshot = async id => {
        const workflow = await store.get(id);
        if (workflow) await writeSnapshot(workflow);
        return workflow;
    };
    const fail = (res, error, operation) => {
        logger.error('项目操作失败。', { operation, error });
        const status = error?.status || 500;
        res.status(status).json({ error: error?.message || '项目操作失败',
            code: error?.code || PROJECT_ERRORS.request, currentRevision: error?.currentRevision });
    };
    const update = async (id, patch) => {
        const workflow = await store.get(id);
        if (!workflow) return null;
        await store.save({ ...workflow, ...patch });
        return snapshot(id);
    };
    router.post('/', async (req, res) => {
        try {
            const { createBackup, ...incoming } = req.body || {};
            if (!Array.isArray(incoming.nodes) || !Array.isArray(incoming.groups))
                return res.status(400).json({ error: '项目节点或分组无效', code: PROJECT_ERRORS.invalidDocument });
            incoming.id ||= crypto.randomUUID();
            if (Object.hasOwn(incoming, 'coverUrl')) incoming.coverUrl = normalizeWorkflowCoverUrl(incoming.coverUrl);
            if (createBackup) {
                const current = await store.get(incoming.id);
                if (current && Number(incoming.revision || 0) === Number(current.revision || 0))
                    await recovery.createWorkflowRecoveryPoint(incoming.id, 'manual-save');
            }
            incoming.nodes = sanitizeNodes(incoming.nodes, incoming.id);
            const result = await store.save(incoming);
            await snapshot(result.id);
            await syncFolderProjectCounts();
            res.json({ success: true, ...result });
        } catch (error) { fail(res, error, 'save'); }
    });
    router.get('/', async (_req, res) => {
        try { res.json(await store.list()); }
        catch (error) { fail(res, error, 'list'); }
    });
    router.get('/recovery-status', async (_req, res) => {
        try { res.json({ startup: recovery.getStartupRecoveryReport(), quarantine: await recovery.listWorkflowQuarantine() }); }
        catch (error) { fail(res, error, 'recoveryStatus'); }
    });
    router.put('/:id/rename', async (req, res) => {
        try {
            if (typeof req.body?.title !== 'string') return res.status(400).json({ error: '项目名称无效', code: PROJECT_ERRORS.invalidDocument });
            const current = await store.get(req.params.id);
            if (!current) return res.status(404).json({ error: 'Workflow not found' });
            const workflow = await update(req.params.id, { title: req.body.title.trim() || current.title });
            res.json({ success: true, title: workflow.title });
        } catch (error) { fail(res, error, 'rename'); }
    });
    router.put('/:id/move', async (req, res) => {
        try {
            const folderId = req.body?.folderId ?? null;
            if (folderId !== null && typeof folderId !== 'string') return res.status(400).json({ error: '文件夹编号无效', code: PROJECT_ERRORS.invalidDocument });
            const workflow = await update(req.params.id, { folderId });
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
            await syncFolderProjectCounts();
            res.json({ success: true, folderId: workflow.folderId });
        } catch (error) { fail(res, error, 'move'); }
    });
    router.put('/:id/cover', async (req, res) => {
        try {
            const coverUrl = normalizeWorkflowCoverUrl(req.body?.coverUrl);
            if (!await update(req.params.id, { coverUrl })) return res.status(404).json({ error: 'Workflow not found' });
            res.json({ success: true, coverUrl });
        } catch (error) { fail(res, error, 'cover'); }
    });
    router.get('/:id/recovery-points', async (req, res) => {
        try { res.json(await recovery.listWorkflowRecoveryPoints(req.params.id)); }
        catch (error) { fail(res, error, 'listRecovery'); }
    });
    router.post('/:id/recovery-points/:recoveryPointId/restore', async (req, res) => {
        try {
            const result = await recovery.restoreWorkflowRecoveryPoint(req.params.id, req.params.recoveryPointId);
            if (!result) return res.status(404).json({ error: 'Recovery point not found' });
            await snapshot(result.id);
            await syncFolderProjectCounts();
            res.json({ success: true, ...result });
        } catch (error) { fail(res, error, 'restoreRecovery'); }
    });
    router.delete('/:id', async (req, res) => {
        try {
            if (!await store.get(req.params.id)) return res.status(404).json({ error: 'Workflow not found' });
            await store.delete(req.params.id);
            await syncFolderProjectCounts();
            res.json({ success: true });
        } catch (error) { fail(res, error, 'delete'); }
    });
    router.get('/:id', async (req, res) => {
        try {
            const workflow = await store.get(req.params.id);
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
            res.json(workflow);
        } catch (error) { fail(res, error, 'get'); }
    });
    return router;
}

import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import path from 'node:path';

export function createWorkflowSnapshotWriter({ mediaDirectory, files }) {
    if (!mediaDirectory) {
        throw new ProjectError(PROJECT_ERRORS.configuration, 'createWorkflowSnapshotWriter requires mediaDirectory', { context: { operation: 'createSnapshotWriter' } });
    }

    return function writeWorkflowSnapshot(workflow) {
        if (!workflow?.id) {
            throw new ProjectError(PROJECT_ERRORS.invalidDocument, 'Missing workflow id when writing project JSON snapshot', { context: { operation: 'writeSnapshot' } });
        }

        const now = new Date().toISOString();
        const snapshot = {
            ...workflow,
            id: workflow.id,
            revision: Number(workflow.revision || 0),
            title: workflow.title || 'Untitled',
            nodes: Array.isArray(workflow.nodes) ? workflow.nodes : [],
            groups: Array.isArray(workflow.groups) ? workflow.groups : [],
            viewport: workflow.viewport || { x: 0, y: 0, zoom: 1 },
            isMinimapOpen: typeof workflow.isMinimapOpen === 'boolean' ? workflow.isMinimapOpen : true,
            folderId: workflow.folderId ?? null,
            coverUrl: workflow.coverUrl || null,
            createdAt: workflow.createdAt || now,
            updatedAt: workflow.updatedAt || now,
            source: 'nako-project-save'
        };
        const snapshotPath = path.join(mediaDirectory, `${workflow.id}.json`);
        return files.writeSnapshot(snapshotPath, snapshot);
    };
}

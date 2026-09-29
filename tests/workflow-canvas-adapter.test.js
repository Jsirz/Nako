// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { buildWorkflowCanvasValues, createWorkflowCanvasNodes, } from '../modules/local-runtime/ui/local/workflowCanvasNodes';
function blueprint() {
    return {
        title: 'Test workflow', subtitle: 'Local', executionTarget: 'local', canvasNodeHash: 'hash',
        workflowRef: { definitionId: 'definition', bindingSetId: 'binding', deploymentId: 'deployment' },
        ui: { width: 600 },
        inputPorts: [
            { id: 'first', label: 'First image', mediaKind: 'image', required: true, multiple: false },
            { id: 'second', label: 'Second image', mediaKind: 'image', required: true, multiple: false },
        ], outputPorts: [], parameterSchema: [], parameterValues: {},
    };
}
describe('composed workflow canvas adapter', () => {
    it('remaps connections by binding identity after input order changes', () => {
        const adapter = createWorkflowCanvasNodes({}), plan = blueprint();
        const node = adapter.createNode(plan, { x: 33, y: 55 });
        node.parentIds = ['asset-a', 'asset-b'];
        node.sourcePortIndices = [2, 3];
        node.status = 'success';
        node.resultUrl = '/old-output';
        const next = adapter.updateNode(node, { ...plan, inputPorts: [...plan.inputPorts].reverse() });
        expect(next.parentIds).toEqual(['asset-b', 'asset-a']);
        expect(next.sourcePortIndices).toEqual([3, 2]);
        expect(next).toMatchObject({ id: node.id, x: 33, y: 55, status: 'idle' });
        expect(next.resultUrl).toBeUndefined();
        expect(node.parentIds).toEqual(['asset-a', 'asset-b']);
    });
    it('rejects media references from another project before submission', async () => {
        const startCanvasRun = vi.fn(), adapter = createWorkflowCanvasNodes({ startCanvasRun });
        const node = adapter.createNode(blueprint());
        node.parentIds = ['asset-a', 'asset-b'];
        const connected = ['asset-a', 'asset-b'].map(id => ({ id, type: 'Upload Image',
            resultUrl: `/library/media/another-project/images/${id}.png` }));
        expect(() => buildWorkflowCanvasValues(node, connected, 'project')).toThrow();
        await expect(adapter.run(node, connected, 'project', vi.fn())).rejects.toThrow();
        expect(startCanvasRun).not.toHaveBeenCalled();
    });
    it('ignores late submission responses when the owning canvas has closed', async () => {
        let complete, current = true;
        const startCanvasRun = vi.fn(() => new Promise(resolve => { complete = resolve; }));
        const getRun = vi.fn();
        const adapter = createWorkflowCanvasNodes({ startCanvasRun, getRun });
        const node = adapter.createNode({ ...blueprint(), inputPorts: [] }), patch = vi.fn();
        const result = adapter.run(node, [], 'project', patch, { isCurrent: () => current });
        expect(startCanvasRun).toHaveBeenCalledTimes(1);
        const initialPatches = patch.mock.calls.length;
        current = false;
        complete({ runId: 'run', status: 'running' });
        await expect(result).rejects.toMatchObject({ name: 'WorkflowViewExpiredError' });
        expect(patch).toHaveBeenCalledTimes(initialPatches);
        expect(getRun).not.toHaveBeenCalled();
    });
    it('deduplicates blueprint reconciliation but updates each node independently', async () => {
        const plan = blueprint();
        const latest = { ...plan, canvasNodeHash: 'new-hash', workflowRef: { ...plan.workflowRef, bindingSetId: 'next' } };
        const listBindingSets = vi.fn(async () => [
            { id: 'binding', revision: 1 }, { id: 'next', revision: 2, previousBindingSetId: 'binding' },
        ]);
        const createCanvasNode = vi.fn(async () => latest);
        const adapter = createWorkflowCanvasNodes({ listBindingSets, createCanvasNode });
        const a = adapter.createNode(plan, { x: 1 }), b = adapter.createNode(plan, { x: 2 });
        const [updatedA, updatedB] = await Promise.all([adapter.reconcileNode(a), adapter.reconcileNode(b)]);
        expect(listBindingSets).toHaveBeenCalledTimes(1);
        expect(createCanvasNode).toHaveBeenCalledTimes(1);
        expect(updatedA).toMatchObject({ id: a.id, x: 1, canvasNodeHash: 'new-hash' });
        expect(updatedB).toMatchObject({ id: b.id, x: 2, canvasNodeHash: 'new-hash' });
    });
});

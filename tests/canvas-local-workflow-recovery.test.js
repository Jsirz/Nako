import { describe, expect, it, vi } from 'vitest';
import { createCanvasLocalWorkflows } from '../modules/generation-core/ui/generation/canvasLocalWorkflows';

describe('canvas local workflow recovery', () => {
  it('observes a saved operation after canvas remount without submitting it again', async () => {
    const projectId = 'project-1';
    const token = 'operation-1';
    let nodes = [
      { id: 'source', type: 'ComfyUI', comfyMode: 'minimax-h3-t2va', status: 'loading',
        localWorkflowOperationId: token },
      { id: 'output', type: 'Upload Video', status: 'loading', localWorkflowOperationId: token },
    ];
    const binding = {
      getNodes: () => nodes,
      getProjectId: () => projectId,
      isActive: () => true,
      setNodes: update => { nodes = typeof update === 'function' ? update(nodes) : update; },
      setSelectedNodeIds: vi.fn(),
    };
    const runtime = {
      createId: vi.fn(),
      run: vi.fn(),
      getOperation: vi.fn().mockResolvedValue({ status: 'success', operationId: token,
        success: true, url: '/library/media/project-1/videos/result.mp4' }),
    };
    const oldCanvas = createCanvasLocalWorkflows(binding, runtime);
    oldCanvas.dispose();
    expect(nodes[0].localWorkflowOperationId).toBe(token);

    const reopened = createCanvasLocalWorkflows(binding, runtime);
    reopened.resume(nodes);
    await vi.waitFor(() => expect(nodes[1].status).toBe('success'));
    expect(nodes[1].resultUrl).toBe('/library/media/project-1/videos/result.mp4');
    expect(nodes[0].localWorkflowOperationId).toBeUndefined();
    expect(runtime.run).not.toHaveBeenCalled();
    reopened.dispose();
  });

  it('keeps an unconfirmed operation ID so reopening can check it again', async () => {
    let nodes = [{ id: 'source', comfyMode: 'minimax-h3-t2va', status: 'loading',
      localWorkflowOperationId: 'unknown-operation' }];
    const runtime = { createId: vi.fn(), run: vi.fn(),
      getOperation: vi.fn().mockResolvedValue({ status: 'unknown', operationId: 'unknown-operation' }) };
    const controller = createCanvasLocalWorkflows({
      getNodes: () => nodes, getProjectId: () => 'project-1', isActive: () => true,
      setNodes: update => { nodes = typeof update === 'function' ? update(nodes) : update; },
      setSelectedNodeIds: vi.fn(),
    }, runtime);
    controller.resume(nodes);
    await vi.waitFor(() => expect(nodes[0].status).toBe('error'));
    expect(nodes[0].localWorkflowOperationId).toBe('unknown-operation');
    controller.resume(nodes);
    expect(runtime.getOperation).toHaveBeenCalledTimes(1);
    expect(runtime.run).not.toHaveBeenCalled();
    controller.dispose();
  });
});

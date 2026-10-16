// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { useShotAnalysisRun } from '../modules/canvas-ui/ui/nodes/useShotAnalysisRun';
import { CanvasShotAnalysisNode } from '../modules/canvas-ui/ui/nodes/canvasShotAnalysisNode';
import { shotAnalysisCanvas } from '../modules/canvas-ui/ui/canvas/shotAnalysisCanvas';
import { prepareProjectMedia } from '../modules/project/ui/persistence/projectMediaImport';
import { resetSharedProject } from '../modules/project/server/project/sharedProject.js';
import { remapCanvasNodeReferences } from '../modules/canvas-ui/ui/canvas/canvasNodeReferences';
import * as client from '../modules/canvas-ui/ui/nodes/nodeGraphClient';
import { extracted } from './fixtures/shot-analysis.js';

vi.mock('../modules/canvas-ui/ui/nodes/nodeGraphClient', () => ({ prepareNodeGraph: vi.fn(), getNodeRun: vi.fn(), waitForNodeRequest: vi.fn(), waitNodeRun: vi.fn(), approveNodeRun: vi.fn(), cancelNodeRun: vi.fn() }));
vi.mock('../modules/canvas-ui/ui/nodes/nodeGraphSnapshot', () => ({
  buildNodeGraph: (node, all, projectId) => ({ requestId: crypto.randomUUID(), projectId, nodes: [node] }),
  nodeLinks: () => [], nodeOutput: () => undefined,
}));
const receipt = (status = 'awaiting_approval', id = 'run1') => ({ id, projectId: 'p', status, events: [], capabilities: ['models.generate'], maxModelCalls: 1, results: {} });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { resolve, reject, promise }; };
beforeEach(() => {
  vi.resetAllMocks();
  client.waitForNodeRequest.mockImplementation(() => new Promise(() => {}));
  client.getNodeRun.mockResolvedValue(receipt());
  client.approveNodeRun.mockImplementation(async value => ({ ...value, status: 'running' }));
  client.waitNodeRun.mockImplementation(async (value, callback) => { callback(value); return value; });
});
afterEach(cleanup);

function setup(node = {}, saveBeforePrepare = async () => true, onAnalysisSuccess = vi.fn()) {
  let value = { id: 'n', type: 'shot-analysis', pluginId: 'nako.canvas-core', parameters: { video: '/library/media/p/videos/input.mp4' }, ...node };
  const patch = vi.fn(update => { value = { ...value, ...update }; view.rerender({ node: value, projectId: 'p', documentEpoch: 1, readOnly: false }); });
  const view = renderHook(props => useShotAnalysisRun({ ...props, allNodes: [props.node], patch, saveBeforePrepare, onAnalysisSuccess }), { initialProps: { node: value, projectId: 'p', documentEpoch: 1, readOnly: false } });
  return { ...view, patch, onAnalysisSuccess, node: () => value };
}

describe('one-click shot analysis and observation', () => {
  it('allows dragging the title, descriptions and blank area while protecting controls', () => {
    const drag = vi.fn(), Frame = ({ children }) => React.createElement('section', { onPointerDown: drag }, children), Header = () => null;
    const view = render(React.createElement(CanvasShotAnalysisNode, { data: { id: 'n', type: 'shot-analysis', parameters: { video: '/library/media/p/videos/input.mp4' }, pluginResult: { analysis: extracted() } },
      dependencies: { Frame, Header }, projectId: 'p', onUpdate: vi.fn() }));
    const title = view.getByText('逐帧拉片');
    fireEvent.pointerDown(title);
    fireEvent.pointerDown(view.getByText('视频素材'));
    fireEvent.pointerDown(title.parentElement.parentElement);
    expect(drag).toHaveBeenCalledTimes(3);
    drag.mockClear();
    for (const element of view.container.querySelectorAll('button,input,label,video,audio,summary,textarea')) fireEvent.pointerDown(element);
    expect(drag).not.toHaveBeenCalled();
    expect(client.prepareNodeGraph).not.toHaveBeenCalled();
  });
  it('saves the current canvas before preparing the task', async () => {
    const order = [], save = vi.fn(async () => { order.push('save'); return true; });
    client.prepareNodeGraph.mockImplementation(async () => { order.push('prepare'); return receipt(); });
    const view = setup({}, save);
    await act(async () => { await view.result.current.start(false); });
    expect(order).toEqual(['save', 'prepare']);
  });
  it('does not prepare a task if the project was not saved cleanly', async () => {
    const view = setup({}, vi.fn(async () => false));
    await act(async () => { await view.result.current.start(false); });
    expect(client.prepareNodeGraph).not.toHaveBeenCalled();
    expect(view.node().nodeRequestId).toBeUndefined();
    expect(view.result.current.error).toContain('画布尚未保存完成');
  });
  it('reports save failures without suggesting a nonexistent task lookup', async () => {
    const view = setup({}, vi.fn(async () => { throw new Error('network'); }));
    await act(async () => { await view.result.current.start(false); });
    expect(client.prepareNodeGraph).not.toHaveBeenCalled();
    expect(view.result.current.active).toBe(false);
    expect(view.result.current.error).toContain('画布保存失败');
  });
  it('does not prepare after the document changes during save', async () => {
    const pending = deferred(), save = vi.fn(() => pending.promise);
    const view = setup({}, save);
    let request;
    await act(async () => { request = view.result.current.start(false); });
    view.rerender({ node: view.node(), projectId: 'other', documentEpoch: 2, readOnly: false });
    await act(async () => { pending.resolve(true); await request; });
    expect(client.prepareNodeGraph).not.toHaveBeenCalled();
  });
  it('starts and approves from one click while blocking duplicate preparation', async () => {
    const pending = deferred(); client.prepareNodeGraph.mockReturnValue(pending.promise);
    const view = setup(); let first;
    await act(async () => { first = view.result.current.start(false); await view.result.current.start(false); });
    expect(client.prepareNodeGraph).toHaveBeenCalledTimes(1); expect(client.approveNodeRun).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(receipt()); await first; });
    await waitFor(() => expect(view.result.current.run.status).toBe('running'));
    expect(client.approveNodeRun).toHaveBeenCalledTimes(1);
    await act(async () => { await view.result.current.start(false); });
    expect(client.prepareNodeGraph).toHaveBeenCalledTimes(1);
  });
  it('keeps the previous result and uses its last successful cache after cancellation', async () => {
    const previous = { analysis: extracted() };
    const view = setup({ pluginResult: previous, nodeAnalysisRunId: 'cached-run' });
    client.prepareNodeGraph.mockResolvedValue(receipt());
    await act(async () => { await view.result.current.start(true); });
    expect(client.prepareNodeGraph.mock.calls[0][0]).toMatchObject({ maxModelCalls: 0, nodes: [{ parameters: { reuseRunId: 'cached-run' } }] });
    expect(view.node().pluginResult).toEqual(previous);
    client.cancelNodeRun.mockResolvedValue(receipt('cancelled'));
    client.getNodeRun.mockResolvedValue(receipt('cancelled'));
    await act(async () => { await view.result.current.cancel(); });
    expect(view.node().pluginResult).toEqual(previous); expect(view.node().nodeAnalysisRunId).toBe('cached-run');
  });
  it('ignores preparation responses from the previous project', async () => {
    const pending = deferred(); client.prepareNodeGraph.mockReturnValue(pending.promise);
    const patch = vi.fn(), initialProps = { node: { id: 'n', type: 'shot-analysis' }, allNodes: [], projectId: 'p', documentEpoch: 1, readOnly: false, patch, saveBeforePrepare: async () => true };
    const view = renderHook(useShotAnalysisRun, { initialProps }); let request;
    await act(async () => { request = view.result.current.start(false); });
    expect(client.prepareNodeGraph).toHaveBeenCalledTimes(1);
    view.rerender({ ...initialProps, projectId: 'other', documentEpoch: 2 }); patch.mockClear();
    await act(async () => { pending.resolve(receipt()); await request; });
    expect(patch).not.toHaveBeenCalled(); expect(view.result.current.run).toBeUndefined();
  });
  it('rejects a late observer from the previous run', async () => {
    const callbacks = [];
    client.getNodeRun.mockResolvedValue(receipt('success', 'old'));
    client.waitNodeRun.mockImplementation(async (value, callback) => { callbacks.push(callback); callback(value); return value; });
    const view = setup({ nodeRunId: 'old' });
    await waitFor(() => expect(callbacks.length).toBeGreaterThan(0));
    client.prepareNodeGraph.mockResolvedValue(receipt('awaiting_approval', 'new'));
    client.getNodeRun.mockResolvedValue(receipt('awaiting_approval', 'new'));
    await act(async () => { await view.result.current.start(false); });
    view.patch.mockClear();
    await act(async () => { callbacks[0]({ ...receipt('success', 'old'), results: { n: { analysis: extracted() } } }); });
    expect(view.patch).not.toHaveBeenCalled(); expect(view.result.current.run.id).toBe('new');
  });
  it('retains uncertain requests for lookup and unlocks explicitly rejected preparations', async () => {
    const view = setup(); client.prepareNodeGraph.mockRejectedValue(new Error('network'));
    await act(async () => { await view.result.current.start(false); });
    expect(view.node().nodeRequestId).toBeTruthy(); expect(view.result.current.active).toBe(true);
    await act(async () => { await view.result.current.start(false); }); expect(client.prepareNodeGraph).toHaveBeenCalledTimes(1);
    cleanup();
    const rejected = setup(); client.prepareNodeGraph.mockRejectedValue({ code: 'INVALID_ARGUMENT', status: 400, message: '参数无效' });
    await act(async () => { await rejected.result.current.start(false); });
    expect(rejected.node().nodeRequestId).toBeUndefined(); expect(rejected.result.current.active).toBe(false);
  });
  it('automatically inserts once on success, including cached re-extraction', async () => {
    const result = extracted(), success = { ...receipt('success'), results: { n: { analysis: result } } };
    client.prepareNodeGraph.mockResolvedValue(receipt());
    client.approveNodeRun.mockResolvedValue(success);
    client.waitNodeRun.mockImplementation(async (value, callback) => { callback(value); callback(value); return value; });
    const view = setup();
    await act(async () => { await view.result.current.start(false); });
    await waitFor(() => expect(view.onAnalysisSuccess).toHaveBeenCalledTimes(1));
    expect(view.node()).toMatchObject({ pluginResult: { analysis: result }, nodeAnalysisRunId: 'run1' });
    expect(view.node().nodeDirectRunRequestId).toBeUndefined();
    const second = { ...success, id: 'run2', results: { n: { analysis: { ...result, id: 'result2' } } } };
    client.prepareNodeGraph.mockResolvedValue(receipt('awaiting_approval', 'run2'));
    client.getNodeRun.mockResolvedValue(receipt('awaiting_approval', 'run2'));
    client.approveNodeRun.mockResolvedValue(second);
    await act(async () => { await view.result.current.start(true, JSON.stringify(result.analysis)); });
    await waitFor(() => expect(view.onAnalysisSuccess).toHaveBeenCalledTimes(2));
    expect(client.prepareNodeGraph.mock.calls[1][0]).toMatchObject({ maxModelCalls: 0, nodes: [{ parameters: { reuseRunId: 'run1' } }] });
  });
  it('recovers an uncertain preparation and approves the original request', async () => {
    const pending = deferred();
    client.prepareNodeGraph.mockRejectedValue(new Error('network'));
    client.waitForNodeRequest.mockReturnValue(pending.promise);
    client.approveNodeRun.mockResolvedValue({ ...receipt('success'), results: { n: { analysis: extracted() } } });
    const view = setup();
    await act(async () => { await view.result.current.start(false); });
    const requestId = view.node().nodeRequestId;
    expect(view.node().nodeDirectRunRequestId).toBe(requestId);
    await act(async () => { pending.resolve(receipt()); });
    await waitFor(() => expect(view.onAnalysisSuccess).toHaveBeenCalledTimes(1));
    expect(client.prepareNodeGraph).toHaveBeenCalledTimes(1);
    expect(client.approveNodeRun).toHaveBeenCalledTimes(1);
    expect(view.node().nodeRunId).toBe('run1');
  });
  it('retains a prepared run when approval fails and only retries that run', async () => {
    client.prepareNodeGraph.mockResolvedValue(receipt());
    client.approveNodeRun.mockRejectedValueOnce(new Error('network'));
    const view = setup();
    await act(async () => { await view.result.current.start(false); });
    await waitFor(() => expect(view.result.current.error).toContain('重新查询原任务'));
    expect(view.node().nodeRunId).toBe('run1'); expect(view.node().nodeRequestId).toBeTruthy();
    expect(view.node().nodeDirectRunRequestId).toBe(view.node().nodeRequestId);
    client.approveNodeRun.mockResolvedValue({ ...receipt('success'), results: { n: { analysis: extracted() } } });
    await act(async () => { view.result.current.query(); });
    await waitFor(() => expect(view.onAnalysisSuccess).toHaveBeenCalledTimes(1));
    expect(client.prepareNodeGraph).toHaveBeenCalledTimes(1);
    expect(client.approveNodeRun.mock.calls.every(([run]) => run.id === 'run1')).toBe(true);
  });
  it('restores an explicitly started task after unmount but does not reinsert completed history', async () => {
    const success = { ...receipt('success'), results: { n: { analysis: extracted() } } };
    client.getNodeRun.mockResolvedValue(success);
    const pending = setup({ nodeRunId: 'run1', nodeRequestId: 'request1', nodeDirectRunRequestId: 'request1' });
    await waitFor(() => expect(pending.onAnalysisSuccess).toHaveBeenCalledTimes(1));
    const completed = pending.node(); pending.unmount();
    const restored = setup(completed);
    await waitFor(() => expect(restored.result.current.run.status).toBe('success'));
    expect(restored.onAnalysisSuccess).not.toHaveBeenCalled();
    expect(client.prepareNodeGraph).not.toHaveBeenCalled(); expect(client.approveNodeRun).not.toHaveBeenCalled();
  });
  it('does not approve a historical task without an explicit start intent', async () => {
    const view = setup({ nodeRunId: 'run1', nodeRequestId: 'request1' });
    await waitFor(() => expect(view.result.current.run.status).toBe('awaiting_approval'));
    expect(client.approveNodeRun).not.toHaveBeenCalled(); expect(view.onAnalysisSuccess).not.toHaveBeenCalled();
  });
  it('ignores an approval response after switching to preview', async () => {
    const approval = deferred();
    client.prepareNodeGraph.mockResolvedValue(receipt()); client.approveNodeRun.mockReturnValue(approval.promise);
    const view = setup();
    await act(async () => { await view.result.current.start(false); });
    await waitFor(() => expect(client.approveNodeRun).toHaveBeenCalledTimes(1));
    view.rerender({ node: view.node(), projectId: 'p', documentEpoch: 1, readOnly: true }); view.patch.mockClear();
    await act(async () => { approval.resolve({ ...receipt('success'), results: { n: { analysis: extracted() } } }); });
    expect(view.patch).not.toHaveBeenCalled(); expect(view.onAnalysisSuccess).not.toHaveBeenCalled();
  });
  it('sends the finished result straight into grouped canvas nodes without a second action', async () => {
    const result = extracted(), insert = vi.fn(), Frame = ({ children }) => React.createElement('section', null, children), Header = () => null;
    let document = { nodes: [{ id: 'n', type: 'shot-analysis', pluginId: 'nako.canvas-core', projectId: 'p', x: 0, y: 0, parameters: { video: result.source.url } }], groups: [] };
    const runtime = { create: (type, point, projectId) => ({ id: crypto.randomUUID(), type, ...point, projectId }), width: () => 200, height: () => 200 };
    const view = render(React.createElement(function Harness() {
      const [, refresh] = React.useState(0);
      return React.createElement(CanvasShotAnalysisNode, { data: document.nodes[0], allNodes: document.nodes, projectId: 'p', documentEpoch: 1,
        dependencies: { Frame, Header }, onSaveBeforeShotAnalysis: async () => true,
        onUpdate: (id, patch) => { document = { ...document, nodes: document.nodes.map(node => node.id === id ? { ...node, ...patch } : node) }; refresh(value => value + 1); },
        onInsertShotAnalysis: input => { insert(input); document = shotAnalysisCanvas(document.nodes[0], document.nodes[0].pluginResult.analysis, input.resultId, document, runtime); refresh(value => value + 1); },
      });
    }));
    client.prepareNodeGraph.mockResolvedValue(receipt());
    client.approveNodeRun.mockResolvedValue({ ...receipt('success'), results: { n: { analysis: result } } });
    expect(view.container.textContent).not.toMatch(/Qwen|3\.8|授权/);
    fireEvent.click(view.getByRole('button', { name: '开始拉片' }));
    await waitFor(() => expect(document.nodes).toHaveLength(9));
    expect(document.groups).toHaveLength(2); expect(document.nodes[0].pluginResult.analysis).toEqual(result);
    expect(document.nodes[0].nodeDirectRunRequestId).toBeUndefined(); expect(insert).toHaveBeenCalledTimes(1);
    expect(view.getByText('2 个分镜 · 已加入画布')).toBeTruthy();
    expect(view.queryByRole('button', { name: '添加到画布' })).toBeNull();
  });
  it('shows results but offers no mutations, requests or authorization in preview mode', () => {
    const Frame = ({ children }) => React.createElement('section', null, children), Header = () => null;
    const view = render(React.createElement(CanvasShotAnalysisNode, { data: { id: 'n', type: 'shot-analysis', nodeRunId: 'old', parameters: {}, pluginResult: { analysis: extracted() } },
      dependencies: { Frame, Header }, projectId: 'p', readOnly: true }));
    fireEvent.click(view.getByText('2 个分镜 · 查看拉片结果'));
    expect(view.getByText('2 个分镜')).toBeTruthy();
    expect(view.getAllByRole('button').every(button => button.disabled)).toBe(true);
    expect(client.getNodeRun).not.toHaveBeenCalled(); expect(client.prepareNodeGraph).not.toHaveBeenCalled();
    fireEvent.click(view.getByText('查看 / 调整分镜 JSON'));
    expect(view.getByRole('textbox', { name: '分镜 JSON' }).readOnly).toBe(true);
    expect(client.approveNodeRun).not.toHaveBeenCalled();
  });
  it('shows a recoverable error for malformed persisted results', () => {
    const Frame = ({ children }) => React.createElement('section', null, children), Header = () => null;
    const view = render(React.createElement(CanvasShotAnalysisNode, { data: { id: 'n', type: 'shot-analysis', parameters: {}, pluginResult: { analysis: { id: 'broken' } } },
      dependencies: { Frame, Header }, projectId: 'p', readOnly: true }));
    expect(view.getByRole('alert').textContent).toContain('拉片结果损坏');
    expect(client.getNodeRun).not.toHaveBeenCalled();
  });
});

describe('shot project results', () => {
  it('builds grouped assets atomically, deduplicates by result and rejects foreign media', () => {
    const source = { id: 'n', type: 'shot-analysis', x: 10, y: 20, projectId: 'p' }, result = extracted(), before = { nodes: [source], groups: [] };
    const runtime = { create: (type, point, projectId) => ({ id: crypto.randomUUID(), type, ...point, projectId }), width: () => 200, height: () => 200 };
    const inserted = shotAnalysisCanvas(source, result, result.id, before, runtime);
    expect(inserted.groups).toHaveLength(2); expect(inserted.created).toHaveLength(8); expect(before.nodes).toHaveLength(1);
    expect(inserted.groups[0].nodeIds).toHaveLength(4); expect(inserted.nodes[1].parentIds).toEqual([]);
    expect(shotAnalysisCanvas(source, result, result.id, inserted, runtime).created).toEqual([]);
    expect(remapCanvasNodeReferences(inserted.nodes[1], id => id === 'n' ? 'copied-n' : undefined).shotAnalysisNodeId).toBe('copied-n');
    result.shots[1].clip.url = '/library/media/other/videos/private.mp4';
    expect(() => shotAnalysisCanvas(source, result, result.id, before, runtime)).toThrow('当前项目');
    expect(before.nodes).toHaveLength(1); expect(before.groups).toEqual([]);
  });
  it('rehomes explicit shot media without rewriting prompts or unknown extension data', async () => {
    const result = extracted(), url = result.source.url;
    const node = { id: 'n', type: 'shot-analysis', pluginId: 'nako.canvas-core', x: 0, y: 0, projectId: 'p', nodeRunId: 'old', nodeRequestId: 'old-request', nodeAnalysisRunId: 'cached', nodeDirectRunRequestId: 'old-request',
      parameters: { video: url, prompt: url }, pluginResult: { analysis: result }, prompt: url, extension: { url } };
    const document = { id: 'p', nodes: [node], groups: [] };
    const copy = vi.fn(async (source, projectId) => ({ id: 'copy-' + source.filename, projectId, url: `/library/media/${projectId}/${source.type}/${source.filename}` }));
    const prepared = await prepareProjectMedia(document, 'new', () => true, copy);
    const imported = resetSharedProject(prepared, 'new').nodes[0];
    expect(imported.parameters.video).toBe('/library/media/new/videos/input.mp4');
    expect(imported.prompt).toBe(url); expect(imported.parameters.prompt).toBe(url); expect(imported.extension.url).toBe(url);
    expect(imported.pluginResult.analysis.source.url).toBe('/library/media/new/videos/input.mp4');
    expect(imported.pluginResult.analysis.shots[0].frames[0]).toMatchObject({ projectId: 'new', url: '/library/media/new/images/s1.png', assetId: 'copy-s1.png' });
    expect(imported.pluginResult.analysis.id).toBe(result.id);
    expect(imported.nodeRunId).toBeUndefined(); expect(imported.nodeAnalysisRunId).toBeUndefined();
    expect(imported.nodeDirectRunRequestId).toBeUndefined();
    expect(copy.mock.calls.filter(([source]) => source.filename === 'input.mp4')).toHaveLength(1);
    expect(document.nodes[0].pluginResult.analysis.shots[0].frames[0].projectId).toBe('p');
  });
});

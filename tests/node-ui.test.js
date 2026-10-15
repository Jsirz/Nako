// @vitest-environment jsdom
import './helpers/modelCatalog.js';
import './helpers/mediaCanvas.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { installNodeFramework } from '../modules/canvas-ui/ui/nodes/nodeFramework';
import { connectCanvasNodes, disconnectCanvasNodes } from '../modules/canvas-ui/ui/canvas/canvasConnections';
import { nodeOutput, buildNodeGraph } from '../modules/canvas-ui/ui/nodes/nodeGraphSnapshot';
import { NodeCustomUi } from '../modules/canvas-ui/ui/nodes/nodeCustomUi';
import { nodeGenerationClient } from '../modules/canvas-ui/ui/nodes/nodeGenerationClient';
import { browserServices } from '../modules/kernel/browser';
import { inputMedia } from '../modules/generation-core/ui/generation/canvasGenerationRequests';
import { migrateCanvasNodes } from '../modules/canvas-ui/ui/nodes/migrateCanvasNodes';
import { NodeSchemaFields } from '../modules/canvas-ui/ui/nodes/nodeSchemaFields';
import { remapCanvasNodeReferences } from '../modules/canvas-ui/ui/canvas/canvasNodeReferences';
import { resetSharedProject } from '../modules/project/server/project/sharedProject.js';
import { chooseConnectionMode } from '../modules/canvas-ui/ui/nodes/canvasNodeRules';
import { buildVideoRequest } from '../modules/generation-core/ui/generation/canvasGenerationRequests';
import { MODEL_DEFINITIONS } from '../plugins/providers/work-fisher/protocol.js';
import { isVideoGenerationModeAllowed } from '../modules/generation-core/ui/generation/videoMode';
import { CanvasDimensions } from '../modules/canvas-ui/ui/nodes/canvasNodeControls';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete browserServices.__NAKO_NODE_FRAMEWORK__; });
function register() {
  const framework = installNodeFramework();
  framework.registerPackage({ manifest: { id: 'test.ui', version: '1.0.0', apiVersion: '^2.0.0', title: 'UI', nodes: [
    { type: 'source', version: '1.0.0', category: 'utility', inputs: [], outputs: ['first', 'second'].map(id => ({ id, media: ['text'] })), render: { kind: 'generic' } },
    { type: 'target', version: '2.0.0', category: 'utility', inputs: ['left', 'right'].map(id => ({ id, media: ['text'] })), outputs: [], render: { kind: 'generic' } },
  ] } });
  return framework;
}
describe('node canvas integration', () => {
  it('uses editing parameters for Seedance 2.5 while preserving normal generation preferences', async () => {
    const model = MODEL_DEFINITIONS.find(item => item.name === 'Seedance 2.5 Standard · Work-Fisher');
    const video = { id: 'v', type: 'Upload Video', resultUrl: '/library/media/p/videos/source.mp4' };
    const image = { id: 'i', type: 'Upload Image', resultUrl: '/library/media/p/images/character.png' };
    const target = { id: 't', type: 'Video', videoModel: model.name, videoMode: 'video-edit', parentIds: ['v', 'i'], duration: 5, aspectRatio: '1:1' };
    const request = await buildVideoRequest([video, image, target], target, 'replace the character', 'p', { videoModels: [model] });
    expect(request).toMatchObject({ videoMode: 'video-edit', duration: -1, aspectRatio: 'adaptive', images: [image.resultUrl], videos: [video.resultUrl] });
    expect(request.cost).toBeUndefined();
    expect(target).toMatchObject({ duration: 5, aspectRatio: '1:1' });
    const normal = await buildVideoRequest([video, image, target], { ...target, videoMode: 'multimodal' }, 'use as reference', 'p', { videoModels: [model] });
    expect(normal).toMatchObject({ videoMode: 'multimodal', duration: 5, aspectRatio: '1:1' });
    expect(isVideoGenerationModeAllowed('video-edit', { images: 1, videos: 0 }, model.videoModes)).toBe(false);
    expect(model.videoModes.find(mode => mode.value === 'video-edit').label).toBe('视频编辑');
  });
  it('shows original-video labels instead of a negative duration control', () => {
    const onUpdate = vi.fn();
    const view = render(React.createElement(props => CanvasDimensions(React, props), {
      data: { aspectRatio: 'adaptive', resolution: '480p' }, onUpdate,
      allRatios: ['adaptive'], supportedRatios: ['adaptive'], allResolutions: ['480p'], supportedResolutions: ['480p'],
      videoSettings: { duration: -1, fixed: true, audio: true, parameter: { key: 'duration', min: 4, max: 30 } },
    }));
    expect(view.getByRole('button', { name: '视频生成参数' }).textContent).toContain('原视频时长');
    expect(view.container.textContent).toContain('原视频比例');
    fireEvent.click(view.getByRole('button', { name: '视频生成参数' }));
    expect(view.getByText('跟随原视频')).toBeTruthy();
    expect(view.queryByRole('slider')).toBeNull();
    expect(view.container.textContent).not.toContain('-1');
    expect(onUpdate).not.toHaveBeenCalled();
  });
  it.each([
    ['谷歌OMNI Flash · Work-Fisher', 'video-edit'],
    ['Seedance 2.0 Standard · Work-Fisher', 'multimodal'],
  ])('connects a local video to %s and sends its saved path for provider upload', async (name, mode) => {
    const model = MODEL_DEFINITIONS.find(item => item.name === name);
    const source = { id: 'local', type: 'Upload Video', resultUrl: '/library/media/p/videos/source.mp4', networkUrl: 'https://expired.example.test/old.mp4' };
    const target = { id: 'target', type: 'Video', videoModel: name, videoMode: 'text-to-video' };
    const catalog = { video: [model], image: [], text: [], audio: [] };
    expect(chooseConnectionMode({ ...source, networkUrl: undefined }, target, [source, target], undefined, catalog)).toBe(mode);
    const nodes = connectCanvasNodes([source, target], { parentId: source.id, childId: target.id, connectionMode: mode, modeField: 'videoMode' });
    const request = await buildVideoRequest(nodes, nodes[1], 'change the sky', 'p', { videoModels: [model] });
    expect(request).toMatchObject({ videoMode: mode, videos: [source.resultUrl], projectId: 'p' });
    const unsupported = MODEL_DEFINITIONS.find(item => item.name === 'Veo Flash Lite · Work-Fisher');
    expect(chooseConnectionMode(source, { ...target, videoModel: unsupported.name }, nodes, undefined, { ...catalog, video: [unsupported] })).toBeNull();
    const maximum = model.videoModes.find(item => item.value === mode).allowedInputs.video;
    const occupied = Array.from({ length: maximum }, (_, i) => ({ ...source, id: 'existing' + i }));
    expect(chooseConnectionMode(source, { ...target, parentIds: occupied.map(item => item.id) }, [source, ...occupied], undefined, catalog)).toBeNull();
  });
  it('remaps copied stable links and never imports another project runtime authorization', () => {
    expect(remapCanvasNodeReferences({ inputLinks: [{ sourceNodeId: 'a', sourcePortId: 'out', targetPortId: 'in' }] }, id => id === 'a' ? 'new-a' : undefined))
      .toEqual({ inputLinks: [{ sourceNodeId: 'new-a', sourcePortId: 'out', targetPortId: 'in' }] });
    const project = resetSharedProject({ id: 'old', groups: [], nodes: [{ id: 'a', type: 'custom', x: 0, y: 0, nodeRunId: 'old-run', nodeRequestId: 'old-request', pluginResult: { result: 'keep' } }] }, 'new');
    expect(project.nodes[0].nodeRunId).toBeUndefined(); expect(project.nodes[0].nodeRequestId).toBeUndefined();
    expect(project.nodes[0].pluginResult).toEqual({ result: 'keep' });
  });
  it('preserves port identity and disconnects only the selected connection', () => {
    register();
    let nodes = [{ id: 'a', type: 'source', pluginId: 'test.ui' }, { id: 'b', type: 'target', pluginId: 'test.ui', nodeVersion: '1.0.0' }];
    nodes = connectCanvasNodes(nodes, { parentId: 'a', childId: 'b', sourcePortIndex: 1, portIndex: 1 });
    nodes = connectCanvasNodes(nodes, { parentId: 'a', childId: 'b', sourcePortIndex: 0, portIndex: 0 });
    expect(nodes[1].inputLinks).toEqual([{ sourceNodeId: 'a', sourcePortId: 'second', targetPortId: 'right' }, { sourceNodeId: 'a', sourcePortId: 'first', targetPortId: 'left' }]);
    const rejected = connectCanvasNodes(nodes, { parentId: 'a', childId: 'b', sourcePortIndex: 1, portIndex: 0 });
    expect(rejected).toEqual(nodes);
    const disconnected = disconnectCanvasNodes(nodes, { parentId: 'a', childId: 'b', portIndex: 0 });
    expect(disconnected[1].parentIds).toEqual(['a']); expect(disconnected[1].sourcePortIndices).toEqual([0]);
    expect(disconnected[1].inputLinks[0].targetPortId).toBe('left');
    expect(buildNodeGraph(nodes[1], nodes, 'p').nodes[0].nodeVersion).toBe('1.0.0');
  });
  it('selects the declared media output rather than stale text or another output', () => {
    const framework = register();
    framework.registerPackage({ manifest: { id: 'media.ui', version: '1.0.0', apiVersion: '^2.0.0', title: 'Media', nodes: [
      { type: 'media', version: '1.0.0', category: 'asset', inputs: [], outputs: [{ id: 'image', media: ['image'] }], render: { kind: 'generic' } },
    ] } });
    expect(nodeOutput({ id: 'i', type: 'media', pluginId: 'media.ui', textContent: '', resultUrl: '/image.png' }, 'image')).toBe('/image.png');
    const source = { id: 'a', type: 'source', pluginId: 'test.ui', outputPorts: [{ id: 'first', media: ['text'] }, { id: 'second', media: ['video'] }],
      pluginResult: { first: 'story', second: { type: 'video', url: '/video.mp4' } } };
    expect(inputMedia(source, 1)).toMatchObject({ kind: 'video', url: '/video.mp4' });
    expect(nodeOutput(source, 'first')).toBe('story');
  });
  it('accepts custom UI messages only from its iframe and channel, without an approval message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ html: '<p>Custom</p>' }) })));
    const onChange = vi.fn(), onRun = vi.fn();
    const view = render(React.createElement(NodeCustomUi, { packageId: 'test.ui', type: 'test', parameters: {}, onChange, onRun, onCancel() {} }));
    const frame = view.getByTitle('节点自定义界面');
    await waitFor(() => expect(frame.srcdoc).toContain('Content-Security-Policy'));
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts'); expect(frame.srcdoc).toContain("connect-src 'none'");
    const post = vi.spyOn(frame.contentWindow, 'postMessage');
    fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, data: { protocol: 'nako.node-ui/1', type: 'ready' } }));
    const channel = post.mock.calls.at(-1)[0].channel;
    const data = { protocol: 'nako.node-ui/1', type: 'parameters', channel, value: { prompt: 'hello' } };
    fireEvent(window, new MessageEvent('message', { source: window, data })); expect(onChange).not.toHaveBeenCalled();
    fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, data })); expect(onChange).toHaveBeenCalledWith({ prompt: 'hello' });
    fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, data: { ...data, type: 'approve' } })); expect(onRun).not.toHaveBeenCalled();
  });
  it('recovers all native generation outputs from a durable node receipt without resubmitting', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'run', projectId: 'p', status: 'success', nodes: [{ id: 'n', type: 'image' }], results: { n: { image: { url: '/a.png', urls: ['/a.png', '/b.png'] } } } }) }));
    vi.stubGlobal('fetch', fetcher);
    expect(await nodeGenerationClient.observe('p', 'n', 'attempt', new AbortController().signal)).toMatchObject({ status: 'success', attemptId: 'attempt', resultUrls: ['/a.png', '/b.png'] });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][0]).toContain('/api/node-runs/find?');
  });
  it('migrates stored parameters and source port links, preserving missing packages', () => {
    const framework = installNodeFramework();
    framework.registerPackage({ manifest: { id: 'migration.ui', version: '2.0.0', apiVersion: '^2.0.0', nodes: [
      { type: 'migrate', version: '2.0.0', category: 'utility', inputs: [], outputs: [{ id: 'new', media: ['text'] }],
        render: { kind: 'generic' }, migrations: [{ from: '1.0.0', to: '2.0.0', renameOutputs: { old: 'new' }, renameParameters: { before: 'after' } }] },
    ] } });
    const nodes = [{ id: 'a', type: 'migrate', pluginId: 'migration.ui', nodeVersion: '1.0.0', parameters: { before: 'value' }, pluginResult: { old: 'answer' } },
      { id: 'b', type: 'missing', pluginId: 'other.ui', inputLinks: [{ sourceNodeId: 'a', sourcePortId: 'old', targetPortId: 'in' }] }];
    const result = migrateCanvasNodes(nodes);
    expect(result[0]).toMatchObject({ nodeVersion: '2.0.0', parameters: { after: 'value' }, pluginResult: { new: 'answer' } });
    expect(result[1].type).toBe('missing'); expect(result[1].inputLinks[0].sourcePortId).toBe('new');
    expect(nodes[0].parameters).toEqual({ before: 'value' }); expect(migrateCanvasNodes(result)).toBe(result);
  });
  it('keeps invalid JSON drafts editable and updates fields after external changes', () => {
    const onChange = vi.fn(), properties = { values: { type: 'array', title: 'Values' } };
    const view = render(React.createElement(NodeSchemaFields, { properties, values: { values: [1] }, onChange }));
    fireEvent.change(view.getByRole('textbox'), { target: { value: '[' } });
    expect(view.getByRole('alert').textContent).toContain('JSON'); expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(view.getByRole('textbox'), { target: { value: '[2]' } }); expect(onChange).toHaveBeenCalledWith('values', [2]);
    view.rerender(React.createElement(NodeSchemaFields, { properties, values: { values: [3] }, onChange }));
    expect(view.getByRole('textbox').value).toBe('[3]');
  });
});

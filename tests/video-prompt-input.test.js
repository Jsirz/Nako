// @vitest-environment jsdom
import './helpers/promptComposition.js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CanvasVideoComposer } from '../modules/canvas-ui/ui/nodes/canvasVideoComposer.tsx';
import { prepareCanvasGenerationRequest } from '../modules/generation-core/ui/generation/canvasGeneration.ts';
import { browserHost } from '../modules/kernel/browser';
import { externalReferenceMedia } from '../modules/generation-core/ui/generation/canvasGenerationRequests';
import { installVideoModeAdapter } from '../modules/generation-core/ui/generation/videoMode';

vi.mock('../modules/canvas-ui/ui/nodes/useGenerationAvailability.ts', () => ({
  useGenerationAvailability: () => ({ checking: false, blocked: false, warning: '' }),
}));
let dispose;
beforeEach(() => { dispose = browserHost.services.register('ui.generation.interaction', {
  externalReferences: externalReferenceMedia, videoModes: () => installVideoModeAdapter(),
}); });
afterEach(() => { cleanup(); dispose(); });
const empty = () => null;
const models = { videoModels: [{ name: 'video-test', videoModes: [{ value: 'text-to-video', label: 'Video' }] }] };
const components = {
  models: models.videoModels, ratios: [], resolutions: [],
  PromptEditor: ({ value, onChange }) => React.createElement('textarea', {
    'aria-label': 'Prompt', value, onChange: event => onChange(event.target.value),
  }),
  ConnectedAssets: empty, ModelSelector: empty, Dimensions: empty, AdvancedSettings: empty,
  CreativeLibraryTools: empty, CreativePromptTokens: empty,
  Tooltip: ({ children }) => children, CollapseIcon: empty, SettingsIcon: empty,
  GenerateIcon: () => React.createElement('span', null, 'Generate'),
};
const video = { id: 'video', type: 'Video', videoModel: 'video-test', duration: 4, parentIds: ['a', 'b'] };
const texts = [
  { id: 'a', type: 'Text', textContent: 'first', x: 0, y: 0 },
  { id: 'b', type: 'Text', textContent: 'second', x: 0, y: 100 },
];
function Composer(props) { return CanvasVideoComposer(React, props, components); }
function mount(node, assets = texts) {
  const props = { data: node, connectedImageNodes: assets, onUpdate: vi.fn(), onGenerate: vi.fn(), onSelect: vi.fn() };
  return { ...render(React.createElement(Composer, props)), props };
}

it('keeps the local prompt through connection changes and edits only the video node', () => {
  const view = mount({ ...video, prompt: 'local' });
  expect(view.getByRole('textbox').value).toBe('local');
  expect(view.props.onUpdate).not.toHaveBeenCalled();
  fireEvent.change(view.getByRole('textbox'), { target: { value: 'edited' } });
  expect(view.props.onUpdate.mock.calls).toEqual([['video', { prompt: 'edited' }]]);
  view.rerender(React.createElement(Composer, { ...view.props, data: { ...video, prompt: 'edited' }, connectedImageNodes: [] }));
  expect(view.getByRole('textbox').value).toBe('edited');
  expect(texts.map(node => node.textContent)).toEqual(['first', 'second']);
});

it('shows an empty editor but allows generation with a nonempty second upstream text', () => {
  const view = mount(video, [{ ...texts[0], textContent: '' }, texts[1]]);
  expect(view.getByRole('textbox').value).toBe('');
  const generate = view.getByRole('button', { name: 'Generate' });
  expect(generate.disabled).toBe(false);
  fireEvent.click(generate);
  expect(view.props.onGenerate).toHaveBeenCalledWith('video');
  expect(view.props.onUpdate).not.toHaveBeenCalled();
});

it('accepts declared plugin text output and disables generation when all text is empty', () => {
  const plugin = { id: 'plugin', type: 'custom', outputPorts: [{ id: 'result', media: ['text'] }], pluginResult: { result: 'plugin text' } };
  const view = mount(video, [plugin]);
  expect(view.getByRole('textbox').value).toBe('');
  expect(view.getByRole('button', { name: 'Generate' }).disabled).toBe(false);
  view.rerender(React.createElement(Composer, { ...view.props, connectedImageNodes: [{ ...texts[0], textContent: '  ' }] }));
  expect(view.getByRole('button', { name: 'Generate' }).disabled).toBe(true);
});

it('submits upstream text and the independent local prompt exactly once, retaining either alone', async () => {
  const node = { ...video, prompt: 'local', parentIds: ['b', 'a'] };
  const nodes = [...texts, node];
  expect((await prepareCanvasGenerationRequest(nodes, node, 'project', models)).prompt).toBe('first\nsecond\nlocal');
  expect((await prepareCanvasGenerationRequest(nodes, { ...node, prompt: '' }, 'project', models)).prompt).toBe('first\nsecond');
  expect((await prepareCanvasGenerationRequest(nodes, { ...node, parentIds: [] }, 'project', models)).prompt).toBe('local');
});

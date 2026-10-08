// @vitest-environment jsdom
import './helpers/promptComposition.js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
import { browserHost } from '../modules/kernel/browser.ts';
import { createDefaultModelsClient } from '../modules/generation-core/ui/generation/defaultModelsClient.ts';
import { mountDefaultModelsSettings } from '../modules/generation-core/ui/generation/defaultModelsSettings.ts';
import { createCanvasNode } from '../modules/canvas-ui/ui/nodes/canvasNodeOperations.ts';
import { createNodeFramework } from '../modules/canvas-ui/ui/nodes/nodeFramework.ts';
import {
  buildAudioRequest,
  buildImageRequest,
  buildTextRequest,
  buildVideoRequest,
} from '../modules/generation-core/ui/generation/canvasGenerationRequests.ts';
import {
  createCanvasGeneration,
  prepareCanvasGenerationRequest,
} from '../modules/generation-core/ui/generation/canvasGeneration.ts';

const kinds = ['text', 'image', 'video', 'audio'];
const models = Object.fromEntries(
  kinds.map((kind) => [kind + 'Models', [{ name: kind + ' A' }, { name: kind + ' B' }]]),
);
let client, snapshot, release, fetcher;
beforeEach(async () => {
  snapshot = {
    defaults: Object.fromEntries(kinds.map((kind) => [kind, kind + ' B'])),
    candidates: Object.fromEntries(
      kinds.map((kind) => [
        kind,
        models[kind + 'Models'].map((model) => ({ ...model, configured: true })),
      ]),
    ),
  };
  fetcher = vi.fn(async (_url, init) => {
    if (init.method === 'PUT') Object.assign(snapshot.defaults, JSON.parse(init.body));
    return Response.json(structuredClone(snapshot));
  });
  client = createDefaultModelsClient(fetcher);
  await client.read();
  release = browserHost.services.register('generation.defaults', client);
});
afterEach(() => {
  release();
  document.body.replaceChildren();
});

it('uses the shared choice for all new canvas nodes and never overwrites explicit fresh-node models', async () => {
  const runtime = { ...models, createId: () => crypto.randomUUID(), templates: [] };
  for (const kind of kinds) {
    const node = createCanvasNode(
      runtime,
      kind[0].toUpperCase() + kind.slice(1),
      { x: 0, y: 0 },
      'project-1',
    );
    expect(node[kind + 'Model']).toBe(kind + ' B');
    expect(node.model).toBe(kind + ' B');
  }
  expect(
    createNodeFramework().createFresh({
      id: 'explicit',
      type: 'Image',
      x: 0,
      y: 0,
      imageModel: 'image A',
      resolution: '4K',
    }),
  ).toMatchObject({ imageModel: 'image A', resolution: '4K' });
  await client.update({ image: 'image A' });
  expect(createCanvasNode(runtime, 'Image', { x: 0, y: 0 }, 'project-1').imageModel).toBe(
    'image A',
  );
});

it('fills missing request models for each media type but preserves explicit choices', async () => {
  for (const [kind, build] of Object.entries({
    text: buildTextRequest,
    image: buildImageRequest,
    video: buildVideoRequest,
    audio: buildAudioRequest,
  })) {
    const node = { id: 'test', type: kind[0].toUpperCase() + kind.slice(1), x: 0, y: 0 };
    expect((await build([], node, 'test', 'project-1', models))[kind + 'Model']).toBe(kind + ' B');
    expect(
      (await build([], { ...node, [kind + 'Model']: kind + ' A' }, 'test', 'project-1', models))[
        kind + 'Model'
      ],
    ).toBe(kind + ' A');
    expect(node[kind + 'Model']).toBeUndefined();
  }
});

it('runs an approved missing-model node with the confirmed model even after defaults change, and rejects changed prompts', async () => {
  let nodes = [{ id: 'text-node', type: 'Text', x: 0, y: 0, prompt: 'test' }];
  const prepared = await prepareCanvasGenerationRequest(nodes, nodes[0], 'project-1', models);
  expect(prepared.textModel).toBe('text B');
  await client.update({ text: 'text A' });
  const runtime = {
    now: Date.now,
    concurrency: async () => ({ blocked: false }),
    text: vi.fn(async () => ({ text: 'done' })),
  };
  const generation = createCanvasGeneration(
    {
      getNodes: () => nodes,
      getProjectId: () => 'project-1',
      updateNode(id, patch) {
        nodes = nodes.map((node) => (node.id === id ? { ...node, ...patch } : node));
      },
    },
    models,
    runtime,
  );
  const authorization = {
    valid: () => true,
    request: JSON.stringify(prepared),
    submitted: vi.fn(),
  };
  await generation.handleGenerate('text-node', authorization);
  expect(runtime.text).toHaveBeenCalledTimes(1);
  expect(runtime.text.mock.calls[0][0].textModel).toBe('text B');
  nodes = [{ id: 'changed', type: 'Text', x: 0, y: 0, prompt: 'changed' }];
  await generation.handleGenerate('changed', authorization);
  expect(runtime.text).toHaveBeenCalledTimes(1);
});

it('settings filter unconfigured sources, persist selections and preserve the previous value on save failure', async () => {
  snapshot.candidates.image[0].configured = false;
  const mounted = mountDefaultModelsSettings(document.body);
  await waitFor(() => expect(document.querySelectorAll('select')).toHaveLength(4));
  expect(
    [...document.querySelector('[aria-label="默认图像模型"]').options].map(
      (option) => option.value,
    ),
  ).toEqual(['', 'image B']);
  fireEvent.change(document.querySelector('[aria-label="默认文本模型"]'), {
    target: { value: 'text A' },
  });
  await waitFor(() => expect(client.get('text')).toBe('text A'));
  await waitFor(() => expect(document.body.textContent).toContain('已保存'));
  fetcher.mockImplementationOnce(async () =>
    Response.json({ error: 'fixture save failed' }, { status: 500 }),
  );
  fireEvent.change(document.querySelector('[aria-label="默认文本模型"]'), {
    target: { value: 'text B' },
  });
  await waitFor(() => expect(document.body.textContent).toContain('fixture save failed'));
  expect(client.get('text')).toBe('text A');
  expect(document.querySelector('[aria-label="默认文本模型"]').value).toBe('text A');
  mounted.dispose();
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createPreferenceStore } from '../modules/identity-account/server/preferences/preferenceStore.js';
import {
  createDefaultModelsService,
  createDefaultModelsRouter,
} from '../modules/generation-core/server/generation/defaultModels.js';
import { generationProviders } from '../modules/generation-core/providerRegistry.js';
import { loadModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import { createGenerationRouter } from '../modules/generation-core/server/routes/generation.js';
import { createGenerationRuntime } from '../modules/generation-core/server/generation/generationRuntime.js';
import { createDramaModelGenerator } from '../modules/agent/server/agent/drama/dramaModelGenerator.js';
import { createTextGenerationService } from '../plugins/platform/text-transport/service.js';

const kinds = ['text', 'image', 'video', 'audio'];
const catalog = loadModelCatalog();
const selections = Object.fromEntries(
  kinds.map((kind) => [
    kind,
    Object.values(catalog).find(
      (model) =>
        model.provider ===
        {
          text: 'EcloudTextProvider',
          image: 'EcloudImageProvider',
          video: 'EcloudVideoProvider',
          audio: 'EcloudAudioProvider',
        }[kind],
    ) ||
      Object.values(catalog).find((model) =>
        model.provider?.endsWith(kind[0].toUpperCase() + kind.slice(1) + 'Provider'),
      ),
  ]),
);
let directory, defaults, cleanups, handlers, configured;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'nako-defaults-'));
  cleanups = [];
  handlers = {};
  configured = true;
  for (const [kind, model] of Object.entries(selections)) {
    const method = 'generate' + kind[0].toUpperCase() + kind.slice(1);
    handlers[kind] = vi.fn(async () =>
      kind === 'text'
        ? { text: 'fixture response' }
        : {
            buffer: Buffer.from('fixture'),
            format: { image: 'png', video: 'mp4', audio: 'mp3' }[kind],
          },
    );
    cleanups.push(
      generationProviders.register(
        { name: model.provider, kinds: [kind], execution: 'immediate', requiredSecrets: ['FIXTURE_KEY'] },
        { [method]: handlers[kind] },
      ),
    );
  }
  defaults = createDefaultModelsService({
    repository: createPreferenceStore(directory),
    readSecret: () => (configured ? 'fake-fixture-key' : ''),
  });
});
afterEach(async () => {
  for (const dispose of cleanups.reverse()) await dispose();
  await rm(directory, { recursive: true, force: true });
});
const names = () => Object.fromEntries(kinds.map((kind) => [kind, selections[kind].name]));

it('persists per-kind defaults and preserves unrelated preferences across a new storage instance', async () => {
  await createPreferenceStore(directory).update({ set: { theme: 'dark' } });
  await defaults.update(names());
  const reopened = createDefaultModelsService({
    repository: createPreferenceStore(directory),
    readSecret: () => 'fake-fixture-key',
  });
  expect((await reopened.read()).defaults).toEqual(names());
  for (const kind of kinds) expect(await reopened.resolve(kind, '  ')).toBe(selections[kind].name);
  expect((await createPreferenceStore(directory).read()).values.theme).toBe('dark');
  await Promise.all([reopened.update({ text: '' }), reopened.update({ video: '' })]);
  expect((await reopened.read()).defaults).toEqual({ ...names(), text: '', video: '' });
});

it('does not guess a model, cross media kinds, overwrite explicit selections or switch an unavailable default', async () => {
  await expect(defaults.resolve('text')).rejects.toMatchObject({ code: 'DEFAULT_MODEL_REQUIRED' });
  await defaults.update(names());
  await expect(defaults.update({ image: selections.text.name })).rejects.toMatchObject({
    code: 'DEFAULT_MODEL_UNAVAILABLE',
  });
  await expect(defaults.update({ typo: 'anything' })).rejects.toMatchObject({
    code: 'INVALID_DEFAULT_MODELS',
  });
  configured = false;
  await expect(defaults.resolve('text')).rejects.toMatchObject({
    code: 'DEFAULT_MODEL_UNAVAILABLE',
  });
  expect(await defaults.resolve('text', 'explicit-even-if-unavailable')).toBe(
    'explicit-even-if-unavailable',
  );
  expect((await defaults.read()).defaults.text).toBe(selections.text.name);
  await defaults.update({ text: '' });
  await expect(defaults.resolve('text')).rejects.toMatchObject({ code: 'DEFAULT_MODEL_REQUIRED' });
});

it('resolves all four HTTP generation entries before persisting task identity and invoking the provider', async () => {
  await defaults.update(names());
  const tasks = new Map();
  const runtime = createGenerationRuntime({
    taskStore: {
      get: (id) => tasks.get(id),
      upsert(task) {
        tasks.set(task.nodeId, task);
        return task;
      },
    },
  });
  const app = express();
  app.use(express.json());
  app.use('/api', createDefaultModelsRouter(defaults));
  app.use(
    '/api',
    createGenerationRouter({
      defaultModels: defaults,
      applicationContext: {},
      generationCoordinator: runtime.coordinator,
      mediaService: {
        saveBuffer: () => ({ url: '/library/fixture-result' }),
        createId: () => 'fixture',
      },
    }),
  );
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const removed = await fetch(origin + '/api/generation-concurrency?' + new URLSearchParams({
    modelName: 'GPT-5.6 Luna · Work-Fisher', mode: '',
  }));
  expect(removed.status).toBe(400);
  expect(await removed.json()).toMatchObject({
    code: 'INVALID_MODEL_CONFIGURATION', error: expect.stringContaining('请重新选择模型'),
  });
  const available = await fetch(origin + '/api/generation-concurrency?' + new URLSearchParams({
    modelName: selections.text.name, mode: '',
  }));
  expect(available.status).toBe(200);
  expect(await available.json()).toMatchObject({ blocked: false, inFlight: 0 });
  for (const kind of kinds) {
    const mode = Object.keys(selections[kind].endpoint)[0];
    const response = await fetch(origin + '/api/generate-' + kind, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: 'node-' + kind,
        generationAttemptId: 'attempt-' + kind,
        projectId: 'project-1',
        prompt: 'fixture',
        [kind === 'text' ? 'languageMode' : kind + 'Mode']: mode,
      }),
    });
    expect(await response.json()).not.toHaveProperty('error');
    expect(response.status).toBe(200);
    expect(handlers[kind]).toHaveBeenCalledTimes(1);
    expect(handlers[kind].mock.calls[0][0][kind + 'Model']).toBe(
      selections[kind].endpoint[mode].model || selections[kind].name,
    );
    expect(tasks.get('node-' + kind).modelName).toBe(selections[kind].name);
  }
  const settings = await fetch(origin + '/api/generation/default-models');
  expect(settings.headers.get('cache-control')).toBe('no-store');
  expect(JSON.stringify(await settings.json())).not.toContain('fake-fixture-key');
});

it('uses the default text model for prompt and drama generation without changing explicit requests', async () => {
  await defaults.update({ text: selections.text.name });
  const requests = [];
  const generate = createDramaModelGenerator({
    defaultModels: defaults,
    getCredentials: () => ({ FIXTURE_KEY: 'test-only' }),
    readImages: async () => [],
    textTransport: createTextGenerationService({
      modelCatalog: loadModelCatalog, credentials: { get: () => ({ ECLOUD_API_KEY: 'test-only' }) },
      fetcher: async (_url, init) => {
        requests.push(JSON.parse(init.body));
        return Response.json({
          choices: [
            { message: { role: 'assistant', content: 'fixture answer' }, finish_reason: 'stop' },
          ],
        });
      },
    }),
  });
  expect(
    await generate({
      projectId: 'project-1',
      messages: [
        { role: 'system', content: 'test instructions' },
        { role: 'user', content: 'test' },
      ],
    }),
  ).toBe('fixture answer');
  expect(requests[0].model).toBe(selections.text.endpoint['multimodal-chat'].model);
  await defaults.update({ text: '' });
  expect(
    await generate({
      projectId: 'project-1',
      model: selections.text.name,
      messages: [
        { role: 'system', content: 'test instructions' },
        { role: 'user', content: 'test' },
      ],
    }),
  ).toBe('fixture answer');
});

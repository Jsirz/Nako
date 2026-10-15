import './helpers/modelCatalog.js';
import { it, expect, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createLocalWorkspace } from '../modules/identity-account/desktop/localWorkspace.mjs';
import { createBackendEnvironment } from '../apps/desktop/src/backendEnvironment.mjs';
import { loadModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import { createDramaExecutionService } from '../modules/agent/server/agent/drama/dramaExecutionService.js';
import { createImageAngleDraft } from '../modules/asset-media/ui/media/imageAngleDraft';
import { IMAGE_MODELS } from '../modules/generation-core/models/catalog';
import { browserHost } from '../modules/kernel/browser';
import { createDefaultModelsClient } from '../modules/generation-core/ui/generation/defaultModelsClient';

it('selects existing local data without reading retired device secrets', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-local-workspace-'));
  const id = '0d25bfe4-d697-4595-9b42-de3f85455779';
  const selectWorkspace = vi.fn(async () => id);
  const network = vi.fn(() => {
    throw new Error('Unexpected network call');
  });
  try {
    await writeFile(
      path.join(directory, 'device-identity.bin'),
      Buffer.concat([
        Buffer.from('AFDEVICE1'),
        Buffer.from(
          JSON.stringify({
            localUserId: id,
            secret: 'retired-device-secret',
            refreshToken: 'retired-cloud-token',
          }),
        ),
      ]),
    );
    const options = {
      installation: { state: directory },
      selectWorkspace,
      safeStorage: { decryptString: (bytes) => bytes.toString() },
      net: { fetch: network },
      readIssuer: network,
    };
    const workspace = createLocalWorkspace(options);
    expect((await workspace.restore()).ready).toBe(true);
    expect(workspace.userId()).toBe(id);
    expect(JSON.parse(await readFile(path.join(directory, 'workspace.json'), 'utf8'))).toEqual({
      version: 1,
      localUserId: id,
    });
    expect((await createLocalWorkspace(options).restore()).ready).toBe(true);
    expect(selectWorkspace).toHaveBeenCalledTimes(1);
    expect(network).not.toHaveBeenCalled();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each(['win32', 'darwin'])('exposes local desktop capabilities without cloud bridges on %s', async (platform) => {
  const surfaces = {};
  vm.runInNewContext(await readFile('apps/desktop/src/preload.cjs', 'utf8'), {
    process: { platform },
    require: () => ({
      contextBridge: { exposeInMainWorld: (name, value) => (surfaces[name] = value) },
      ipcRenderer: { sendSync: () => 'test' },
      webUtils: {},
    }),
  });
  const desktop = surfaces.nakoDesktop,
    shell = surfaces.nakoShell;
  expect(desktop.integratedTitleBar).toBe(platform !== 'darwin');
  for (const name of ['account', 'update', 'openAdmin', 'returnToLogin'])
    expect(desktop[name]).toBeUndefined();
  for (const name of ['signIn', 'signOut', 'register', 'recoverPassword'])
    expect(shell.identity[name]).toBeUndefined();
  expect(shell.update).toBeUndefined();
  expect(desktop.switchWorkspace).toBeUndefined();
  expect(typeof shell.identity.restore).toBe('function');
});

it('ignores stale official environment settings while retaining third-party credentials', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-local-env-'));
  try {
    const installation = {
      data: directory,
      config: directory,
      logs: directory,
      envFile: path.join(directory, 'config.env'),
      envTemplate: path.join(directory, 'absent.env'),
      code: process.cwd(),
    };
    const helpers = {
      providerSecretKeys: ['OPENAI_API_KEY'],
      credentialFileName: 'keys.bin',
      loadProductVersion: async () => 'test',
      createCredentialStore: () => ({
        read: async () => ({ OPENAI_API_KEY: 'fixture-openai-key' }),
        update: vi.fn(),
      }),
    };
    const result = await createBackendEnvironment({
      installation,
      helpers,
      userId: '0d25bfe4-d697-4595-9b42-de3f85455779',
      pipe: 'fixture-pipe',
      baseEnvironment: {
        NAKO_IDENTITY_ORIGIN: 'https://identity.work-fisher.com',
        NAKO_ACCESS_TOKEN: 'retired-access-token',
        RELAY_API_KEY: 'retired-key',
      },
    });
    expect(result.OPENAI_API_KEY).toBe('fixture-openai-key');
    expect(result.NAKO_IDENTITY_ORIGIN).toBeUndefined();
    expect(result.NAKO_ACCESS_TOKEN).toBeUndefined();
    expect(result.RELAY_API_KEY).toBeUndefined();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('publishes only remaining model contributions and rejects old relay models', () => {
  const models = Object.values(loadModelCatalog());
  expect(models).toHaveLength(142);
  expect(models.some((model) => model.provider === 'DoubaoImageProvider')).toBe(true);
  expect(
    models.some((model) => model.provider.startsWith('Relay') || model.source === 'relay'),
  ).toBe(false);
  const workFisher = models.filter(model => model.source === 'work_fisher');
  expect(workFisher).toHaveLength(55);
  expect(workFisher.every(model => model.provider.startsWith('WorkFisher'))).toBe(true);
  expect(JSON.stringify(models.filter(model => model.source !== 'work_fisher'))).not.toMatch(/work-fisher\.com/);
});

it('rejects retired paid scene presets before persisting or submitting any task', async () => {
  const write = vi.fn(),
    submit = vi.fn();
  const service = createDramaExecutionService({
    planStore: {
      get: async () => ({
        id: 'plan',
        projectId: 'project',
        revision: 1,
        approvedRevision: 1,
        assets: [{ id: 'scene', kind: 'scene' }],
      }),
    },
    libraryDirectory: 'test-library',
    executionStore: { root: 'test-root', read: vi.fn(), write },
    generationCoordinator: {},
    compileSegment: vi.fn(),
    testRunService: { start: submit },
  });
  await expect(
    service.beginAsset({
      planId: 'plan',
      projectId: 'project',
      planRevision: 1,
      assetId: 'scene',
      attemptId: 'attempt',
      confirmPaidExecution: true,
      maxAssets: 1,
    }),
  ).rejects.toMatchObject({ code: 'DRAMA_MODEL_UNAVAILABLE' });
  expect(write).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
});

it.each([null, { azimuth: 45, elevation: 15, zoom: 5 }])('creates an image-tool draft using the current default with angle %j', async (angle) => {
  const source = { id: 'source', type: 'Image', resultUrl: '/library/image.png', x: 0, y: 0 };
  const previous = IMAGE_MODELS.find((model) => model.provider === 'DoubaoImageProvider');
  const current = IMAGE_MODELS.find((model) => model.provider === 'WorkFisherImageProvider');
  const snapshot = {
    defaults: { text: '', image: previous.name, video: '', audio: '' },
    candidates: { text: [], image: [previous, current].map(({ name }) => ({ name, configured: true })), video: [], audio: [] },
  };
  const defaults = createDefaultModelsClient(async (_url, options) => {
    if (options.method === 'PUT') Object.assign(snapshot.defaults, JSON.parse(options.body));
    return Response.json(snapshot);
  });
  await defaults.read();
  const release = browserHost.services.register('generation.defaults', defaults);
  const runtime = {
    create: () => ({ id: 'draft', type: 'Image' }),
    width: () => 300,
    configure: (nodes, id, patch) =>
      nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    connect: (nodes, sourceId, targetId) =>
      nodes.map((node) => (node.id === targetId ? { ...node, parentIds: [sourceId] } : node)),
  };
  try {
    const original = createImageAngleDraft([source], source.id, angle, 'project', runtime);
    expect(original.nodes.find((node) => node.id === original.id).imageModel).toBe(previous.name);
    await defaults.update({ image: current.name });
    const result = createImageAngleDraft([source], source.id, angle, 'project', runtime);
    const draft = result.nodes.find((node) => node.id === result.id);
    expect(draft.imageModel).toBe(current.name);
    expect(current.resolutions).toContain(draft.resolution);
    expect(current.aspectRatios).toContain(draft.aspectRatio);
    expect(draft.parentIds).toEqual([source.id]);
    expect(draft.imageAngle).toEqual(angle);
    expect(original.nodes.find((node) => node.id === original.id).imageModel).toBe(previous.name);
  } finally {
    release();
  }
});

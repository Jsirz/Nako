import { createDramaConversationService } from '../modules/agent/server/agent/drama/dramaConversation.js';
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import express from 'express';
import { createServerPluginHost } from './helpers/serverPluginHost.js';
import { createTextGenerationService } from '../plugins/platform/text-transport/service.js';
import { createMediaAssetRouter } from '../modules/asset-media/api/server/media/mediaAssetRouter.js';
import { createMediaEditingRouter } from '../modules/asset-media/api/server/media/mediaEditingRouter.js';
import { createDramaModelGenerator } from '../modules/agent/api/server/agent/drama/dramaModelGenerator.js';
import { loadModelCatalog } from '../modules/generation-core/api/server/config/modelCatalog.js';
import { createAgentRouter } from '../modules/agent/server/agent/agentRouter.js';
import { createAgentClient } from '../modules/agent/ui/agent/agentClient.ts';
import { createAgentWorkspaceStore } from '../plugins/storage/agent-files/agentWorkspaceStore.js';
import { createMediaLibraryRouter } from '../modules/asset-media/server/media/mediaLibraryRouter.js';

describe('built-in plugins with isolated local storage', () => {
  it('persists conversation options and defaults older workspace drafts to confirmation', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-conversation-options-'));
    try {
      const store = createAgentWorkspaceStore(directory);
      const initial = await store.read('project-1');
      expect(initial.value).toMatchObject({
        generationApproval: 'confirm',
        thinkingEnabled: null,
        thinkingEffort: '',
      });
      const { generationApproval, thinkingEnabled, thinkingEffort, ...legacy } = initial.value;
      const old = await store.write('project-1', 0, legacy);
      expect(old.value.generationApproval).toBe('confirm');
      await store.write('project-1', 1, {
        ...old.value,
        generationApproval: 'direct',
        thinkingEnabled: false,
        thinkingEffort: 'low',
      });
      expect((await createAgentWorkspaceStore(directory).read('project-1')).value).toMatchObject({
        generationApproval: 'direct',
        thinkingEnabled: false,
        thinkingEffort: 'low',
      });
      await expect(
        store.write('project-1', 2, { ...old.value, generationApproval: 'invalid' }),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('reads scoped non-enumerable credentials for Agent chat and observes key changes', async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'nako-agent-credentials-'));
    const secrets = { ECLOUD_API_KEY: 'test-ecloud-initial', ARK_API_KEY: 'test-other-source' };
    let host, server, harness;
    try {
      host = await createServerPluginHost({
        libraryDirectory: path.join(temporaryRoot, 'library'),
        readSecret: (key) => secrets[key],
        configuration: { disabled: [], options: {} },
      });
      const transport = host.services.get('generation.textTransport');
      expect(transport).not.toHaveProperty('credentials');
      const model = Object.values(loadModelCatalog()).find(
        (item) =>
          item.provider === 'EcloudTextProvider' &&
          item.endpoint['multimodal-chat'].model === 'zhipu/glm-5.3-flash',
      );
      const fetcher = vi.fn(async (url, input) => {
        expect(url).toBe(model.endpoint['multimodal-chat'].url);
        expect(new Headers(input.headers).get('authorization')).toBe(
          `Bearer ${secrets.ECLOUD_API_KEY.trim()}`,
        );
        expect(JSON.parse(input.body).model).toBe('zhipu/glm-5.3-flash');
        expect(JSON.stringify(JSON.parse(input.body).messages)).toContain('data:image/png;base64,');
        return Response.json({
          choices: [
            { message: { role: 'assistant', content: 'mock reply' }, finish_reason: 'stop' },
          ],
        });
      });
      const store = host.services.get('agent.persistence').createSessionStore();
      const app = express();
      app.use(express.json());
      app.use(
        createAgentRouter({
      createDramaConversation: (sessionStore) => createDramaConversationService({ sessionStore }),
          sessionStore: store,
          textTransport: createTextGenerationService({
            fetcher, modelCatalog: loadModelCatalog, credentials: { get: () => secrets },
          }),
          mediaService: host.services.get('media.agent'),
          onHarness: (value) => {
            harness = value;
          },
        }),
      );
      server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
      });
      const origin = `http://127.0.0.1:${server.address().port}`;
      const client = createAgentClient((url, init) => fetch(origin + url, init));
      const imageBytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#4488ff' } }).png().toBuffer();
      const input = {
        sessionId: 'credential-session',
        projectId: 'credential-project',
        message: 'hello',
        model: model.name,
        media: [{ type: 'image', url: 'data:image/png;base64,' + imageBytes.toString('base64') }],
      };
      for (const key of ['test-ecloud-initial', ' test-ecloud-rotated ']) {
        secrets.ECLOUD_API_KEY = key;
        expect((await client.streamMessage(input, () => {})).response).toBe('mock reply');
      }
      expect(fetcher).toHaveBeenCalledTimes(2);
      const retiredMedia = await fetch(origin + '/api/agent/v2/runs', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...input, protocol: 2, operationId: 'retired-media', media: [{ type: 'image', base64: imageBytes.toString('base64') }] }),
      });
      expect(retiredMedia.status).toBe(400);
      for (const key of [undefined, '   ']) {
        secrets.ECLOUD_API_KEY = key;
        const response = await fetch(origin + '/api/agent/v2/runs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...input, protocol: 2, operationId: 'missing-key' }),
        });
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ code: 'AI_CONFIGURATION_REQUIRED' });
      }
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(await store.get(input.sessionId))).not.toContain('test-ecloud-');
      expect(transport).not.toHaveProperty('credentials');
    } finally {
      await harness?.close();
      if (server) await new Promise((resolve) => server.close(resolve));
      await host?.stop();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
  it('boots providers and delegates media/library operations to the filesystem plugin', async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'nako-integration-'));
    const directory = path.join(temporaryRoot, 'library');
    let host;
    let server;
    try {
      host = await createServerPluginHost({
        libraryDirectory: directory,
        readSecret: () => undefined,
        configuration: { disabled: [], options: {} },
      });
      expect(host.services.get('generation.providers').list()).toHaveLength(30);
      expect(host.services.get('workflow.executors').list()).toEqual([
        'local-comfyui',
        'runninghub-workflow',
        'runninghub-webapp',
      ]);
      const repository = host.services.get('project.repository');
      const saved = await repository.save({
        id: 'project-test',
        title: 'Plugin project',
        nodes: [],
        edges: [],
        revision: 0,
      });
      expect((await repository.get(saved.id)).title).toBe('Plugin project');
      expect(await readdir(directory)).toContain('workflows.db');
      const store = host.services.get('media.store');
      const data = await sharp({
        create: { width: 32, height: 24, channels: 3, background: '#4488ff' },
      })
        .png()
        .toBuffer();
      const asset = await store.save({
        type: 'image',
        projectId: saved.id,
        data,
        name: 'sample.png',
      });
      expect((await store.read(asset.id)).url).toBe(asset.url);
      const cropped = await host.services
        .get('media.processor')
        .crop({ assetId: asset.id, left: 0, top: 0, width: 8, height: 10 });
      expect(cropped.width).toBe(8);
      expect(cropped.height).toBe(10);
      const generationMedia = host.services.get('media.generation');
      const generated = generationMedia.saveBuffer(
        data,
        saved.id,
        'images',
        'png',
        { model: 'Test', prompt: 'local test' },
        'test-node',
      );
      expect(generationMedia.findLatest('test-node').resultUrl).toBe(generated.url);
      expect(generated.url.startsWith('/library/media/')).toBe(true);
      const recordStore = host.services.get('agent.persistence').createExecutionStore();
      const record = await recordStore.read('plan-test', saved.id);
      await recordStore.write(record);
      expect(await recordStore.read('plan-test', saved.id)).toEqual(record);
      await expect(recordStore.read('plan-test', 'another-project')).rejects.toMatchObject({
        code: 'DRAMA_EXECUTION_RECORD_INVALID',
      });
      const textModel = Object.values(loadModelCatalog()).find(
        (model) => model.provider === 'DoubaoTextProvider',
      );
      let submitted = 0;
      const generatePlan = createDramaModelGenerator({
        getCredentials: () => ({ ARK_API_KEY: 'test-only' }),
        readImages: host.services.get('media.agent').imageContent,
        textTransport: createTextGenerationService({
          modelCatalog: loadModelCatalog, credentials: { get: () => ({ ARK_API_KEY: 'test-only' }) },
          fetcher: async (_url, input) => {
            submitted++;
            expect(JSON.parse(input.body).messages.map((message) => message.role)).toEqual([
              'system',
              'user',
            ]);
            return Response.json({
              choices: [
                {
                  message: { role: 'assistant', content: 'Local mocked plan' },
                  finish_reason: 'stop',
                },
              ],
            });
          },
        }),
      });
      expect(
        await generatePlan({
          model: textModel.name,
          projectId: saved.id,
          messages: [
            { role: 'system', content: 'Planning rules' },
            { role: 'user', content: 'A script' },
          ],
        }),
      ).toBe('Local mocked plan');
      expect(submitted).toBe(1);
      const app = express();
      app.use(express.json());
      app.use(createMediaLibraryRouter({ library: host.services.get('media.operations').library }));
      app.use(
        '/api',
        createMediaAssetRouter({ mediaStore: host.services.get('media.operations') }),
      );
      app.use(
        '/api',
        createMediaEditingRouter({ mediaProcessor: host.services.get('media.editing') }),
      );
      server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
      });
      const url = `http://127.0.0.1:${server.address().port}/api`;
      const list = await fetch(`${url}/assets/images?projectId=${saved.id}`);
      expect(list.status).toBe(200);
      expect(await list.json()).toHaveLength(3);
      expect((await fetch(`${url}/assets/images`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'data:image/png;base64,' + data.toString('base64') }) })).status).toBe(404);
      const uploaded = await fetch(`${url}/assets/upload/images`, { method: 'POST', headers: { 'content-type': 'image/png', 'x-project-id': saved.id, 'x-filename': 'new.png', 'x-media-prompt': 'fixture' }, body: data });
      expect(uploaded.status).toBe(200);
      expect((await uploaded.json()).asset.prompt).toBe('fixture');
      const savedLibrary = await fetch(`${url}/library`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Fixture asset', category: 'tests', type: 'image', sourceUrl: asset.url }) });
      expect(savedLibrary.status).toBe(200);
      const libraryEntry = (await savedLibrary.json()).asset;
      expect((await (await fetch(`${url}/library`)).json()).some(entry => entry.id === libraryEntry.id)).toBe(true);
      const imported = await fetch(`${url}/library/import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: libraryEntry.id, projectId: saved.id }) });
      expect(imported.status).toBe(200);
      expect((await fetch(`${url}/library/${libraryEntry.id}`, { method: 'DELETE' })).status).toBe(200);
      const invalid = await fetch(`${url}/media/images/crop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: '../outside', imageUrl: asset.url }),
      });
      expect(invalid.status).toBe(400);
      const favorite = await fetch(
        `${url}/assets/images/${asset.id}/favorite?projectId=${saved.id}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ favorite: true }),
        },
      );
      expect(favorite.status).toBe(200);
      await store.remove(asset.id);
      await expect(store.read(asset.id)).rejects.toMatchObject({ status: 404 });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await host?.stop();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
  it('keeps disabled providers unavailable and permits enabling them through the host', async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'nako-disabled-'));
    const directory = path.join(temporaryRoot, 'library');
    let host;
    try {
      host = await createServerPluginHost({
        libraryDirectory: directory,
        configuration: { disabled: ['provider.openai'], options: {} },
      });
      expect(host.services.get('generation.providers').get('GptImageProvider')).toBeNull();
      expect(host.discover('generation.image').some((p) => p.id === 'provider.openai')).toBe(false);
      await host.load('provider.openai');
      expect(host.services.get('generation.providers').get('GptImageProvider')).not.toBeNull();
    } finally {
      await host?.stop();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});

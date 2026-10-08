import { it, expect, vi } from 'vitest';
import express from 'express';
import { PluginHost } from '../modules/kernel/index.js';
import registryPlugin from '../modules/workflow-runtime/registryPlugin.js';
import comfyPlugin from '../plugins/workflows/local-comfyui/index.js';
import runningHubWorkflowPlugin from '../plugins/workflows/runninghub-workflow/index.js';
import runningHubWebAppPlugin from '../plugins/workflows/runninghub-webapp/index.js';
import { ERRORS } from '../modules/contracts/index.js';
import { generationProviders } from '../modules/generation-core/providerRegistry.js';
import { createDramaModelGenerator } from '../modules/agent/server/agent/drama/dramaModelGenerator.js';
import { createPromptAssistantRouter } from '../modules/agent/server/prompt/promptAssistantRouter.js';
import {
  normalizeRunningHubBaseUrl,
  normalizeRunningHubInstanceType,
} from '../modules/contracts/workflowProtocols.js';

it('uses the activated workflow client factory and revokes retained clients on shutdown', async () => {
  const host = new PluginHost();
  host.register(registryPlugin);
  host.register(comfyPlugin);
  await host.start();
  const registry = host.services.get('workflow.executors');
  const fetchImpl = vi.fn(
    async () => new Response(JSON.stringify({ system: { comfyui_version: 'test' } })),
  );
  try {
    const client = registry.createClient('local-comfyui', {
      serverUrl: '127.0.0.1:8188',
      fetchImpl,
    });
    const factory = host.services.get('workflow.factory.local-comfyui');
    expect(client.fetchImpl).toBeUndefined();
    expect(client.baseUrl).toBeUndefined();
    expect((await client.getSystemStats()).system.comfyui_version).toBe('test');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await host.stop();
    expect(() => registry.createClient('local-comfyui', {})).toThrow('unavailable');
    expect(() => client.getSystemStats()).toThrow('unloaded');
    expect(() => factory({})).toThrow('unloaded');
  } finally {
    await host.stop();
  }
});

it.each([
  ['runninghub-workflow', runningHubWorkflowPlugin],
  ['runninghub-webapp', runningHubWebAppPlugin],
])('resolves %s client secrets only through granted plugin credentials', async (id, plugin) => {
  let cnKey = 'cn-fixture', globalKey = 'global-fixture';
  const get = vi.fn(() => ({ RUNNINGHUB_API_KEY: cnKey, RUNNINGHUB_GLOBAL_API_KEY: globalKey }));
  const host = new PluginHost({ credentialStore: { get },
    credentialGrants: { [`workflow.${id}`]: ['provider.runninghub'] } });
  host.register(registryPlugin).register(plugin);
  await host.start();
  const registry = host.services.get('workflow.executors');
  const fetcher = vi.fn(async () => Response.json({ code: 0, data: { currency: 'CNY' } }));
  const create = (credentialRef = 'runninghub-cn') => registry.createClient(id, {
    baseUrl: credentialRef === 'runninghub-cn' ? 'https://www.runninghub.cn' : 'https://www.runninghub.ai', credentialRef, fetcher,
  });
  try {
    const cn = create();
    await cn.validateCredential();
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer cn-fixture');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).apikey).toBe('cn-fixture');
    expect(cn.apiKey).toBeUndefined();
    expect(cn.credentialResolver).toBeUndefined();
    expect(get).toHaveBeenLastCalledWith('provider.runninghub');
    await create('runninghub-global').validateCredential();
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer global-fixture');
    cnKey = 'rotated-fixture';
    await create().validateCredential();
    expect(fetcher.mock.calls[2][1].headers.Authorization).toBe('Bearer rotated-fixture');
    expect(() => registry.createClient(id, { apiKey: 'caller-secret', credentialRef: 'runninghub-cn' }))
      .toThrow(expect.objectContaining({ code: ERRORS.permission, status: 400 }));
    expect(() => create('undeclared')).toThrow(expect.objectContaining({ code: ERRORS.invalidConfiguration, status: 400 }));
    globalKey = '';
    expect(() => create('runninghub-global')).toThrow(expect.objectContaining({ code: ERRORS.credentialMissing, status: 409 }));
    expect(fetcher).toHaveBeenCalledTimes(3);
    await host.stop();
    expect(() => cn.validateCredential()).toThrow(expect.objectContaining({ code: ERRORS.inactive }));
  } finally { await host.stop(); }
});

it('does not create a cloud client when the workflow plugin lacks a credential grant', async () => {
  const get = vi.fn(() => ({ RUNNINGHUB_API_KEY: 'must-not-be-read' }));
  const host = new PluginHost({ credentialStore: { get } });
  host.register(registryPlugin).register(runningHubWorkflowPlugin);
  await host.start();
  try {
    expect(() => host.services.get('workflow.executors').createClient('runninghub-workflow', {
      baseUrl: 'https://www.runninghub.cn', credentialRef: 'runninghub-cn',
    })).toThrow(expect.objectContaining({ code: ERRORS.permission }));
    expect(get).not.toHaveBeenCalled();
  } finally { await host.stop(); }
});

it('resolves the active Provider on every prompt request instead of retaining the implementation', async () => {
  const registry = generationProviders;
  const generateText = vi.fn(async () =>
    Response.json({
      choices: [
        { message: { role: 'assistant', content: 'optimized fixture' }, finish_reason: 'stop' },
      ],
    }),
  );
  const remove = registry.register(
    { name: 'GlmTextProvider', kinds: ['text'], execution: 'immediate', requiredSecrets: ['ZHIPU_API_KEY'] },
    { generateText },
  );
  const app = express();
  app.use(express.json());
  app.use(
    createPromptAssistantRouter({
      generateText: ({ systemPrompt, message, ...input }) =>
        createDramaModelGenerator({
          textTransport: { fetcher: generateText },
          getCredentials: () => ({ ZHIPU_API_KEY: 'fixture-only' }),
          readImages: async () => [],
        })({
          ...input,
          model: 'glm-5.3-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        }),
    }),
  );
  const server = await new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  const send = () =>
    fetch(`http://127.0.0.1:${server.address().port}/api/prompt-assistant/optimize-prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'fixture' }),
    });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await (await send()).json()).toEqual({ optimizedPrompt: 'optimized fixture' });
    remove();
    expect((await send()).ok).toBe(false);
    expect(generateText).toHaveBeenCalledTimes(1);
  } finally {
    remove();
    log.mockRestore();
    await new Promise((resolve) => server.close(resolve));
  }
});

it('preserves shared workflow URL and instance validation after separating protocol from network clients', () => {
  expect(normalizeRunningHubBaseUrl('https://www.runninghub.cn/')).toBe(
    'https://www.runninghub.cn',
  );
  expect(normalizeRunningHubInstanceType(undefined)).toBe('plus');
  expect(() => normalizeRunningHubBaseUrl('https://www.runninghub.cn.evil.invalid')).toThrow();
  expect(() => normalizeRunningHubBaseUrl('https://user:password@www.runninghub.cn')).toThrow();
  expect(() => normalizeRunningHubInstanceType('unlimited')).toThrow();
});

import { createTextGenerationService } from '../plugins/platform/text-transport/service.js';
import { createDramaConversationService } from '../modules/agent/server/agent/drama/dramaConversation.js';
import { it, expect, vi } from 'vitest';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAgentRouter } from '../modules/agent/server/agent/agentRouter.js';
import { createHarnessSessionStore } from '../plugins/storage/agent-files/harnessSessionStore.js';
import { generationProviders } from '../modules/generation-core/providerRegistry.js';
import { loadModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import { createCanvasControlBridge } from '../modules/agent/server/harness/operationBridge.js';
import { createAgentClient } from '../modules/agent/ui/agent/agentClient.ts';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-detached-agent-'));
  const store = createHarnessSessionStore({ privateDirectory: root });
  const remove = generationProviders.register(
    {
      name: 'EcloudTextProvider',
      kinds: ['text'],
      execution: 'immediate',
      requiredSecrets: ['ECLOUD_API_KEY'],
    },
    {},
  );
  const model = Object.values(loadModelCatalog()).find((m) => m.provider === 'EcloudTextProvider');
  const pending = [],
    disconnected = new Set();
  const fetcher = vi.fn(
    (_url, { signal }) =>
      new Promise((resolve, reject) => {
        pending.push({
          signal,
          finish: (message = { role: 'assistant', content: 'background answer' }) =>
            resolve(
              Response.json({
                choices: [{ message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }],
              }),
            ),
        });
        signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), {
          once: true,
        });
      }),
  );
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.path.endsWith('/runs')) res.once('close', () => disconnected.add(req.body.sessionId));
    next();
  });
  let harness;
  const nodeRuns = { stopProject: vi.fn(async () => {}) };
  app.use(
    createAgentRouter({
      nodeRuns,
      createDramaConversation: (sessionStore) => createDramaConversationService({ sessionStore }),
      sessionStore: store,
      textTransport: createTextGenerationService({ fetcher, modelCatalog: loadModelCatalog,
        credentials: { get: () => ({ ECLOUD_API_KEY: 'fixture' }) } }),
      mediaService: { imageContent: async () => [], fitVisualReferences: async (m) => m },
      onHarness: (h) => {
        harness = h;
      },
    }),
  );
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const origin = `http://127.0.0.1:${server.address().port}/api/agent/v2`;
  const start = async (id = 's1', projectId = 'p1', canvasControl = false) => {
    const response = await fetch(origin + '/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        protocol: 2,
        operationId: 'run-' + id,
        sessionId: id,
        projectId,
        model: model.name,
        message: 'hello',
        canvasControl,
      }),
    });
    expect(response.status).toBe(200);
    const reader = response.body.getReader();
    await reader.read();
    await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0));
    await reader.cancel();
    await vi.waitFor(() => expect(disconnected.has(id)).toBe(true));
  };
  return {
    store,
    pending,
    harness,
    nodeRuns,
    origin,
    start,
    fetcher,
    close: async () => {
      await harness.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      remove();
      await rm(root, { recursive: true, force: true });
    },
  };
}

it('keeps the model running after SSE disconnect and persists its completed answer', async () => {
  const f = await fixture();
  try {
    await f.start();
    expect(f.pending[0].signal.aborted).toBe(false);
    expect((await f.store.get('s1')).runs['run-s1'].status).toBe('running');
    f.pending[0].finish();
    await vi.waitFor(async () =>
      expect((await f.store.get('s1')).runs['run-s1'].status).toBe('completed'),
      { timeout: 15000 },
    );
    const snapshot = await (await fetch(f.origin + '/sessions/s1')).json();
    expect(snapshot.transcript.at(-1).content).toBe('background answer');
    expect(f.fetcher).toHaveBeenCalledOnce();
  } finally {
    await f.close();
  }
});

it('stops every detached run in the exited project without stopping another project', async () => {
  const f = await fixture();
  try {
    await f.start('s1', 'p1');
    await f.start('s2', 'p2');
    await vi.waitFor(() => expect(f.pending).toHaveLength(2));
    expect((await fetch(f.origin + '/projects/p1/stop', { method: 'POST' })).status).toBe(200);
    expect((await f.store.get('s1')).runs['run-s1'].status).toBe('aborted');
    expect(f.nodeRuns.stopProject).not.toHaveBeenCalled();
    expect(f.pending[1].signal.aborted).toBe(false);
    f.pending[1].finish();
    await vi.waitFor(async () =>
      expect((await f.store.get('s2')).runs['run-s2'].status).toBe('completed'),
      { timeout: 5000 },
    );
  } finally {
    await f.close();
  }
});

it('waits for aborted state persistence when the application closes', async () => {
  const f = await fixture();
  try {
    await f.start();
    await f.harness.close();
    expect(f.pending[0].signal.aborted).toBe(true);
    expect((await f.store.get('s1')).runs['run-s1'].status).toBe('aborted');
  } finally {
    await f.close();
  }
});

it('delivers a tool created while detached on reopen and journals its receipt without replay', async () => {
  const f = await fixture();
  try {
    await f.start('s1', 'p1', true);
    f.pending[0].finish({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'canvas_control', arguments: JSON.stringify({ action: 'read' }) },
        },
      ],
    });
    await vi.waitFor(async () =>
      expect(Object.values((await f.store.get('s1')).receipts)).toHaveLength(1),
    );
    const client = createAgentClient((url, init) =>
      fetch(f.origin.replace('/api/agent/v2', '') + url, init),
    );
    const execute = vi.fn(async () => ({ ok: true, revision: 'canvas-v1', nodes: [] }));
    await vi.waitFor(async () => {
      await client.resumeOperations('s1', 'p1', { onCanvasAction: execute });
      expect(execute).toHaveBeenCalledOnce();
    });
    await client.resumeOperations('s1', 'p1', { onCanvasAction: execute });
    expect(execute).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(f.pending).toHaveLength(2));
    f.pending[1].finish();
    await vi.waitFor(async () =>
      expect((await f.store.get('s1')).runs['run-s1'].status).toBe('completed'),
      { timeout: 5000 },
    );
    expect(Object.values((await f.store.get('s1')).receipts)[0]).toMatchObject({
      state: 'settled',
      result: { ok: true },
    });
  } finally {
    await f.close();
  }
});

it('only claims undelivered canvas operations once, retaining scope and cancellation', async () => {
  const bridge = createCanvasControlBridge();
  const run = { projectId: 'p1', sessionId: 's1', canvasControl: true, emit: () => false };
  const result = bridge.dispatch(run, { action: 'read' });
  expect(bridge.claim('s1', 'p2')).toEqual([]);
  const [request] = bridge.claim('s1', 'p1');
  expect(request.command.action).toBe('read');
  expect(bridge.claim('s1', 'p1')).toEqual([]);
  bridge.cancel(run);
  expect(await result).toMatchObject({ code: 'UNCONFIRMED' });
  expect(() =>
    bridge.complete(request.requestId, {
      projectId: 'p1',
      sessionId: 's1',
      result: { ok: false, code: 'UNAVAILABLE' },
    }),
  ).toThrow();
  run.emit = () => true;
  const delivered = bridge.dispatch(run, { action: 'read' });
  expect(bridge.claim('s1', 'p1')).toEqual([]);
  bridge.cancel(run);
  await delivered;
});

it('closes the application while a detached run is waiting for a canvas receipt', async () => {
  const f = await fixture();
  try {
    await f.start('s1', 'p1', true);
    f.pending[0].finish({ role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'canvas_control', arguments: JSON.stringify({ action: 'read' }) } }] });
    await vi.waitFor(async () => expect(Object.values((await f.store.get('s1')).receipts)).toHaveLength(1));
    await f.harness.close();
    expect((await f.store.get('s1')).runs['run-s1'].status).toBe('aborted');
    expect(f.fetcher).toHaveBeenCalledOnce();
  } finally { await f.close(); }
});

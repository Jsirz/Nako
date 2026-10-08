import { createTextGenerationService } from '../plugins/platform/text-transport/service.js';
import { createDramaConversationService } from '../modules/agent/server/agent/drama/dramaConversation.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHarnessSessionStore } from '../plugins/storage/agent-files/harnessSessionStore.js';
import {
  createSessionService,
  contextMessages,
  sessionView,
} from '../modules/agent/server/harness/session.js';
import { createPiAgentHarness } from '../modules/agent/server/harness/runtime.js';
import { assistantMessage } from '../modules/agent/server/harness/modelAdapter.js';
import { controlledTools } from '../modules/agent/server/harness/tools.js';
import { loadModelCatalog } from '../modules/generation-core/api/server/config/modelCatalog.js';
import { isAgentEvent } from '../modules/contracts/agentProtocol.js';
import { generationProviders } from '../modules/generation-core/providerRegistry.js';
import express from 'express';
import { createAgentRouter } from '../modules/agent/server/agent/agentRouter.js';
import { createAgentClient } from '../modules/agent/ui/agent/agentClient.ts';
import { createPromptPresetStore } from '../plugins/storage/agent-files/promptPresetStore.js';
import { createPromptPresetRouter } from '../modules/agent/server/prompt/promptPresetRouter.js';
import { createImageGenerationService } from '../modules/generation-core/server/routes/generation.js';
import { createGenerationRuntime } from '../modules/generation-core/server/generation/generationRuntime.js';
import { PluginHost } from '../modules/kernel/index.js';

const model = Object.values(loadModelCatalog()).find(
  (m) =>
    m.provider === 'EcloudTextProvider' &&
    m.endpoint['multimodal-chat'].model === 'zhipu/glm-5.3-flash',
);
const answer = (content = '完成') =>
  Response.json({ choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }] });
const tool = (command, id = 'call-1', name = 'canvas_control') =>
  Response.json({
    choices: [
      {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            { id, type: 'function', function: { name, arguments: JSON.stringify(command) } },
          ],
        },
        finish_reason: 'tool_calls',
      },
    ],
  });
let directory, repository, sessions, unregister;
beforeEach(async () => {
  unregister = generationProviders.register(
    { name: 'EcloudTextProvider', kinds: ['text'], execution: 'immediate', requiredSecrets: ['ECLOUD_API_KEY'] },
    {},
  );
  directory = await mkdtemp(path.join(os.tmpdir(), 'nako-harness-'));
  repository = createHarnessSessionStore({ privateDirectory: directory });
  sessions = createSessionService(repository);
});
afterEach(async () => {
  unregister();
  await rm(directory, { recursive: true, force: true });
});
function fixture(responses) {
  const events = [],
    requests = [];
  const fetcher = vi.fn(async (_url, input) => {
    requests.push(JSON.parse(input.body));
    const next = responses.shift();
    if (!next) throw Error('Unexpected retry');
    return typeof next === 'function' ? next(input) : next;
  });
  const getCredentials = vi.fn(() => ({ ECLOUD_API_KEY: 'test-secret-not-real' }));
  const textTransport = createTextGenerationService({
    credentials: { get: getCredentials }, modelCatalog: loadModelCatalog, fetcher,
  });
  const harness = createPiAgentHarness({
    sessions, textTransport, mediaService: { imageContent: async () => [] },
  });
  const input = {
    sessionId: 'session-1',
    projectId: 'project-1',
    operationId: 'run-1',
    message: '查看画布',
    modelConfig: { id: model.endpoint['multimodal-chat'].model, name: model.name,
      provider: model.provider, reference: { name: model.name, provider: model.provider },
      contextWindow: model.contextWindow, languageModes: model.languageModes },
  };
  return {
    harness,
    input,
    fetcher,
    getCredentials,
    textTransport,
    requests,
    events,
    emit: (event) => events.push(event),
  };
}
describe('pi Harness durable execution', () => {
  it('restores tool/card positions per message, including repeated call ids across runs and branches', async () => {
    const f = fixture([
      tool(
        { action: 'prepareGeneration', revision: 'r1', nodeIds: ['one'] },
        'same-call',
        'generation_control',
      ),
      answer('第一批已准备'),
      tool(
        { action: 'prepareGeneration', revision: 'r2', nodeIds: ['two'] },
        'same-call',
        'generation_control',
      ),
      answer('第二批已准备'),
    ]);
    let count = 0;
    const dispatch = async () => ({
      ok: true,
      revision: 'r' + ++count,
      generationPlanId: 'batch-' + count,
      generationState: 'awaiting-approval',
    });
    await f.harness.run(f.input, { dispatch, emit: f.emit });
    const first = sessionView(await repository.get('session-1'));
    await f.harness.run(
      { ...f.input, operationId: 'run-2', message: '再生成第二批' },
      { dispatch, emit: f.emit },
    );
    const saved = await repository.get('session-1');
    const view = sessionView(saved);
    expect(
      view.transcript.map((message) => message.tools.flatMap((t) => t.cards).map((c) => c.id)),
    ).toEqual([[], ['batch-1'], [], [], ['batch-2'], []]);
    expect(
      view.transcript.filter((m) => m.tools.length).every((m) => m.tools[0].status === 'settled'),
    ).toBe(true);
    expect(f.events.filter((e) => e.type === 'tool_start').map((e) => e.payload.action)).toEqual([
      'prepareGeneration',
      'prepareGeneration',
    ]);
    const branch = await f.harness.branch('session-1', {
      projectId: 'project-1',
      expectedRevision: saved.revision,
      entryId: first.transcript.at(-1).id,
      branchId: 'first-batch-only',
    });
    expect(
      branch.transcript.flatMap((m) => m.tools.flatMap((t) => t.cards)).map((c) => c.id),
    ).toEqual(['batch-1']);
    expect(branch.knownCards.map((c) => c.id)).toEqual(['batch-1', 'batch-2']);
    expect(count).toBe(2);
  });
  it('honors selected GLM effort and does not request confirmation for a directly started batch', async () => {
    const f = fixture([
      tool(
        { action: 'prepareGeneration', revision: 'r1', nodeIds: ['image-1'] },
        'gen-1',
        'generation_control',
      ),
      answer(),
    ]);
    await f.harness.run(
      { ...f.input, modelParams: { reasoning_effort: 'low' } },
      {
        emit: f.emit,
        dispatch: async () => ({
          ok: true,
          revision: 'r1',
          generationPlanId: 'batch-1',
          generationState: 'running',
        }),
      },
    );
    expect(f.requests.every((request) => request.reasoning_effort === 'low')).toBe(true);
    expect(f.events.some((event) => event.type === 'authorization_required')).toBe(false);
    expect(
      Object.values((await repository.get('session-1')).receipts)[0].result.generationState,
    ).toBe('running');
  });
  it('uses pi for tool turns and source credentials, persists intent before dispatch, emits ordered v2 events', async () => {
    const f = fixture([tool({ action: 'read' }), answer()]);
    const dispatch = vi.fn(async () => {
      const r = await repository.get(f.input.sessionId);
      expect(Object.values(r.receipts)[0].state).toBe('pending');
      expect(r.entries.at(-1).message.content[0].type).toBe('toolCall');
      return { ok: true, revision: 'rev-1', nodes: [] };
    });
    await expect(f.harness.run(f.input, { emit: f.emit, dispatch })).resolves.toMatchObject({
      status: 'completed',
      response: '完成',
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.getCredentials).toHaveBeenCalledWith('provider.ecloud');
    expect(f.requests[0]).toMatchObject({
      model: 'zhipu/glm-5.3-flash',
      thinking: { type: 'enabled', clear_thinking: false },
      reasoning_effort: 'max',
    });
    expect(f.requests[0].tools.map((t) => t.function.name)).toEqual([
      'canvas_control',
      'project_control',
      'generation_control',
      'media_control',
      'workflow_control',
    ]);
    expect(f.requests[1].messages.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'tool',
    ]);
    expect(f.events.every(isAgentEvent)).toBe(true);
    expect(f.events.map((e) => e.sequence)).toEqual(f.events.map((_, i) => i + 1));
    expect(f.events.at(-1).payload.status).toBe('completed');
    const record = await repository.get('session-1');
    expect(record.version).toBe(2);
    expect(record.messages).toBeUndefined();
    expect(JSON.stringify(record)).not.toContain('test-secret-not-real');
    expect(record.entries.map((e) => e.message?.role)).toEqual([
      'user',
      'assistant',
      'toolResult',
      'assistant',
    ]);
    await expect(f.harness.run(f.input, { dispatch })).rejects.toMatchObject({
      code: 'AGENT_OPERATION_EXISTS',
    });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it('never dispatches a truncated tool stream and does not retry the model', async () => {
    const data = {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call-broken',
                function: { name: 'canvas_control', arguments: '{"action":"edit"' },
              },
            ],
          },
        },
      ],
    };
    const f = fixture([
      new Response('data: ' + JSON.stringify(data) + '\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      }),
    ]);
    const dispatch = vi.fn();
    await expect(f.harness.run(f.input, { dispatch, emit: f.emit })).rejects.toThrow();
    expect(dispatch).not.toHaveBeenCalled();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect((await repository.get('session-1')).runs['run-1'].status).toBe('failed');
    expect(f.events.at(-1).payload.error).toBeTruthy();
  });
  it('reuses confirmed mutation receipts and refuses pending operations across runs', async () => {
    await sessions.ensure('session-1', 'project-1');
    const dispatch = vi.fn(async () => ({ ok: true, revision: 'r2', operationId: 'applied' }));
    const command = {
      action: 'edit',
      revision: 'r1',
      operations: [{ kind: 'create', ref: 'n1', type: 'Text', x: 0, y: 0 }],
    };
    const execute = (runId) =>
      controlledTools({
        sessions,
        sessionId: 'session-1',
        runId,
        dispatch,
        emit: async () => {},
      })[0].execute;
    const first = await execute('run-a')('call-a', command);
    expect(await execute('run-b')('call-b', command)).toEqual(first);
    expect(dispatch).toHaveBeenCalledTimes(1);
    await sessions.change('session-1', (r) => {
      Object.values(r.receipts)[0].state = 'pending';
    });
    expect(await execute('run-c')('call-c', command)).toMatchObject({
      terminate: true,
      details: { code: 'UNCONFIRMED' },
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
  it('blocks side effects when the intent cannot be persisted', async () => {
    const dispatch = vi.fn();
    const tools = controlledTools({
      sessions: {
        change: async () => {
          throw Error('disk failed');
        },
      },
      sessionId: 's',
      runId: 'r',
      dispatch,
      emit: vi.fn(),
    });
    await expect(
      tools[0].execute('c', {
        action: 'edit',
        revision: 'r1',
        operations: [{ kind: 'delete', nodeId: 'n' }],
      }),
    ).rejects.toThrow('disk failed');
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('repairs missing tool results from the ledger without replay and retains branches', async () => {
    const f = fixture([answer('继续完成')]);
    await sessions.ensure('session-1', 'project-1');
    await sessions.change('session-1', (r) => {
      r.runs.old = { id: 'old', status: 'running' };
      sessions.append(r, {
        kind: 'message',
        message: { role: 'user', content: '原任务', timestamp: 1 },
      });
      sessions.append(r, {
        kind: 'message',
        message: assistantMessage(
          { id: 'x', provider: 'p' },
          [{ type: 'toolCall', id: 'lost', name: 'canvas_control', arguments: { action: 'read' } }],
          undefined,
          'toolUse',
        ),
      });
    });
    const dispatch = vi.fn();
    await f.harness.run(f.input, { dispatch });
    expect(dispatch).not.toHaveBeenCalled();
    expect(f.requests[0].messages.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'tool',
      'user',
    ]);
    expect(f.requests[0].messages[3].content).toContain('UNCONFIRMED');
    const r = await repository.get('session-1');
    expect(r.runs.old.status).toBe('interrupted');
    const view = await f.harness.branch('session-1', {
      projectId: 'project-1',
      expectedRevision: r.revision,
      entryId: null,
      branchId: 'alternate',
    });
    expect(view.transcript).toEqual([]);
    expect(view.branches).toHaveLength(2);
    expect((await repository.get('session-1')).entries).toHaveLength(r.entries.length);
    await expect(
      f.harness.branch('session-1', {
        projectId: 'project-1',
        expectedRevision: r.revision,
        entryId: null,
      }),
    ).rejects.toMatchObject({ code: 'AGENT_REVISION_CONFLICT' });
  });
  it('compresses only complete old turns and preserves transcript, receipts, and newest turns', async () => {
    const f = fixture([answer('已确认操作和目标摘要')]);
    await sessions.ensure('session-1', 'project-1');
    await sessions.change('session-1', (r) => {
      for (let i = 0; i < 4; i++) {
        sessions.append(r, {
          kind: 'message',
          message: { role: 'user', content: '问题' + i, timestamp: i },
        });
        sessions.append(r, {
          kind: 'message',
          message: assistantMessage({ id: 'm', provider: 'p' }, [
            { type: 'text', text: '回答' + i },
          ]),
        });
      }
      r.receipts.kept = { id: 'kept', state: 'settled', result: { ok: true } };
    });
    const original = await repository.get('session-1');
    await f.harness.compact(f.input);
    const r = await repository.get('session-1');
    expect(r.entries).toHaveLength(original.entries.length + 1);
    expect(sessionView(r).transcript).toEqual(sessionView(original).transcript);
    expect(r.receipts).toEqual(original.receipts);
    const messages = contextMessages(r);
    expect(messages).toHaveLength(5);
    expect(messages[0].content).toContain('目标摘要');
    expect(messages[1].content).toBe('问题2');
    const g = fixture([new Response('{}', { status: 500 })]);
    await expect(g.harness.compact({ ...f.input, operationId: 'run-failure' })).rejects.toThrow();
    expect((await repository.get('session-1')).entries).toHaveLength(r.entries.length);
  });
  it('stops an active model request and persists aborted status', async () => {
    let started;
    const ready = new Promise((r) => {
      started = r;
    });
    const f = fixture([
      (input) =>
        new Promise((_, reject) => {
          input.signal.addEventListener(
            'abort',
            () => reject(new DOMException('stopped', 'AbortError')),
            { once: true },
          );
          started();
        }),
    ]);
    const run = f.harness.run(f.input, { emit: f.emit });
    await ready;
    f.harness.stop('session-1');
    await run;
    expect((await repository.get('session-1')).runs['run-1'].status).toBe('aborted');
  });
  it('rejects stale storage writes and archives deletion without reading old sessions', async () => {
    const r = await sessions.ensure('session-1', 'project-1');
    await sessions.change(r.id, (n) => {
      n.metadata.topic = 'new';
    });
    await expect(repository.commit(r, r.revision)).rejects.toMatchObject({
      code: 'AGENT_REVISION_CONFLICT',
    });
    expect((await repository.get(r.id)).metadata.topic).toBe('new');
    await repository.remove(r.id);
    expect(await repository.get(r.id)).toBeNull();
    expect(await readdir(path.join(directory, 'agent-harness-v2', 'trash'))).toHaveLength(1);
  });
  it('allows declared optional services to be absent, rejects undeclared access', async () => {
    const host = new PluginHost();
    host.register({
      manifest: {
        id: 'test.harness',
        version: '1.0.0',
        apiVersion: '^1.0.0',
        type: 'platform',
        services: { optional: ['connector.example'] },
      },
      activate(ctx) {
        expect(ctx.services.optional('connector.example')).toBeUndefined();
        expect(() => ctx.services.optional('secret.other')).toThrow();
      },
    });
    await host.load('test.harness');
    expect(host.list()[0].state).toBe('active');
    await host.stop();
  });
});

async function httpFixture(f) {
  const app = express();
  app.use(express.json());
  app.use(
    createAgentRouter({
      createDramaConversation: (sessionStore) => createDramaConversationService({ sessionStore }),
      defaultModels: f.defaultModels,
      sessionStore: repository,
      textTransport: f.textTransport,
      mediaService: { imageContent: async () => [], fitVisualReferences: async (input) => input },
      onHarness: (h) => {
        f.httpHarness = h;
      },
    }),
  );
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const origin = 'http://127.0.0.1:' + server.address().port;
  return {
    origin,
    server,
    client: createAgentClient((url, init) => fetch(origin + url, init)),
    post: (body) =>
      fetch(origin + '/api/agent/v2/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    close: async () => {
      await f.httpHarness.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
it('resolves an omitted Agent model through the shared service before credentials and the pi loop', async () => {
  const f = fixture([answer('default model answer')]);
  f.defaultModels = { resolve: vi.fn(async (kind, requested) => requested || model.name) };
  const http = await httpFixture(f);
  try {
    const result = await http.client.streamMessage({
      sessionId: 'session-1',
      projectId: 'project-1',
      message: 'test',
      operationId: 'default-model-run',
    });
    expect(result.response).toBe('default model answer');
    expect(f.defaultModels.resolve).toHaveBeenCalledWith('text', '');
    expect(f.requests[0].model).toBe(model.endpoint['multimodal-chat'].model);
    expect(f.getCredentials).toHaveBeenCalledWith('provider.ecloud');
  } finally {
    await http.close();
  }
});

it('round-trips the new client protocol and tool receipts through HTTP', async () => {
  const f = fixture([tool({ action: 'read' }), answer('完整回复')]),
    http = await httpFixture(f);
  try {
    const onCanvasAction = vi.fn(async () => ({ ok: true, revision: 'canvas-v1', nodes: [] })),
      events = [];
    const result = await http.client.streamMessage(
      {
        sessionId: 'session-1',
        projectId: 'project-1',
        message: '读取',
        model: model.name,
        canvasControl: true,
      },
      () => {},
      { onEvent: (e) => events.push(e), onCanvasAction },
    );
    expect(result.response).toBe('完整回复');
    expect(onCanvasAction).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === 'operation_requested')).toBe(true);
    expect(events.at(-1).type).toBe('run_end');
    const view = await http.client.getSession('session-1');
    expect(view.version).toBe(2);
    expect(view.messages).toHaveLength(3);
    const fork = await http.client.branch(view.id, 'project-1', view.revision, null);
    expect(fork.messages).toHaveLength(0);
    const main = await http.client.switchBranch(view.id, 'project-1', fork.revision, 'main');
    expect(main.messages).toHaveLength(3);
    expect((await fetch(http.origin + '/api/chat/sessions')).status).toBe(404);
    expect((await http.post({ ...f.input, model: model.name })).status).toBe(400);
  } finally {
    await http.close();
  }
});
it('busy HTTP requests do not unlock another request or invoke a second model', async () => {
  let start, release;
  const started = new Promise((r) => {
    start = r;
  });
  const gate = new Promise((r) => {
    release = r;
  });
  const f = fixture([
      async () => {
        start();
        await gate;
        return answer();
      },
    ]),
    http = await httpFixture(f);
  try {
    const body = {
      protocol: 2,
      sessionId: 'session-1',
      projectId: 'project-1',
      operationId: 'run-first',
      message: 'test',
      model: model.name,
    };
    const first = http.post(body);
    await started;
    for (const operationId of ['run-second', 'run-third']) {
      const response = await http.post({ ...body, operationId });
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe('AGENT_SESSION_BUSY');
    }
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    release();
    await (await first).text();
  } finally {
    release();
    await http.close();
  }
});
it('client rejects replayed or malformed events before applying side effects', async () => {
  const execute = vi.fn();
  const client = createAgentClient(async (_url, init) => {
    const body = JSON.parse(init.body),
      envelope = {
        protocol: 2,
        type: 'run_start',
        sessionId: body.sessionId,
        runId: body.operationId,
        sequence: 2,
        payload: {},
      };
    return new Response('event: agent\ndata: ' + JSON.stringify(envelope) + '\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  });
  await expect(
    client.streamMessage(
      { sessionId: 's', projectId: 'p', canvasControl: true, message: 'test' },
      () => {},
      { onCanvasAction: execute },
    ),
  ).rejects.toMatchObject({ code: 'AGENT_PROTOCOL_INVALID' });
  expect(execute).not.toHaveBeenCalled();
  expect(
    isAgentEvent({
      protocol: 2,
      type: 'message_update',
      sessionId: 's',
      runId: 'r',
      sequence: 1,
      payload: { delta: 12 },
    }),
  ).toBe(false);
});
it('generation tools require the existing revision and authorization schema', async () => {
  await sessions.ensure('session-1', 'project-1');
  const events = [],
    dispatch = vi.fn(async () => ({
      ok: true,
      revision: 'v2',
      generationPlanId: 'plan-1',
      generationState: 'awaiting-approval',
    }));
  const tool = controlledTools({
    sessions,
    sessionId: 'session-1',
    runId: 'run-1',
    dispatch,
    emit: (type, payload) => events.push({ type, payload }),
  }).find((t) => t.name === 'generation_control');
  await expect(
    tool.execute('invalid', {
      action: 'runGeneration',
      revision: 'v1',
      generationPlanId: 'plan-1',
    }),
  ).rejects.toMatchObject({ code: 'AGENT_TOOL_INVALID' });
  expect(dispatch).not.toHaveBeenCalled();
  await tool.execute('prepare', {
    action: 'prepareGeneration',
    revision: 'v1',
    nodeIds: ['node-1'],
  });
  expect(events[0].type).toBe('authorization_required');
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it('prompt preset CRUD uses the storage adapter and keeps duplicate protection', async () => {
  const app = express();
  app.use(express.json());
  app.use(
    createPromptPresetRouter({ store: createPromptPresetStore({ libraryDirectory: directory }) }),
  );
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const url = 'http://127.0.0.1:' + server.address().port;
  const post = () =>
    fetch(url + '/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text',
        category: 'test',
        title: 'fixture',
        prompt: 'saved text',
      }),
    });
  try {
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(409);
    expect((await (await fetch(url + '/api/prompts')).json()).text[0].items[0].prompt).toBe(
      'saved text',
    );
    expect((await fetch(url + '/api/prompts/text/test/fixture', { method: 'DELETE' })).status).toBe(
      200,
    );
    expect((await (await fetch(url + '/api/prompts')).json()).text[0].items).toEqual([]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
it('storyboard image service shares generation admission, provider routing and media persistence', async () => {
  const imageModel = Object.values(loadModelCatalog()).find(
    (m) => m.provider === 'DoubaoImageProvider',
  );
  const generateImage = vi.fn(async () => ({ buffer: Buffer.from('fixture'), format: 'png' }));
  const remove = generationProviders.register(
    { name: 'DoubaoImageProvider', kinds: ['image'], execution: 'immediate', requiredSecrets: ['ARK_API_KEY'] },
    { generateImage },
  );
  const tasks = new Map(),
    runtime = createGenerationRuntime({
      taskStore: {
        get: (id) => tasks.get(id),
        upsert: (task) => {
          tasks.set(task.nodeId, task);
          return task;
        },
      },
    });
  const saveBuffer = vi.fn(() => ({ url: '/library/media/project-1/images/result.png' }));
  const execute = createImageGenerationService({
    applicationContext: { ARK_API_KEY: 'test-only' },
    mediaService: { saveBuffer, createId: () => 'asset' },
    generationCoordinator: runtime.coordinator,
  });
  try {
    const result = await execute({
      nodeId: 'storyboard-op',
      generationAttemptId: 'attempt-1',
      projectId: 'project-1',
      imageModel: imageModel.name,
      prompt: 'test',
      imageMode: 'text-to-image',
      generateCount: 1,
    });
    expect(result.resultUrl).toContain('/project-1/');
    expect(generateImage).toHaveBeenCalledTimes(1);
    expect(saveBuffer).toHaveBeenCalledTimes(1);
    expect(tasks.get('storyboard-op').status).toBe('success');
    remove();
    await expect(
      execute({ nodeId: 'disabled', imageModel: imageModel.name }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_GENERATION_PROVIDER' });
  } finally {
    remove();
  }
});

import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NodeRegistry } from '../modules/kernel/nodeRegistry.js';
import { NodeDagScheduler } from '../modules/kernel/nodeDagScheduler.js';
import { createNodeRunService } from '../modules/kernel/nodeRunService.js';
import { executeIsolatedNode } from '../modules/desktop-shell-observability/nodeSandbox.js';
import { createNodeDirectoryLoader } from '../modules/desktop-shell-observability/serverNodeDirectory.js';
import { createNodeRunStore } from '../plugins/storage/node-runs/index.js';

const manifest = (capabilities = []) => ({ id: 'test.nodes', title: 'Test', version: '1.0.0', apiVersion: '^2.0.0', entry: 'index.mjs', capabilities,
  nodes: [{ type: 'test', version: '1.0.0', category: 'utility', inputs: [], outputs: [{ id: 'result', media: ['json'], required: true }],
    parameters: { type: 'object', properties: { text: { type: 'string', default: 'ok' } } },
    executor: { method: 'run', timeoutMs: 3000 }, render: { kind: 'generic' }, agent: { exposed: true } }],
});
const memoryStore = () => { const records = new Map(); return { createId: randomUUID, list: async () => [...records.values()], save: async value => records.set(value.id, structuredClone(value)) }; };
const request = (extra = {}) => ({ requestId: 'request1', projectId: 'p', revision: 1, nodes: [{ id: 'n', type: 'test', pluginId: 'test.nodes', parameters: {} }], ...extra });
const scope = { scope: 'user1' };
const sandbox = source => ({ sources: { 'index.mjs': source }, entry: 'index.mjs', method: 'run', timeoutMs: 3000 });

describe('isolated node packages', () => {
  it('runs ESM without Node globals, network or environment', async () => {
    const result = await executeIsolatedNode(sandbox('export const executors = {run: () => ({result: [typeof process, typeof require, typeof fetch, typeof Buffer]})}'), {}, {});
    expect(result).toEqual({ result: ['undefined', 'undefined', 'undefined', 'undefined'] });
  });
  it('bridges async capabilities and local ESM modules', async () => {
    const call = vi.fn(async () => ({ text: 'model reply' }));
    const code = sandbox("import {suffix} from './helper.mjs'; export const executors = {run: async (input, ctx) => ({result: (await ctx.call('models.generate', {kind:'text'}, 'step1')).text + suffix})}");
    code.sources['helper.mjs'] = "export const suffix = '!';";
    await expect(executeIsolatedNode(code, {}, { call })).resolves.toEqual({ result: 'model reply!' });
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('preserves structured host capability errors through the isolated process', async () => {
    await expect(executeIsolatedNode(sandbox("export const executors={run:async (_,ctx)=>({result:await ctx.call('models.generate',{},'s')})}"), {}, {
      call: async () => { throw Object.assign(new Error('budget exhausted'), { code: 'NODE_BUDGET_EXCEEDED' }); },
    })).rejects.toMatchObject({ code: 'NODE_BUDGET_EXCEEDED', message: 'budget exhausted' });
  });
  it('runs the shot recreation example with media and three mocked model steps', async () => {
    const source = await readFile(new URL('../examples/nodes/shot-analysis/index.mjs', import.meta.url), 'utf8');
    const call = vi.fn(async (capability, input) => capability === 'media.inspect' ? { frames: [{ type: 'image', url: '/library/media/p/images/frame.png' }] }
      : input.kind === 'text' ? { text: 'new shot prompt' } : { type: input.kind, url: `/library/media/p/${input.kind}s/result` });
    const result = await executeIsolatedNode({ ...sandbox(source), method: 'recreate' }, { inputs: { video: '/library/media/p/videos/input.mp4' }, parameters: {} }, { call });
    expect(result.analysis).toBe('new shot prompt'); expect(result.video.type).toBe('video');
    expect(call.mock.calls.map(item => item[2])).toEqual(['inspect', 'analyze', 'image', 'video']);
    expect(call.mock.calls[3][1].references).toEqual([result.image]);
  });
  it('rejects platform imports and kills infinite loops', async () => {
    await expect(executeIsolatedNode(sandbox("import fs from 'node:fs'; export const executors = {run: () => ({})}"), {}, {})).rejects.toThrow();
    await expect(executeIsolatedNode({ ...sandbox('export const executors={run(){while(true){}}}'), timeoutMs: 300 }, {}, {})).rejects.toMatchObject({ code: 'NODE_TIMEOUT' });
  });
  it('loads from a directory without executing package top-level code in the host', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-node-test-'));
    try {
      const folder = path.join(directory, 'demo'); await mkdir(folder);
      await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest()));
      await writeFile(path.join(folder, 'index.mjs'), 'export const executors = {run: () => ({result: typeof process})}');
      const registry = new NodeRegistry(), loader = createNodeDirectoryLoader({ directory, registry, logger: { info() {} } });
      expect((await loader.reload()).errors).toEqual([]);
      const scheduler = new NodeDagScheduler({ registry });
      expect((await scheduler.run(request())).results.n).toEqual({ result: 'undefined' });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});

describe('durable authorized runs', () => {
  async function setup(handler, capabilities = {}, store = memoryStore()) {
    const registry = new NodeRegistry();
    registry.register({ manifest: manifest(Object.keys(capabilities)), executors: { run: handler } });
    const readProject = vi.fn(async () => ({ id: 'p', revision: 1 }));
    return { registry, readProject, runs: await createNodeRunService({ registry, store, capabilities, policy: Object.keys(capabilities), readProject }), store };
  }
  it('requires approval, enforces caller scope and reuses one durable request/step', async () => {
    const model = vi.fn(async () => 'value');
    const { runs } = await setup(async (_input, ctx) => ({ result: await Promise.all([ctx.call('models.generate', {}, 's'), ctx.call('models.generate', {}, 's')]) }), { 'models.generate': model });
    const prepared = await runs.prepare(request(), scope);
    expect(prepared.status).toBe('awaiting_approval'); expect(model).not.toHaveBeenCalled();
    expect(() => runs.get(prepared.id, 'another-user')).toThrow();
    await expect(runs.approve(prepared.id, scope.scope, [])).rejects.toMatchObject({ code: 'NODE_CAPABILITY_DENIED' });
    await runs.approve(prepared.id, scope.scope, ['models.generate']);
    const result = await runs.wait(prepared.id, scope.scope);
    expect(result.status).toBe('success'); expect(result.results.n.result).toEqual(['value', 'value']);
    expect(model).toHaveBeenCalledTimes(1);
    expect((await runs.prepare(request(), scope)).id).toBe(prepared.id);
    await expect(runs.prepare(request({ maxParallel: 2 }), scope)).rejects.toMatchObject({ code: 'NODE_REQUEST_CONFLICT' });
  });
  it('checks budgets, revisions, parameters and explicit plugin ownership', async () => {
    const model = vi.fn(async () => 'value');
    const { runs, registry, readProject } = await setup(async (_input, ctx) => ({ result: await ctx.call('models.generate', {}, 's') }), { 'models.generate': model });
    expect(registry.getExecutor('test', 'wrong.owner')).toBeUndefined();
    await expect(runs.prepare(request({ nodes: [{ id: 'n', type: 'test', parameters: { text: 3 } }] }), scope)).rejects.toThrow();
    const prepared = await runs.prepare(request({ maxModelCalls: 0 }), scope);
    readProject.mockResolvedValueOnce({ id: 'p', revision: 2, nodes: [{ id: 'changed', prompt: 'changed' }] });
    await expect(runs.approve(prepared.id, scope.scope, ['models.generate'])).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await runs.approve(prepared.id, scope.scope, ['models.generate']);
    expect((await runs.wait(prepared.id, scope.scope)).code).toBe('NODE_BUDGET_EXCEEDED'); expect(model).not.toHaveBeenCalled();
  });
  it('pins executors across reload and persists results through a new service instance', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-run-store-'));
    try {
      const store = createNodeRunStore({ privateDirectory: directory }); await store.initialize();
      const first = await setup(async (_input, ctx) => ({ result: await ctx.call('models.generate', {}, 's') }), { 'models.generate': async () => 'old' }, store);
      const prepared = await first.runs.prepare(request(), scope);
      first.registry.unregister('test.nodes');
      await first.runs.approve(prepared.id, scope.scope, ['models.generate']);
      expect((await first.runs.wait(prepared.id, scope.scope)).results.n.result).toBe('old');
      await first.runs.close();
      const second = await setup(() => { throw new Error('must not replay'); }, {}, store);
      expect((await second.runs.prepare(request(), scope)).results.n.result).toBe('old');
      await second.runs.close();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('does not invoke downstream nodes after a dependency fails', async () => {
    const registry = new NodeRegistry(), sink = vi.fn(() => ({ result: 'wrong' }));
    const source = manifest(); source.nodes[0].outputs = [{ id: 'result', media: ['text'] }];
    const target = { ...structuredClone(source.nodes[0]), type: 'sink', inputs: [{ id: 'input', media: ['text'], required: true }], executor: { method: 'sink' } };
    registry.register({ manifest: { ...source, nodes: [...source.nodes, target] }, executors: { run: () => { throw new Error('failed'); }, sink } });
    const result = await new NodeDagScheduler({ registry }).run({ nodes: [{ id: 'a', type: 'test' }, { id: 'b', type: 'sink' }], edges: [{ source: { nodeId: 'a', portId: 'result' }, target: { nodeId: 'b', portId: 'input' } }] });
    expect(result.states).toEqual({ a: 'error', b: 'cancelled' }); expect(sink).not.toHaveBeenCalled();
  });
  it('reserves parallel generation quantities atomically and rejects changed in-flight steps', async () => {
    const model = vi.fn(async () => 'ok');
    const { runs } = await setup(async (_input, ctx) => {
      const values = await Promise.allSettled([ctx.call('models.generate', { count: 2 }, 'one'), ctx.call('models.generate', { count: 1 }, 'two')]);
      return { result: values.map(value => value.status === 'fulfilled' ? value.value : value.reason.code) };
    }, { 'models.generate': model });
    const prepared = await runs.prepare(request({ maxModelCalls: 2 }), scope);
    await runs.approve(prepared.id, scope.scope, ['models.generate']);
    const result = await runs.wait(prepared.id, scope.scope);
    expect(result.results.n.result).toEqual(['ok', 'NODE_BUDGET_EXCEEDED']);
    expect(result.modelCalls).toBe(2); expect(model).toHaveBeenCalledTimes(1);
    const second = await setup(async (_input, ctx) => ({ result: (await Promise.allSettled([
      ctx.call('models.generate', { prompt: 'first' }, 'same'), ctx.call('models.generate', { prompt: 'changed' }, 'same'),
    ])).map(value => value.status === 'rejected' ? value.reason.code : value.value) }), { 'models.generate': model });
    const next = await second.runs.prepare(request(), scope); await second.runs.approve(next.id, scope.scope, ['models.generate']);
    expect((await second.runs.wait(next.id, scope.scope)).results.n.result).toEqual(['ok', 'NODE_REQUEST_CONFLICT']);
  });
  it('cancels on project exit and restores interrupted records without replaying', async () => {
    let started; const began = new Promise(resolve => { started = resolve; });
    const model = vi.fn((_input, ctx) => new Promise((_resolve, reject) => {
      started(); ctx.signal.addEventListener('abort', () => reject(Object.assign(new Error('stopped'), { code: 'NODE_EXECUTION_CANCELLED' })), { once: true });
    }));
    const { runs, store } = await setup(async (_input, ctx) => ({ result: await ctx.call('models.generate', {}, 's') }), { 'models.generate': model });
    const prepared = await runs.prepare(request(), scope); await runs.approve(prepared.id, scope.scope, ['models.generate']); await began;
    expect(runs.find('p', 'request1', scope.scope).status).toBe('running');
    expect(runs.find('p', 'request1', 'another')).toBeNull();
    await runs.stopProject('p', scope.scope); expect(runs.get(prepared.id, scope.scope).status).toBe('cancelled');
    const record = (await store.list())[0]; record.status = 'running'; await store.save(record);
    const reopened = await setup(() => { throw new Error('replayed'); }, {}, store);
    expect(reopened.runs.get(prepared.id, scope.scope).status).toBe('interrupted');
    expect(model).toHaveBeenCalledTimes(1); await runs.close(); await reopened.runs.close();
  });
  it('rolls back failed prepare/approval storage writes before any effects', async () => {
    const store = memoryStore(), save = store.save; store.save = vi.fn(save);
    const model = vi.fn(async () => 'ok');
    const { runs } = await setup(async (_input, ctx) => ({ result: await ctx.call('models.generate', {}, 's') }), { 'models.generate': model }, store);
    store.save.mockRejectedValueOnce(new Error('disk full'));
    await expect(runs.prepare(request(), scope)).rejects.toThrow('disk full'); expect(runs.list('p', scope.scope)).toEqual([]);
    const prepared = await runs.prepare(request(), scope);
    store.save.mockRejectedValueOnce(new Error('disk full'));
    await expect(runs.approve(prepared.id, scope.scope, ['models.generate'])).rejects.toThrow('disk full');
    expect(runs.get(prepared.id, scope.scope).status).toBe('awaiting_approval'); expect(model).not.toHaveBeenCalled();
    await runs.approve(prepared.id, scope.scope, ['models.generate']);
    expect((await runs.wait(prepared.id, scope.scope)).status).toBe('success'); await runs.close();
  });
  it('migrates parameters and both sides of implicit edges and initial inputs', async () => {
    const registry = new NodeRegistry(), base = manifest();
    base.nodes[0] = { ...base.nodes[0], version: '2.0.0', inputs: [{ id: 'in2', media: ['text'], multiple: true }], outputs: [{ id: 'out2', media: ['text'] }],
      migrations: [{ from: '1.0.0', to: '2.0.0', renameInputs: { in1: 'in2' }, renameOutputs: { out1: 'out2' }, renameParameters: { old: 'text' } }] };
    registry.register({ manifest: base, executors: { run: ({ inputs, parameters }) => ({ out2: (inputs.in2 || []).join(',') + parameters.text }) } });
    const runs = await createNodeRunService({ registry, store: memoryStore(), capabilities: {}, policy: [], readProject: async () => ({ id: 'p' }) });
    const prepared = await runs.prepare({ requestId: 'migration', projectId: 'p', nodes: [
      { id: 'a', type: 'test', nodeVersion: '1.0.0', parameters: { old: 'A' } },
      { id: 'b', type: 'test', nodeVersion: '1.0.0', parameters: { old: 'B' }, inputLinks: [{ sourceNodeId: 'a', sourcePortId: 'out1', targetPortId: 'in1' }] },
    ], initialInputs: { a: [{ targetPortId: 'in1', value: 'start' }] } }, scope);
    expect((await runs.wait(prepared.id, scope.scope)).results.b).toEqual({ out2: 'startAB' }); await runs.close();
  });
});

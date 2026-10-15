// @vitest-environment jsdom
import './helpers/modelCatalog.js';
import { afterEach, expect, it, vi } from 'vitest';
import { browserHost } from '../modules/kernel/browser.ts';
import { createCanvasCreationControl } from '../modules/agent/ui/agent/canvasCreationControl.ts';
import { AgentOperationError } from '../modules/contracts/agentErrors.js';

const releases = [];
afterEach(() => { releases.splice(0).reverse().forEach(release => release()); vi.useRealTimers(); });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function fixture(links, { limit = 4, blocked = () => false, failWrite } = {}) {
  const model = 'Qwen-Image 2.0 Pro · 移动云';
  let nodes = Object.entries(links).map(([id, parentIds]) => ({ id, type: 'Image', title: id,
    imageModel: model, prompt: id, parentIds, status: 'idle', x: 0, y: 0 }));
  const gates = new Map(nodes.map(node => [node.id, deferred()]));
  let stored, active = 0, peak = 0;
  const patch = (id, change) => { nodes = nodes.map(node => node.id === id ? { ...node, ...change } : node); };
  const check = record => { expect(record.revision).toBe(stored.revision); };
  const journal = {
    prepare: vi.fn(async batch => { stored = { ...structuredClone(batch), revision: 1 }; return structuredClone(stored); }),
    claim: vi.fn(async record => { check(record); stored.state = 'running'; stored.revision++; return structuredClone(stored); }),
    record: vi.fn(async (record, nodeId, state) => {
      check(record);
      await Promise.resolve(); // Overlapping writes with a stale CAS revision must fail this fixture.
      check(record);
      if (failWrite?.(nodeId, state)) throw new AgentOperationError('模拟记录失败', { operation: 'test-plan-write' });
      const item = stored.items.find(item => item.nodeId === nodeId);
      if (state === 'submitted') {
        expect(stored.state).toBe('running');
        expect(item.state).toBe('pending');
        for (const dependency of item.dependsOn) expect(stored.items.find(parent => parent.nodeId === dependency).state).toBe('success');
      } else expect(item.state).toBe('submitted');
      item.state = state; stored.revision++; return structuredClone(stored);
    }),
    finish: vi.fn(async record => {
      check(record); expect(active).toBe(0);
      stored.state = 'finished'; stored.revision++; return structuredClone(stored);
    }),
  };
  const prepare = vi.fn(async (all, node) => ({ imageModel: node.imageModel, imageMode: 'text-to-image',
    prompt: node.prompt, references: node.parentIds.map(id => all.find(parent => parent.id === id).resultUrl || '') }));
  const concurrency = vi.fn(async () => ({ modelId: 'shared-model', blocked: blocked(), inFlight: 0, maxConcurrent: limit }));
  releases.push(browserHost.services.register('ui.generation.preparation', {
    prepare, sources: async () => [{ label: '移动云', media: [{ kind: 'image', models: [{ name: model, configured: true }] }] }],
  }));
  releases.push(browserHost.services.register('ui.generation', { concurrency }));
  const generate = vi.fn(async (id, authorization) => {
    await authorization.reserve('attempt-' + id);
    if (!authorization.valid()) return;
    authorization.submitted('attempt-' + id);
    patch(id, { status: 'loading', generationAttemptId: 'attempt-' + id });
    peak = Math.max(peak, ++active);
    try {
      const state = await gates.get(id).promise;
      patch(id, { status: state, generationAttemptId: undefined, ...(state === 'success' ? { resultUrl: '/' + id + '.png' } : {}) });
    } finally { active--; }
  });
  const control = createCanvasCreationControl(async () => ({ ok: true, revision: 'r1' }),
    () => ({ projectId: 'p1', nodes: () => nodes, generate }), journal);
  const result = await control.control({ requestId: 'request-1', sessionId: 's1', projectId: 'p1',
    expiresAt: Date.now() + 60000, command: { action: 'prepareGeneration', revision: 'r1', nodeIds: Object.keys(links) } });
  expect(result.ok).toBe(true);
  return { control, id: result.generationPlanId, generate, journal, prepare, concurrency, patch,
    finish: (id, state = 'success') => gates.get(id).resolve(state),
    finishAll: () => gates.forEach(gate => gate.resolve('success')),
    peak: () => peak, snapshot: () => control.getSnapshot()[0],
  };
}

it('starts independent nodes together, caps the batch at four and claims duplicate approvals once', async () => {
  const f = await fixture({ a: [], b: [], c: [], d: [], e: [] });
  const completion = f.control.approve(f.id);
  await f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(4));
  expect(f.peak()).toBe(4);
  expect(f.journal.finish).not.toHaveBeenCalled();
  f.finish('a');
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(5));
  f.finishAll(); await completion;
  expect(f.journal.claim).toHaveBeenCalledTimes(1);
  expect(f.snapshot().items.every(item => item.state === 'success')).toBe(true);
  expect(f.journal.record).toHaveBeenCalledTimes(10);
});

it('waits for all parents and starts a ready child while an unrelated branch is still running', async () => {
  const f = await fixture({ join: ['a', 'b'], a: [], b: [], independent: [] });
  const completion = f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(3));
  f.finish('a');
  await vi.waitFor(() => expect(f.snapshot().items.find(item => item.nodeId === 'a').state).toBe('success'));
  expect(f.generate.mock.calls.map(call => call[0])).not.toContain('join');
  f.finish('b');
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(4));
  const authorization = f.generate.mock.calls.find(call => call[0] === 'join')[1];
  expect(JSON.parse(authorization.request).references).toEqual(['/a.png', '/b.png']);
  expect(f.snapshot().items.find(item => item.nodeId === 'independent').state).toBe('submitted');
  f.finishAll(); await completion;
});

it('stops failed descendants while continuing independent work', async () => {
  const f = await fixture({ a: [], child: ['a'], grandchild: ['child'], b: [], c: [] }, { limit: 2 });
  const completion = f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(2));
  f.finish('a', 'error');
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(3));
  f.finishAll(); await completion;
  expect(Object.fromEntries(f.snapshot().items.map(item => [item.nodeId, item.state])))
    .toEqual({ a: 'failed', child: 'stopped', grandchild: 'stopped', b: 'success', c: 'success' });
});

it('reserves model slots before preflight so a limit of one queues the other nodes', async () => {
  const f = await fixture({ a: [], b: [], c: [] }, { limit: 1 });
  const completion = f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(1));
  f.finish('a');
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(2));
  f.finish('b');
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(3));
  f.finishAll(); await completion;
  expect(f.peak()).toBe(1);
});

it('waits for external model capacity without submitting or replaying a node', async () => {
  vi.useFakeTimers();
  let busy = true;
  const f = await fixture({ a: [] }, { blocked: () => busy });
  const completion = f.control.approve(f.id);
  await vi.advanceTimersByTimeAsync(0);
  expect(f.generate).not.toHaveBeenCalled();
  busy = false;
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.generate).toHaveBeenCalledTimes(1);
  f.finishAll(); await completion;
});

it('cancels queued nodes immediately and finalizes after active branch records settle', async () => {
  const f = await fixture({ a: [], b: [], c: [] }, { limit: 2 });
  const completion = f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(2));
  const cancelled = f.control.cancel(f.id);
  expect(f.snapshot().state).toBe('cancelled');
  expect(f.journal.finish).not.toHaveBeenCalled();
  f.finishAll(); await Promise.all([completion, cancelled]);
  expect(f.generate).toHaveBeenCalledTimes(2);
  expect(f.snapshot().state).toBe('cancelled');
  expect(f.snapshot().items.find(item => item.nodeId === 'c').state).toBe('stopped');
  expect(f.journal.finish).toHaveBeenCalledTimes(1);
});

it('does not start a queued node whose configuration changed while waiting', async () => {
  const f = await fixture({ a: [], b: [] }, { limit: 1 });
  const completion = f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(1));
  f.patch('b', { prompt: '修改后的提示词' });
  f.finishAll(); await completion;
  expect(f.generate).toHaveBeenCalledTimes(1);
  expect(f.snapshot().items.find(item => item.nodeId === 'b').state).toBe('stopped');
});

it('does not submit descendants or more branches after a journal write becomes uncertain', async () => {
  const f = await fixture({ a: [], b: [], child: ['a'] }, { failWrite: (id, state) => id === 'a' && state === 'success' });
  const completion = f.control.approve(f.id);
  await vi.waitFor(() => expect(f.generate).toHaveBeenCalledTimes(2));
  f.finishAll(); await completion;
  expect(f.generate.mock.calls.map(call => call[0])).toEqual(['a', 'b']);
  expect(f.snapshot().items.find(item => item.nodeId === 'a').state).toBe('unconfirmed');
  expect(f.journal.finish).not.toHaveBeenCalled();
});

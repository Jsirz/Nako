import { afterEach, expect, it, vi } from 'vitest';
import { createNodeRunService } from '../modules/kernel/nodeRunService.js';
import { NodeRegistry } from '../modules/kernel/nodeRegistry.js';
import { createNodeGenerationRecovery } from '../modules/desktop-shell-observability/nodeGenerationRecovery.js';
import { createNodeModelObserver, nodeModelAttemptId } from '../modules/generation-core/server/generation/nodeModelService.js';
import { nodeGenerationClient } from '../modules/canvas-ui/ui/nodes/nodeGenerationClient.ts';

afterEach(() => vi.unstubAllGlobals());
const interrupted = 'GENERATION_OBSERVATION_INTERRUPTED';
function record(status = 'error') {
  return { id: 'r', requestId: 'attempt', projectId: 'p', scope: 'owner', status, code: interrupted,
    error: 'observation interrupted', nodes: [{ id: 'n', type: 'video', pluginId: 'nako.canvas-core' }],
    steps: { 'n:generate': { capability: 'models.generate', status: 'error', signature: 'same-request' } },
    events: [], results: {}, states: { n: 'error' }, maxModelCalls: 1, modelCalls: 1, grants: ['models.generate'],
    request: { requestId: 'attempt' }, capabilities: ['models.generate'] };
}
async function fixture(initial = record()) {
  let saved = structuredClone(initial);
  const store = { list: async () => [saved], save: vi.fn(async value => { saved = structuredClone(value); }) };
  const attemptId = nodeModelAttemptId({ runId: initial.id, stepId: 'n:generate' });
  let task = { nodeId: 'node-' + attemptId, attemptId, kind: 'video', projectId: 'p', status: 'unknown', code: interrupted };
  const recoverTask = vi.fn(async current => ({ ...current, recoveryPending: true }));
  const coordinator = { getTask: vi.fn(() => task) };
  const observeNode = createNodeModelObserver({ coordinator, recoverTask, applicationContext: {} });
  const generate = vi.fn();
  const runs = await createNodeRunService({ registry: new NodeRegistry(), store,
    capabilities: { 'models.generate': generate }, policy: ['models.generate'], readProject: async () => ({ id: 'p' }),
    recoverRun: createNodeGenerationRecovery({ observeNode }) });
  return { runs, store, recoverTask, generate, coordinator, saved: () => saved, setTask: value => { task = value; } };
}

it('recovers the original completed video into the durable node receipt without another model call', async () => {
  const f = await fixture();
  try {
    const pending = await f.runs.observe('r', 'owner');
    expect(pending).toMatchObject({ status: 'error', recoveryPending: true, modelCalls: 1 });
    expect(pending.steps).toBeUndefined();
    f.recoverTask.mockImplementation(async task => ({ ...task, status: 'success', resultUrl: '/library/media/p/videos/result.mp4' }));
    const result = await f.runs.observe('r', 'owner');
    expect(result).toMatchObject({ status: 'success', recoveryPending: false, modelCalls: 1,
      results: { n: { video: { url: '/library/media/p/videos/result.mp4' } } }, states: { n: 'success' } });
    expect(result.error).toBeUndefined(); expect(result.code).toBeUndefined();
    expect(f.saved().steps['n:generate']).toMatchObject({ status: 'success', signature: 'same-request' });
    expect(f.generate).not.toHaveBeenCalled();
    await f.runs.observe('r', 'owner');
    expect(f.recoverTask).toHaveBeenCalledTimes(2);
  } finally { await f.runs.close(); }
});

it('finds tasks for interrupted runs after restart and rejects cross-user or cross-project observation', async () => {
  const f = await fixture(record('running'));
  try {
    expect(f.runs.get('r', 'owner').status).toBe('interrupted');
    expect(() => f.runs.observe('r', 'other')).toThrow();
    f.setTask({ projectId: 'other', attemptId: 'wrong', status: 'success' });
    expect((await f.runs.observe('r', 'owner')).status).toBe('interrupted');
    expect(f.recoverTask).not.toHaveBeenCalled();
  } finally { await f.runs.close(); }
});

it('deduplicates observations and does not resurrect a cancelled run', async () => {
  const f = await fixture();
  let release;
  f.recoverTask.mockImplementation(task => new Promise(resolve => { release = () => resolve({ ...task, status: 'success', resultUrl: '/result.mp4' }); }));
  const first = f.runs.observe('r', 'owner');
  expect(f.runs.observe('r', 'owner')).toBe(first);
  await Promise.resolve();
  await f.runs.cancel('r', 'owner'); release();
  expect((await first).status).toBe('cancelled');
  expect(f.saved().results).toEqual({}); expect(f.generate).not.toHaveBeenCalled();
  await f.runs.close();
});

it('keeps confirmed provider failures terminal and does not replay arbitrary node packages', async () => {
  const f = await fixture();
  f.recoverTask.mockImplementation(async task => ({ ...task, status: 'failed', code: 'PROVIDER_FAILED', error: 'confirmed failure' }));
  expect(await f.runs.observe('r', 'owner')).toMatchObject({ status: 'error', recoveryPending: false, code: 'PROVIDER_FAILED' });
  await f.runs.close();
  const observeNode = vi.fn();
  const recover = createNodeGenerationRecovery({ observeNode });
  const run = record(); run.nodes[0].pluginId = 'custom.video';
  expect(await recover({ run, steps: [{ key: 'n:generate', capability: 'models.generate' }] })).toBeNull();
  expect(observeNode).not.toHaveBeenCalled();
});

it('keeps the canvas attempt recoverable until the node service supplies the video', async () => {
  const f = await fixture();
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(await f.runs.observe('r', 'owner'))));
  const signal = new AbortController().signal;
  expect(await nodeGenerationClient.observe('p', 'n', 'attempt', signal)).toMatchObject({
    status: 'unknown', recoveryPending: true, attemptId: 'attempt' });
  f.recoverTask.mockImplementation(async task => ({ ...task, status: 'success', resultUrl: '/result.mp4' }));
  expect(await nodeGenerationClient.observe('p', 'n', 'attempt', signal)).toMatchObject({
    status: 'success', recoveryPending: false, attemptId: 'attempt', resultUrl: '/result.mp4' });
  await f.runs.close();
});

it('restores the request ID cleared by the old canvas only from its latest unresolved node run', async () => {
  const run = record(); run.createdAt = '2026-09-28T00:00:00Z';
  const other = { ...run, id: 'other', requestId: 'other-attempt', nodes: [{ id: 'other-node', pluginId: 'nako.canvas-core' }] };
  const fetcher = vi.fn(async url => Response.json(url.startsWith('/api/node-runs?') ? [other, run]
    : { ...run, status: 'success', results: { n: { video: { url: '/original.mp4' } } } }));
  vi.stubGlobal('fetch', fetcher);
  expect(await nodeGenerationClient.observe('p', 'n', '', new AbortController().signal)).toMatchObject({
    status: 'success', attemptId: 'attempt', resultUrl: '/original.mp4' });
  expect(fetcher.mock.calls[1][0]).toBe('/api/node-runs/r');
});

it('does not restore an older unresolved attempt over a newer successful run', async () => {
  const run = record(); run.createdAt = '2026-09-27T00:00:00Z';
  const newer = { ...run, id: 'new', status: 'success', code: undefined, createdAt: '2026-09-28T00:00:00Z' };
  const fetcher = vi.fn(async () => Response.json([run, newer])); vi.stubGlobal('fetch', fetcher);
  expect(await nodeGenerationClient.observe('p', 'n', '', new AbortController().signal)).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

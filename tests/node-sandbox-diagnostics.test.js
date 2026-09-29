import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { executeIsolatedNode } from '../modules/desktop-shell-observability/nodeSandbox.js';
import { launchNodeSandbox } from '../modules/desktop-shell-observability/nodeSandboxProcess.js';

vi.mock('../modules/desktop-shell-observability/nodeSandboxProcess.js', () => ({ launchNodeSandbox: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const configuration = { sources: {}, entry: 'index.mjs', method: 'run', pluginId: 'test.node', timeoutMs: 1000 };
function child() {
  const value = Object.assign(new EventEmitter(), { stderr: new PassThrough(), connected: true,
    kill: vi.fn(), send: vi.fn((_message, callback) => callback?.(null)) });
  launchNodeSandbox.mockReturnValue(value);
  return value;
}

it('captures bounded stderr and exit details while keeping raw diagnostics out of the user error', async () => {
  const worker = child(), logger = { error: vi.fn() };
  const pending = executeIsolatedNode({ ...configuration, logger }, {}, { runId: 'run1', nodeId: 'node1' });
  const assertion = expect(pending).rejects.toMatchObject({ code: 'NODE_EXECUTION_FAILED', details: { exitCode: 1, signal: null } });
  worker.stderr.write('x'.repeat(10000));
  worker.emit('exit', 1, null);
  worker.stderr.write('bootstrap dependency failed');
  worker.emit('close', 1, null);
  await assertion;
  const details = logger.error.mock.calls[0][1];
  expect(details).toMatchObject({ pluginId: 'test.node', runId: 'run1', nodeId: 'node1', exitCode: 1 });
  expect(details.stderr.length).toBe(8192);
  expect(details.stderr).toMatch(/bootstrap dependency failed$/);
  await expect(pending).rejects.not.toThrow('bootstrap dependency failed');
});

it('returns structured launch failures', async () => {
  launchNodeSandbox.mockImplementation(() => { throw Object.assign(new Error('spawn failed'), { code: 'ENOENT' }); });
  const logger = { error: vi.fn() };
  await expect(executeIsolatedNode({ ...configuration, logger }, {})).rejects.toMatchObject({ code: 'NODE_EXECUTION_FAILED' });
  expect(logger.error.mock.calls[0][1]).toMatchObject({ code: 'ENOENT' });
});

it('handles IPC send failures and aborts in-flight host work on unexpected exit', async () => {
  const worker = child();
  let signal;
  const pending = executeIsolatedNode(configuration, {}, { call: (_capability, _input, _step, childSignal) => {
    signal = childSignal; return new Promise(() => {});
  } });
  const assertion = expect(pending).rejects.toMatchObject({ code: 'NODE_EXECUTION_FAILED' });
  worker.emit('message', { type: 'call', capability: 'models.generate', input: {}, stepId: 's' });
  worker.emit('close', null, 'SIGKILL');
  await assertion;
  expect(signal.aborted).toBe(true);
  const next = child();
  next.send.mockImplementation((_packet, callback) => callback(new Error('IPC closed')));
  await expect(executeIsolatedNode(configuration, {})).rejects.toThrow('IPC closed');
});

it('does not misreport successful or cancelled process cleanup as a crash', async () => {
  for (const cancel of [false, true]) {
    const worker = child(), logger = { error: vi.fn() }, controller = new AbortController();
    const pending = executeIsolatedNode({ ...configuration, logger }, {}, { signal: controller.signal });
    const assertion = cancel ? expect(pending).rejects.toMatchObject({ code: 'NODE_EXECUTION_CANCELLED' })
      : expect(pending).resolves.toEqual({ text: 'done' });
    if (cancel) controller.abort(); else worker.emit('message', { type: 'result', value: { text: 'done' } });
    worker.emit('close', null, 'SIGTERM');
    await assertion;
    expect(logger.error).not.toHaveBeenCalled();
  }
});

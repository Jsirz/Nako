import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createGenerationCoordinator } from '../modules/generation-core/server/generation/generationCoordinator.js';
import { executeGenerationTask } from '../modules/generation-core/server/generation/generationExecution.js';
import { GenerationTaskJournal } from '../plugins/storage/task-journal/taskJournal.js';
import { GENERATION_ADMISSION_CODES as CODES } from '../modules/contracts/generationAdmission.js';
import { ERRORS } from '../modules/contracts/index.js';

const coordinators = [], directories = [];
afterEach(() => {
  coordinators.splice(0).forEach(coordinator => coordinator.dispose());
  directories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true }));
});
const input = { nodeId: 'node', attemptId: 'attempt-1', kind: 'image', modelName: 'model', modelIdKey: 'model', maxConcurrent: 1 };
function setup(taskStore) {
  const setTimer = vi.fn(() => 1);
  const coordinator = createGenerationCoordinator({ taskStore, setTimer, clearTimer: vi.fn(), now: () => 1000 });
  coordinators.push(coordinator);
  return { coordinator, setTimer };
}
function store() {
  const records = new Map();
  return { get: id => structuredClone(records.get(id)), upsert: vi.fn(task => records.set(task.nodeId, structuredClone(task))) };
}
function finish(coordinator, status) {
  if (status === 'success') coordinator.complete('node');
  if (status === 'failed') coordinator.fail('node');
  if (status === 'cancelled') coordinator.cancel('node');
  if (status === 'unknown') coordinator.finalizeUnknown('node');
}
const duplicate = { ok: false, code: CODES.duplicateAttempt, status: 409, retryable: false };

describe('generation attempt admission', () => {
  it.each(['loading', 'success', 'failed', 'cancelled', 'unknown'])('rejects replay of %s without publishing state or consuming admission', status => {
    const taskStore = store();
    const { coordinator, setTimer } = setup(taskStore);
    expect(coordinator.begin(input).ok).toBe(true);
    finish(coordinator, status);
    const before = coordinator.getTask('node');
    const writes = taskStore.upsert.mock.calls.length;
    expect(coordinator.begin(input)).toMatchObject(duplicate);
    expect(coordinator.getTask('node')).toEqual(before);
    expect(taskStore.upsert).toHaveBeenCalledTimes(writes);
    expect(setTimer).toHaveBeenCalledTimes(1);
    expect(coordinator.getConcurrency('model').inFlight).toBe(status === 'loading' ? 1 : 0);
  });

  it.each(['success', 'failed', 'cancelled', 'unknown'])('allows a new attempt after %s, but remembers the earlier attempt after restart', status => {
    const taskStore = store();
    const { coordinator } = setup(taskStore);
    coordinator.begin(input);
    finish(coordinator, status);
    expect(coordinator.begin({ ...input, attemptId: 'attempt-2' }).ok).toBe(true);
    coordinator.complete('node');
    const restarted = setup(taskStore);
    expect(restarted.coordinator.begin(input)).toMatchObject(duplicate);
    expect(restarted.coordinator.begin({ ...input, attemptId: 'attempt-2' })).toMatchObject(duplicate);
    expect(restarted.setTimer).not.toHaveBeenCalled();
    expect(restarted.coordinator.getConcurrency('model').inFlight).toBe(0);
  });

  it.each(['loading', 'success', 'unknown'])('reads the actual journal after restart for %s', status => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nako-admission-'));
    directories.push(directory);
    const filePath = path.join(directory, 'tasks.json');
    const first = setup(new GenerationTaskJournal({ filePath }));
    first.coordinator.begin(input);
    finish(first.coordinator, status);
    first.coordinator.dispose();
    const restarted = setup(new GenerationTaskJournal({ filePath }));
    expect(restarted.coordinator.begin(input)).toMatchObject(duplicate);
    expect(restarted.coordinator.getTask('node').status).toBe(status === 'loading' ? 'unknown' : status);
    expect(restarted.setTimer).not.toHaveBeenCalled();
  });

  it('does not overwrite a persisted active task with a different attempt', () => {
    const taskStore = store();
    taskStore.upsert({ ...input, status: 'loading' });
    const { coordinator } = setup(taskStore);
    expect(coordinator.begin({ ...input, attemptId: 'other' })).toMatchObject({ ok: false, code: CODES.nodeActive });
    expect(taskStore.upsert).toHaveBeenCalledTimes(1);
  });

  it('fails closed on store reads and does not burn the attempt when persistence fails', () => {
    const taskStore = store();
    taskStore.get = vi.fn().mockImplementationOnce(() => { throw new Error('read failed'); }).mockReturnValue(null);
    const { coordinator, setTimer } = setup(taskStore);
    expect(() => coordinator.begin(input)).toThrow(expect.objectContaining({ code: ERRORS.taskPersistence, status: 503 }));
    taskStore.upsert.mockImplementationOnce(() => { throw new Error('disk full'); });
    expect(() => coordinator.begin(input)).toThrow(expect.objectContaining({ code: ERRORS.taskPersistence }));
    expect(setTimer).not.toHaveBeenCalled();
    expect(coordinator.getConcurrency('model').inFlight).toBe(0);
    expect(coordinator.begin(input).ok).toBe(true);
  });

  it('rejects duplicate execution before budget reservation, remote submission and result persistence', async () => {
    const taskStore = store();
    const { coordinator } = setup(taskStore);
    const provider = { maximumCharge: vi.fn(async () => ({ guaranteed: true, currency: 'CNY', micros: 1 })),
      generateImage: vi.fn(async () => ({ buffer: Buffer.from('fixture') })) };
    const reserve = vi.fn(async () => {}), saveResult = vi.fn(async () => ({ resultUrl: '/fixture.png' }));
    const execution = { ...input, providerName: 'fixture', coordinator, provider, saveResult,
      executionContext: { modelIdKey: 'model', maxConcurrent: 1 }, appContext: { GENERATION_BUDGETS: { reserve } },
      request: { projectId: 'project', generationAttemptId: input.attemptId, agentAuthorizationId: 'authorization' } };
    await executeGenerationTask(execution);
    const before = coordinator.getTask('node'), writes = taskStore.upsert.mock.calls.length;
    await expect(executeGenerationTask(execution)).rejects.toMatchObject({ code: CODES.duplicateAttempt, status: 409, retryable: false });
    expect(provider.generateImage).toHaveBeenCalledTimes(1);
    expect(provider.maximumCharge).toHaveBeenCalledTimes(1);
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(saveResult).toHaveBeenCalledTimes(1);
    expect(taskStore.upsert).toHaveBeenCalledTimes(writes);
    expect(coordinator.getTask('node')).toEqual(before);
  });
});

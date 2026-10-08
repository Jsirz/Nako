import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createGenerationCoordinator } from '../modules/generation-core/server/generation/generationCoordinator.js';
import { GenerationTaskJournal } from '../plugins/storage/task-journal/taskJournal.js';
import { ERRORS } from '../modules/contracts/index.js';
import { publicGenerationTasks } from '../modules/generation-core/server/generation/generationRuntime.js';

const directories = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});
function setup() {
  let writable = true;
  const records = new Map();
  const coordinator = createGenerationCoordinator({
    taskStore: { get: id => records.get(id), upsert(task) {
      if (!writable) throw new Error('disk full');
      records.set(task.nodeId, structuredClone(task));
    } },
    setTimer: vi.fn(() => 1), clearTimer: vi.fn(), now: () => 1000,
  });
  return { coordinator, records, writable: value => { writable = value; } };
}
const input = { nodeId: 'node', kind: 'image', modelName: 'image-model', modelIdKey: 'model', maxConcurrent: 1 };
function journalFile() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nako-generation-state-'));
  directories.push(directory);
  return path.join(directory, 'tasks.json');
}

describe('durable generation state', () => {
  it('does not consume admission or create a live task when the initial write fails', () => {
    const f = setup();
    f.writable(false);
    expect(() => f.coordinator.begin(input)).toThrow(expect.objectContaining({ code: ERRORS.taskPersistence }));
    expect(f.coordinator.getTask('node')).toBeNull();
    expect(f.coordinator.getConcurrency('model').inFlight).toBe(0);
    f.writable(true);
    expect(f.coordinator.begin(input).ok).toBe(true);
    f.coordinator.dispose();
  });
  it('keeps the current state and lease when completion or pause cannot be persisted', () => {
    const f = setup();
    f.coordinator.begin(input);
    const before = f.coordinator.getTask('node');
    f.writable(false);
    expect(() => f.coordinator.complete('node', { resultUrl: '/result.png' })).toThrow();
    expect(() => f.coordinator.pauseObservation('node')).toThrow();
    expect(f.coordinator.getTask('node')).toEqual(before);
    expect(f.records.get('node')).toEqual(before);
    expect(f.coordinator.isActive('node')).toBe(true);
    expect(f.coordinator.getConcurrency('model').inFlight).toBe(1);
    f.writable(true);
    expect(f.coordinator.complete('node').status).toBe('success');
    expect(f.coordinator.getConcurrency('model').inFlight).toBe(0);
    expect(f.coordinator.fail('node')).toBe(false);
    f.coordinator.dispose();
  });
  it('leaves paused observation unchanged when reacquisition cannot be saved', () => {
    const f = setup();
    f.coordinator.begin(input);
    const paused = f.coordinator.pauseObservation('node');
    f.writable(false);
    expect(() => f.coordinator.reacquireObservation('node')).toThrow();
    expect(f.coordinator.getTask('node')).toEqual(paused);
    expect(f.coordinator.getConcurrency('model').inFlight).toBe(0);
    f.coordinator.dispose();
  });
  it('does not publish a journal update if atomic file replacement fails', () => {
    const filePath = journalFile();
    const journal = new GenerationTaskJournal({ filePath });
    journal.upsert({ nodeId: 'n', status: 'loading', updatedAt: 'old' });
    const original = fs.readFileSync(filePath, 'utf8');
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('disk full'); });
    expect(() => journal.upsert({ nodeId: 'n', status: 'success', updatedAt: 'new' })).toThrow();
    expect(journal.get('n').status).toBe('loading');
    expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
  });
  it('keeps valid journals when interrupted-state recovery cannot be written', () => {
    const filePath = journalFile();
    const journal = new GenerationTaskJournal({ filePath });
    journal.upsert({ nodeId: 'n', status: 'loading' });
    const original = fs.readFileSync(filePath, 'utf8');
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('disk full'); });
    expect(() => new GenerationTaskJournal({ filePath })).toThrow();
    expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
    expect(fs.readdirSync(path.dirname(filePath))).toEqual(['tasks.json']);
  });
  it('retains active tasks and zero terminal entries when the journal budget is exhausted', () => {
    const filePath = journalFile();
    const journal = new GenerationTaskJournal({ filePath, maxEntries: 1 });
    journal.upsert({ nodeId: 'done', status: 'success', updatedAt: '1' });
    journal.upsert({ nodeId: 'active', status: 'loading', updatedAt: '2' });
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8')).tasks.map(task => task.nodeId)).toEqual(['active']);
  });
  it('returns independent nested task and public journal snapshots', () => {
    const f = setup();
    try {
      const metadata = { remoteTask: { id: 'original' } };
      f.coordinator.begin({ ...input, metadata });
      metadata.remoteTask.id = 'changed';
      expect(f.coordinator.getTask('node').remoteTask.id).toBe('original');
      const task = f.coordinator.getTask('node');
      task.remoteTask.id = 'changed';
      expect(f.coordinator.getTask('node').remoteTask.id).toBe('original');
      const patch = { remoteTask: { id: 'updated' } };
      f.coordinator.update('node', patch);
      patch.remoteTask.id = 'changed';
      expect(f.coordinator.getTask('node').remoteTask.id).toBe('updated');
      const view = publicGenerationTasks({ coordinator: f.coordinator, journal: {
        get: id => f.records.get(id), list: () => [...f.records.values()],
      } });
      view.journal.list()[0].remoteTask.id = 'changed';
      expect(view.journal.get('node').remoteTask.id).toBe('updated');
      expect(view.coordinator.dispose).toBeUndefined();
      expect(view.journal.upsert).toBeUndefined();
    } finally {
      f.coordinator.dispose();
    }
  });
});

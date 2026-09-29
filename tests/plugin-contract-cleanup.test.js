import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GenerationTaskJournal } from '../plugins/storage/task-journal/taskJournal.js';
import { createTaskJournalPlugin } from '../plugins/storage/task-journal/index.js';
import { PluginHost } from '../modules/kernel/index.js';
import { readModelContributions, validateModelDefinitions } from '../scripts/model-contributions.mjs';
import { createMediaDownloadStore } from '../plugins/media/filesystem/downloadStore.js';

it('does not import public legacy journals and preserves canonical interrupted task receipts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-journal-contract-'));
  const libraryDirectory = path.join(root, 'library');
  const privateDirectory = path.join(root, 'private');
  const host = new PluginHost();
  try {
    await mkdir(libraryDirectory);
    const oldFile = path.join(libraryDirectory, 'generation-tasks.json');
    const oldContents = JSON.stringify([{ nodeId: 'old', status: 'queued' }]);
    await writeFile(oldFile, oldContents);
    await host.register(createTaskJournalPlugin({ libraryDirectory, privateDirectory })).start();
    const store = host.services.get('generation.taskStore');
    expect(store.list()).toEqual([]);
    store.upsert({ nodeId: 'current', status: 'loading', remoteTask: { taskId: 'receipt' } });
    await host.stop();
    const reopened = new GenerationTaskJournal({ filePath: path.join(privateDirectory, 'generation-tasks.json') });
    expect(reopened.get('current')).toMatchObject({ status: 'unknown', retryable: false, remoteTask: { taskId: 'receipt' } });
    expect(await readFile(oldFile, 'utf8')).toBe(oldContents);
  } finally {
    await host.stop();
    await rm(root, { recursive: true, force: true });
  }
});

it('rejects unregistered model import paths and mismatched provider kinds', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-model-contract-'));
  try {
    await mkdir(path.join(root, 'config'));
    await writeFile(path.join(root, 'config/model-plugins.json'), JSON.stringify([{ id: 'provider.test', entry: '../plugins/providers/test/implementation.js', exports: ['TEXT_MODELS'] }]));
    expect(() => readModelContributions(root)).toThrow('Invalid model contribution');
    const contribution = readModelContributions().find(item => item.id === 'provider.ecloud');
    expect(() => validateModelDefinitions({ ...contribution, exports: ['TEXT_MODELS'] }, { TEXT_MODELS: [{ name: 'wrong kind', catalogOrder: 1, provider: 'EcloudVideoProvider' }] })).toThrow('Invalid model/provider/kind');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('downloads through storage operations without overwriting files or escaping the library', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-download-contract-'));
  const scope = { libraryDirectory: path.join(root, 'library'), configDirectory: path.join(root, 'config') };
  const downloads = path.join(root, 'downloads');
  const store = createMediaDownloadStore({ defaultDirectory: () => downloads, selectDirectory: async () => null });
  try {
    await mkdir(path.join(scope.libraryDirectory, 'media'), { recursive: true });
    await writeFile(path.join(scope.libraryDirectory, 'media/sample.png'), 'fixture-bytes');
    expect((await store.settings({ scope })).body.askEachTime).toBe(false);
    const input = { scope, body: { sourceUrl: '/library/media/sample.png', fileName: 'image.png' } };
    expect((await store.save(input)).body.fileName).toBe('image.png');
    expect((await store.save(input)).body.fileName).toBe('image (1).png');
    expect(await readFile(path.join(downloads, 'image.png'), 'utf8')).toBe('fixture-bytes');
    expect((await store.save({ scope, body: { ...input.body, sourceUrl: '/library/%2e%2e%2fprivate.png' } })).status).toBe(400);
    expect((await store.selectDirectory({ scope })).body.status).toBe('cancelled');
    expect((await store.updateSettings({ scope, body: { askEachTime: 'yes' } })).status).toBe(400);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

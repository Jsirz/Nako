import { afterEach, describe, expect, it, vi } from 'vitest';
import { useServerCapabilities } from './helpers/serverCapabilities.js';
useServerCapabilities({ workflows: true });
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { workflowFixture } from './fixtures/workflowFixture.js';
import { LocalComfyExecutor } from '../plugins/workflows/local-comfyui/implementation.js';
import { LocalComfyClientError } from '../plugins/workflows/local-comfyui/client.js';
import { createSnapshotAssetSession } from '../plugins/workflows/local-comfyui/inputSnapshot.js';
import { stageInputs } from '../plugins/workflows/local-comfyui/inputStaging.js';

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function executorFixture() {
  const f = workflowFixture(), events = [];
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-workflow-modularity-'));
  roots.push(root);
  let time = Date.now(), ledger;
  const task = { nodeId: 'run', ...f.deployment, kind: 'workflow-test', projectId: 'project',
    deploymentId: 'deployment', bindingSetId: 'bindings', status: 'running' };
  const coordinator = {
    update: vi.fn((id, patch) => { expect(id).toBe('run'); Object.assign(task, patch); events.push(patch.phase); }),
    isActive: () => task.status === 'running', getTask: () => task, heartbeat: vi.fn(),
    fail: vi.fn((id, patch) => { expect(id).toBe('run'); Object.assign(task, patch, { status: 'failed' }); }),
    finalizeUnknown: vi.fn(() => { task.status = 'unknown'; }),
    finalizeCancel: vi.fn((id, patch) => Object.assign(task, patch, { status: 'cancelled' })),
    pauseObservation: vi.fn(() => { task.phase = 'observation-paused'; }),
    completeIfActive: vi.fn(() => { events.push('scheduler-commit'); task.status = 'success'; return { schedulerCommitProof: 'proof' }; }),
  };
  const client = {
    submitPrompt: vi.fn(async ({ promptId }) => {
      expect(task.promptId).toBe(promptId);
      expect(task.compiledPromptHash).toMatch(/^[a-f0-9]{64}$/);
      events.push('remote-submit'); return { prompt_id: promptId };
    }),
    getHistory: vi.fn(async () => ({})),
    uploadInput: vi.fn(), cancelJob: vi.fn(),
  };
  const runStore = {
    rootDirectory: root,
    saveInputStageLedger: vi.fn(async (id, value) => { ledger = structuredClone(value); }),
    requireInputStageLedger: vi.fn(async () => ledger),
    stagePendingReceipt: vi.fn(async (id, receipt) => {
      events.push('receipt-stage'); return { pendingReceiptId: 'pending', receiptPayloadHash: 'hash', receipt };
    }),
    publishReceipt: vi.fn(async () => { events.push('receipt-publish'); }), discardPendingReceipt: vi.fn(),
  };
  const directoryGrantStore = { deleteOwnedStagedFiles: vi.fn(async () => ({ results: [] })) };
  const ports = {
    definitionStore: { readExecutionPlan: vi.fn(async () => f) },
    configurationStore: { requireDeployment: vi.fn(async () => f.deployment), requireBindingSet: vi.fn(async () => f.bindingSet) },
    deploymentService: { verifyDeployment: vi.fn() }, assetResolver: { resolve: vi.fn() },
    coordinator, runStore, directoryGrantStore, clientFactory: vi.fn(() => client),
    libraryDirectory: path.join(root, 'library'), logger: { error: vi.fn() },
    now: () => time, wait: async ms => { time += ms; },
  };
  const executor = new LocalComfyExecutor(ports);
  const input = { runId: 'run', definitionId: 'definition', deploymentId: 'deployment', bindingSetId: 'bindings',
    projectId: 'project', values: {}, signal: new AbortController().signal };
  return { ...f, executor, ports, task, input, client, runStore, coordinator, directoryGrantStore, events };
}

describe('local workflow execution transaction', () => {
  it('keeps injected stores and clients private', async () => {
    const { executor } = await executorFixture();
    expect(Object.keys(executor)).toEqual([]);
    expect(executor.runStore).toBeUndefined();
    expect(executor.clientFactory).toBeUndefined();
  });

  it('rejects mismatched revisions before creating a remote client', async () => {
    const f = await executorFixture(); f.deployment.definitionRevision = 2;
    await f.executor.execute(f.input);
    expect(f.task.code).toBe('WORKFLOW_REFERENCE_CONFLICT');
    expect(f.ports.clientFactory).not.toHaveBeenCalled();
    expect(f.client.submitPrompt).not.toHaveBeenCalled();
  });

  it('persists the upload target before side effects and retains it after an ambiguous failure', async () => {
    const ledger = {}, saved = [];
    const runStore = { saveInputStageLedger: vi.fn(async (id, data) => saved.push(structuredClone(data))) };
    const client = { uploadInput: vi.fn(async ({ filename, subfolder }) => {
      expect(saved.at(-1).entries[0]).toMatchObject({ relativeHandle: `${subfolder}/${filename}`, state: 'uploading' });
      throw new LocalComfyClientError('connection lost', 'COMFYUI_UNAVAILABLE');
    }) };
    await expect(stageInputs({ runStore }, { runId: 'run', deployment: { id: 'deployment', inputCleanupGrantId: 'grant' },
      client, assets: [{ assetId: 'asset', projectId: 'project', type: 'image', sha256: 'a'.repeat(64), bytes: 10, filename: 'photo.png' }],
      stageLedger: ledger, signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: 'COMFYUI_UNAVAILABLE' });
    expect(saved.at(-1).entries).toHaveLength(1);
    expect(client.uploadInput).toHaveBeenCalledTimes(1);
  });

  it('does not resubmit or delete staged inputs when submission acknowledgement is lost', async () => {
    const f = await executorFixture();
    f.client.submitPrompt.mockRejectedValue(new LocalComfyClientError('lost', 'COMFYUI_UNAVAILABLE'));
    await f.executor.execute(f.input);
    expect(f.client.submitPrompt).toHaveBeenCalledTimes(1);
    expect(f.coordinator.finalizeUnknown).toHaveBeenCalled();
    expect(f.directoryGrantStore.deleteOwnedStagedFiles).not.toHaveBeenCalled();
    expect(await f.runStore.requireInputStageLedger()).toMatchObject({ cleanupState: 'orphaned' });
    f.task.interruptedPhase = 'submission_unknown';
    await f.executor.resume({ task: f.task, signal: f.input.signal });
    expect(f.client.submitPrompt).toHaveBeenCalledTimes(1);
    expect(f.client.uploadInput).not.toHaveBeenCalled();
    expect(f.coordinator.finalizeUnknown).toHaveBeenCalledTimes(2);
  });

  it('pauses observation without cleaning inputs when accepted jobs are still running', async () => {
    const f = await executorFixture();
    await f.executor.execute(f.input);
    expect(f.coordinator.pauseObservation).toHaveBeenCalled();
    expect(f.client.cancelJob).not.toHaveBeenCalled();
    expect(f.directoryGrantStore.deleteOwnedStagedFiles).not.toHaveBeenCalled();
    expect(await f.runStore.requireInputStageLedger()).toMatchObject({ cleanupState: 'pending' });
  });

  it('publishes receipts only after scheduler commit on successful execution and recovery', async () => {
    const f = await executorFixture();
    f.client.getHistory.mockImplementation(async promptId => ({ [promptId]: {
      status: { status_str: 'success', completed: true }, outputs: { '1': { text: ['result'] } },
    } }));
    await f.executor.execute(f.input);
    expect(f.coordinator.fail).not.toHaveBeenCalled();
    expect(f.task.status).toBe('success');
    expect(f.events.indexOf('receipt-stage')).toBeLessThan(f.events.indexOf('scheduler-commit'));
    expect(f.events.indexOf('scheduler-commit')).toBeLessThan(f.events.indexOf('receipt-publish'));
    expect(f.runStore.publishReceipt).toHaveBeenCalledWith('pending', 'proof');
    f.task.status = 'running';
    await f.executor.resume({ task: f.task, signal: f.input.signal });
    expect(f.coordinator.fail).not.toHaveBeenCalled();
    expect(f.client.submitPrompt).toHaveBeenCalledTimes(1);
    expect(f.runStore.publishReceipt).toHaveBeenCalledTimes(2);
  });

  it('cleans interrupted pre-submission runs without issuing a prompt', async () => {
    const f = await executorFixture();
    await f.runStore.saveInputStageLedger('run', { cleanupState: 'pending', entries: [] });
    await f.executor.resume({ task: f.task, signal: f.input.signal });
    expect(f.task.code).toBe('WORKFLOW_INTERRUPTED_BEFORE_SUBMISSION');
    expect(f.directoryGrantStore.deleteOwnedStagedFiles).toHaveBeenCalled();
    expect(f.client.submitPrompt).not.toHaveBeenCalled();
  });

  it('refuses cleanup without terminal proof when remote history is unavailable', async () => {
    const f = await executorFixture();
    await f.runStore.saveInputStageLedger('run', { cleanupState: 'orphaned', deploymentId: 'deployment', cleanupGrantId: 'grant', entries: [] });
    Object.assign(f.task, { promptId: 'remote-id', status: 'failed', remoteMayContinue: true });
    f.client.getHistory.mockRejectedValue(new LocalComfyClientError('offline', 'COMFYUI_UNAVAILABLE'));
    await expect(f.executor.retryInputCleanup('run')).rejects.toMatchObject({ code: 'INPUT_CLEANUP_REMOTE_MAY_CONTINUE' });
    expect(f.directoryGrantStore.deleteOwnedStagedFiles).not.toHaveBeenCalled();
  });

  it('serializes concurrent snapshot reservations so the per-run asset quota cannot be exceeded', async () => {
    const resolver = { resolve: vi.fn(async ref => ({ ...ref, bytes: 1, sha256: 'hash' })) };
    const session = createSnapshotAssetSession({ assetResolver: resolver }, 'run');
    const results = await Promise.allSettled(Array.from({ length: 21 }, (_, i) => session.resolve({ assetId: `asset${i}`, projectId: 'project', type: 'image' })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(20);
    expect(results.find(result => result.status === 'rejected').reason.code).toBe('WORKFLOW_STAGE_QUOTA_EXCEEDED');
    expect(session.snapshots).toHaveLength(20);
  });
});

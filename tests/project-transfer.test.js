import { afterEach, expect, it } from 'vitest';
import express from 'express';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as tar from 'tar';
import { createProjectTransferRouter } from '../modules/project/server/project/projectTransferRouter.js';
import { resetSharedProject } from '../modules/project/server/project/sharedProject.js';
import { createHarnessSessionStore } from '../plugins/storage/agent-files/harnessSessionStore.js';
import { createAgentWorkspaceStore } from '../plugins/storage/agent-files/agentWorkspaceStore.js';
import { createAgentArchiveService } from '../modules/agent/server/harness/archive.js';
import { createSessionService, sessionView, contextMessages } from '../modules/agent/server/harness/session.js';
import { assistantMessage } from '../modules/agent/server/harness/modelAdapter.js';
import { createSqliteProjectServices } from '../plugins/storage/sqlite/projectRepository.js';
import { createProjectFileStore } from '../plugins/storage/sqlite/projectFileStore.js';

const cleanup = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
const graph = () => ({ id: 'source', title: '分享画布', revision: 1, groups: [{ id: 'group', nodeIds: ['image', 'video'] }],
  viewport: { x: 14, y: -20, zoom: 0.8 }, nodes: [
    { id: 'image', type: 'Upload Image', x: 0, y: 0, groupId: 'group', projectId: 'source', resultUrl: '/library/media/source/images/input.png' },
    { id: 'video', type: 'Video', x: 400, y: 20, parentIds: ['image'], sourcePortIndices: [0], groupId: 'group',
      model: 'minimax/minimax-h3', prompt: '测试提示词', resolution: '2K', parameterValues: { duration: 6 },
      status: 'loading', generationAttemptId: 'original-paid-run', localWorkflowOperationId: 'old-job' },
  ] });
async function setup(initial = graph(), options = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-transfer-test-'));
  cleanup.push(() => rm(directory, { recursive: true, force: true }));
  const media = path.join(directory, 'media');
  await mkdir(path.join(media, 'source/images'), { recursive: true });
  await writeFile(path.join(media, 'source/images/input.png'), 'test-image-content');
  const records = new Map([[initial.id, structuredClone(initial)]]);
  const store = { getWorkflowById: async id => structuredClone(records.get(id)),
    listFolders: async () => [], listWorkflows: async () => [...records.values()],
    exportLibraryCatalog: async () => ({ folders: [], workflows: [...records.values()] }),
    runInTransaction: async task => {
      const before = structuredClone(records);
      try { return await task(); }
      catch (error) { records.clear(); for (const [id, value] of before) records.set(id, value); throw error; }
    },
    saveWorkflow: async value => { records.set(value.id, structuredClone(value)); return { id: value.id, revision: 1 }; } };
  const sessions = createHarnessSessionStore({ privateDirectory: path.join(directory, 'private') });
  const workspaces = createAgentWorkspaceStore(path.join(directory, 'private'));
  const agentArchive = createAgentArchiveService({ sessions, workspaces });
  const app = express();
  const services = createSqliteProjectServices(store);
  app.use('/api', createProjectTransferRouter({ store: services.repository,
    directories: services.directories, transactions: services.transactions,
    files: createProjectFileStore(), mediaDirectory: media,
    getAgentArchive: () => options.withoutAgent ? undefined : agentArchive,
    writeSnapshot: options.writeSnapshot || (async () => {}), syncFolderProjectCounts: async () => {} }));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  cleanup.push(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { directory, media, records, sessions, workspaces, agentArchive,
    request: (url, init) => fetch(`http://127.0.0.1:${server.address().port}/api${url}`, init) };
}

async function seedChat({ sessions, workspaces }) {
  const service = createSessionService(sessions);
  await service.ensure('chat', 'source');
  await service.change('chat', record => {
    service.append(record, { kind: 'message', message: { role: 'user', content: '请分析图片', timestamp: Date.now() },
      displayMedia: [{ type: 'image', url: '/library/media/source/images/input.png' }] });
    const entry = service.append(record, { kind: 'message', runId: 'old-run',
      message: assistantMessage({ id: 'test', provider: 'test' }, [{ type: 'text', text: '图片分析' },
        { type: 'toolCall', id: 'call', name: 'canvas', arguments: { action: 'prepareGeneration' } }]) });
    record.branches.alternate = { id: 'alternate', tipId: entry.id, createdAt: record.createdAt };
    record.activeBranch = 'alternate';
    service.append(record, { kind: 'message', message: assistantMessage({ id: 'test', provider: 'test' },
      [{ type: 'text', text: '另一种方案' }]) });
    record.runs['old-run'] = { status: 'running' }; record.lastRunId = 'old-run';
    record.receipts.old = { runId: 'old-run', toolCallId: 'call', action: 'prepareGeneration',
      state: 'settled', result: { ok: true, generationPlanId: 'old-plan' } };
    record.metadata.selectedSkill = 'private-skill';
  });
  await service.ensure('other-chat', 'other-project');
  await workspaces.write('source', 0, { prompt: 'private draft', modelId: 'private-model',
    apiSessionId: 'chat', excludedNodes: [], generationApproval: 'direct' });
}

async function assertRestoredChat(fixture, projectId) {
  const { sessions, workspaces } = fixture;
  const list = await sessions.list(projectId);
  expect(list).toHaveLength(1);
  expect(list[0].id).not.toBe('chat');
  const record = await sessions.get(list[0].id), view = sessionView(record);
  expect(view.transcript.map(entry => entry.content)).toEqual(['请分析图片', '图片分析', '另一种方案']);
  expect(view.transcript[0].media[0].url).toBe(`/library/media/${projectId}/images/input.png`);
  expect(view.transcript[1].tools[0]).toMatchObject({ name: 'canvas', status: 'settled', cards: [] });
  expect(Object.keys(record.branches)).toHaveLength(2);
  const otherBranch = Object.keys(record.branches).find(id => id !== record.activeBranch);
  expect(sessionView({ ...record, activeBranch: otherBranch }).transcript.map(entry => entry.content))
    .toEqual(['请分析图片', '图片分析']);
  expect(record.runs).toEqual({}); expect(record.receipts).toEqual({});
  expect(record.lastRunId).toBeUndefined(); expect(record.metadata.selectedSkill).toBeNull();
  expect(JSON.stringify(contextMessages(record))).not.toContain('toolCall');
  expect((await workspaces.read(projectId)).value).toMatchObject({
    apiSessionId: record.id, generationApproval: 'confirm', prompt: '', modelId: '',
  });
  return record;
}

it('round-trips chat branches, attachments and inert tool history in project and library archives', async () => {
  const fixture = await setup(); await seedChat(fixture);
  const bundle = await fixture.agentArchive.exportProject('source');
  expect(bundle.sessions).toHaveLength(1);
  expect(JSON.stringify(bundle)).not.toMatch(/private-skill|private draft|private-model|old-plan|old-run/);
  for (const format of ['project', 'library']) {
    const route = format === 'project' ? '/workflows/source/backup' : '/library/backup';
    const backup = await fixture.request(route);
    expect(backup.status).toBe(200);
    const restore = await fixture.request(format === 'project' ? '/workflows/restore?copy=true' : '/library/restore',
      { method: 'POST', body: await backup.arrayBuffer() });
    expect(restore.status).toBe(201);
    const result = await restore.json();
    const id = result.id || [...fixture.records.keys()].at(-1);
    const imported = await assertRestoredChat(fixture, id);
    expect((await fixture.sessions.get('chat')).lastRunId).toBe('old-run');
    const again = await fixture.agentArchive.exportProject(id);
    expect(again.sessions[0].entries[1].tools[0].name).toBe('canvas');
    expect(imported.projectId).toBe(id);
  }
});

it('rolls back imported sessions and project if saving the snapshot fails', async () => {
  const fixture = await setup(graph(), { writeSnapshot: async () => { throw new Error('disk full'); } });
  await seedChat(fixture);
  const backup = await fixture.request('/workflows/source/backup');
  const restored = await fixture.request('/workflows/restore?copy=true', { method: 'POST', body: await backup.arrayBuffer() });
  expect(restored.status).toBe(500); expect(fixture.records.size).toBe(1);
  expect((await fixture.sessions.list()).map(item => item.id).sort()).toEqual(['chat', 'other-chat']);
});

it('rejects malformed chat history before creating any project or session', async () => {
  const fixture = await setup(); await seedChat(fixture);
  const { directory, request, records } = fixture;
  const staging = path.join(directory, 'invalid-chat'); await mkdir(staging);
  const history = await fixture.agentArchive.exportProject('source');
  history.sessions[0].entries[0].parentId = 'missing';
  await writeFile(path.join(staging, 'manifest.json'), JSON.stringify({ format: 'nako-project', version: 1, project: { id: 'source' } }));
  await writeFile(path.join(staging, 'workflow.json'), JSON.stringify(graph()));
  await writeFile(path.join(staging, 'agent.json'), JSON.stringify({ projects: [history] }));
  const file = path.join(directory, 'invalid.nako');
  await tar.create({ file, cwd: staging, gzip: true }, ['manifest.json', 'workflow.json', 'agent.json']);
  const result = await request('/workflows/restore?copy=true', { method: 'POST', body: await readFile(file) });
  expect(result.status).toBe(400); expect(records.size).toBe(1);
  expect(await fixture.sessions.list()).toHaveLength(2);
});

it('fails explicitly when importing chat history without the Agent plugin', async () => {
  const source = await setup(); await seedChat(source);
  const target = await setup(graph(), { withoutAgent: true });
  const backup = await source.request('/workflows/source/backup');
  const response = await target.request('/workflows/restore?copy=true', { method: 'POST', body: await backup.arrayBuffer() });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain('启用 Agent');
  expect(target.records.size).toBe(1);
});

it('copies every project session and preserves the active selection without replaying pending tools', async () => {
  const fixture = await setup(); await seedChat(fixture);
  const service = createSessionService(fixture.sessions);
  await service.ensure('second', 'source');
  await service.change('second', record => {
    record.metadata.topic = '第二个会话';
    service.append(record, { kind: 'message', message: assistantMessage({ id: 'test', provider: 'test' },
      [{ type: 'toolCall', id: 'pending', name: 'generation_control', arguments: { action: 'runGeneration' } }]) });
  });
  const response = await fixture.request('/workflows/source/duplicate', { method: 'POST' });
  expect(response.status).toBe(201);
  const { id } = await response.json(), copies = await fixture.sessions.list(id);
  expect(copies).toHaveLength(2);
  const activeId = (await fixture.workspaces.read(id)).value.apiSessionId;
  expect(sessionView(await fixture.sessions.get(activeId)).transcript).toHaveLength(3);
  const second = await fixture.sessions.get(copies.find(item => item.topic === '第二个会话').id);
  expect(sessionView(second).transcript[0].tools[0]).toMatchObject({ status: 'interrupted', cards: [] });
  expect(JSON.stringify(contextMessages(second))).not.toContain('toolCall');
});
it('shares graph, parameters, viewport and media as independent copies without resuming runs', async () => {
  const { media, records, request } = await setup();
  const exported = await request('/workflows/source/backup');
  expect(exported.status).toBe(200);
  expect(exported.headers.get('content-disposition')).toContain('.nako');
  const archive = await exported.arrayBuffer();
  // Remove the source before import to prove sharing works without the sender's project.
  records.clear();
  await rm(path.join(media, 'source'), { recursive: true });
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const response = await request('/workflows/restore?copy=true', { method: 'POST', body: archive });
    expect(response.status).toBe(201);
    const receipt = await response.json();
    expect(receipt.id).not.toBe('source');
    ids.push(receipt.id);
    const doc = records.get(receipt.id);
    expect(doc.groups).toEqual(graph().groups);
    expect(doc.viewport).toEqual(graph().viewport);
    expect(doc.nodes[1]).toMatchObject({ parentIds: ['image'], sourcePortIndices: [0], prompt: '测试提示词',
      resolution: '2K', parameterValues: { duration: 6 }, status: 'idle' });
    expect(doc.nodes[1].generationAttemptId).toBeUndefined();
    expect(doc.nodes[1].localWorkflowOperationId).toBeUndefined();
    expect(doc.nodes[0].projectId).toBe(receipt.id);
    expect(doc.nodes[0].resultUrl).toBe(`/library/media/${receipt.id}/images/input.png`);
    expect(await readFile(path.join(media, receipt.id, 'images/input.png'), 'utf8')).toBe('test-image-content');
  }
  expect(new Set(ids).size).toBe(2);
});
it('previews a shared archive without creating a stored project or copying media', async () => {
  const { media, records, request } = await setup();
  const exported = await request('/workflows/source/backup');
  const archive = await exported.arrayBuffer();
  const response = await request('/workflows/preview', { method: 'POST', body: archive });
  expect(response.status).toBe(200);
  const preview = await response.json();
  expect(preview.workflow).toMatchObject({ id: 'source', title: '分享画布', nodes: expect.any(Array) });
  expect(preview.workflow.nodes[0].resultUrl).toMatch(/^\/api\/workflows\/previews\/.+\/media\/images\/input\.png$/);
  const asset = await request(preview.workflow.nodes[0].resultUrl.replace('/api', ''));
  expect(asset.status).toBe(200);
  expect(await asset.text()).toBe('test-image-content');
  expect(records.size).toBe(1);
  expect(await readFile(path.join(media, 'source/images/input.png'), 'utf8')).toBe('test-image-content');
});
it('rejects invalid archives without creating projects', async () => {
  const { request, records } = await setup();
  const response = await request('/workflows/restore?copy=true', { method: 'POST', body: 'not an archive' });
  expect(response.status).toBe(400);
  expect(records.size).toBe(1);
});
it('rejects unsafe project ids before using them as media paths', async () => {
  const { directory, request, records } = await setup();
  const staging = path.join(directory, 'staging');
  await mkdir(staging);
  await writeFile(path.join(staging, 'manifest.json'), JSON.stringify({ format: 'nako-project', version: 1, project: { id: '../outside' } }));
  await writeFile(path.join(staging, 'workflow.json'), JSON.stringify({ ...graph(), id: '../outside' }));
  const file = path.join(directory, 'unsafe.nako');
  await tar.create({ file, cwd: staging, gzip: true }, ['manifest.json', 'workflow.json']);
  const response = await request('/workflows/restore?copy=true', { method: 'POST', body: await readFile(file) });
  expect(response.status).toBe(400);
  expect(records.size).toBe(1);
});
it('validates graph shape and resets runtime state without changing the source', () => {
  const source = graph();
  source.nodes[1].executionState = { status: 'running', taskId: 'old-task' };
  const copy = resetSharedProject(source, 'new-project');
  expect(copy.nodes[1].executionState).toEqual({ status: 'idle' });
  expect(source.nodes[1].generationAttemptId).toBe('original-paid-run');
  expect(() => resetSharedProject({ ...source, nodes: [source.nodes[0], source.nodes[0]] }, 'new')).toThrow();
  expect(() => resetSharedProject({ ...source, viewport: { zoom: 0 } }, 'new')).toThrow();
});

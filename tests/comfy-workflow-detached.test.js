import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createComfyWorkflowRouter } from '../modules/local-runtime/server/comfyui/comfyWorkflowRouter.js';

const servers = [];
const directories = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve))));
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

async function setup(directory, comfyClient) {
  const app = express();
  app.use(express.json());
  app.use('/api', createComfyWorkflowRouter({
    libraryDirectory: directory,
    workflowRegistry: { 'minimax-h3-t2va': { title: 'MiniMax H3', handler: async () => ({}) } },
    comfyClient,
    downloadResult: async () => ({ buffer: Buffer.from('video'), contentType: 'video/mp4' }),
    logger: { error: vi.fn() },
  }));
  const server = createServer(app);
  servers.push(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}/api/comfy/minimax-h3-t2va`;
}

async function receipt(url) {
  const response = await fetch(`${url}/operations/op-1?projectId=project-1`);
  return response.json();
}

describe('detached ComfyUI workflow', () => {
  it('finishes after submission and recovers the same receipt without running twice', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-comfy-test-'));
    directories.push(directory);
    let finish;
    const queuePrompt = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const comfyClient = { serverUrl: '127.0.0.1:8188', queuePrompt };
    const url = await setup(directory, comfyClient);
    const input = { projectId: 'project-1', nodeId: 'node-1', operationId: 'op-1', text: 'A scene' };
    const submit = body => fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });

    expect((await (await submit(input)).json()).status).toBe('running');
    expect((await (await submit(input)).json()).status).toBe('running');
    expect(queuePrompt).toHaveBeenCalledTimes(1);
    expect((await receipt(url)).status).toBe('running');
    const conflict = await submit({ ...input, text: 'A different scene' });
    expect(conflict.status).toBe(409);
    finish('http://127.0.0.1:8188/view/result');

    await vi.waitFor(async () => expect((await receipt(url)).status).toBe('success'));
    const saved = await receipt(url);
    expect(saved.url).toMatch(/\/library\/media\/project-1\/videos\//);

    const reopened = await setup(directory, comfyClient);
    expect((await receipt(reopened)).url).toBe(saved.url);
    expect((await (await fetch(reopened, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    })).json()).url).toBe(saved.url);
    expect(queuePrompt).toHaveBeenCalledTimes(1);
  });

  it('does not resubmit a task whose process stopped before recording a result', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nako-comfy-test-'));
    directories.push(directory);
    const comfyClient = { serverUrl: '127.0.0.1:8188', queuePrompt: vi.fn(() => new Promise(() => {})) };
    const url = await setup(directory, comfyClient);
    const input = { projectId: 'project-1', operationId: 'op-1', text: 'A scene' };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const reopened = await setup(directory, comfyClient);
    expect((await receipt(reopened)).status).toBe('unknown');
    const retry = await fetch(reopened, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    expect(retry.status).toBe(409);
    expect(comfyClient.queuePrompt).toHaveBeenCalledTimes(1);
  });
});

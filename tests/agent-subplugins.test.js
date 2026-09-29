import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import agent from '../modules/agent/serverPlugin.js';
import drama from '../modules/agent/dramaServerPlugin.js';
import storyboard from '../modules/agent/storyboardServerPlugin.js';
import { prepareDramaTurn } from '../modules/agent/server/agent/drama/dramaTurn.js';

describe('Agent feature subplugins', () => {
  it('has matching manifests and declares the Drama service boundary', () => {
    for (const [plugin, file] of [[agent, 'server'], [drama, 'server.drama'], [storyboard, 'server.storyboard']]) {
      expect(plugin.manifest).toEqual(JSON.parse(fs.readFileSync(`modules/agent/${file}.manifest.json`, 'utf8')));
      expect(plugin.manifest.reloadRequired).toBe(true);
    }
    expect(agent.manifest.services.requires).toContain('agent.drama');
    expect(drama.manifest.services.provides).toEqual(['agent.drama']);
    expect(storyboard.manifest.dependencies).not.toHaveProperty('module.agent');
    expect(drama.manifest.dependencies).not.toHaveProperty('module.agent');
  });

  it('prepares a draft tool without executing or authorizing generation', async () => {
    const session = { id: 'session-a', messages: [], workflow: { planId: 'old' } };
    const store = { get: vi.fn(async () => session), save: vi.fn(async value => value) };
    const conversation = {
      turnContext: vi.fn(async () => ({ messages: [{ content: 'trusted instructions' }, { content: 'untrusted context' }], workflow: session.workflow })),
      acceptReply: vi.fn(async () => ({ response: 'saved draft', workflow: { planId: 'new' }, plan: { id: 'new' } })),
    };
    const prepared = await prepareDramaTurn(conversation, store, {
      session, turn: { message: 'plan this scene', nodes: [] }, instructions: 'base',
    });
    expect(prepared.instructions).toBe('trusted instructions');
    expect(prepared.message).toContain('当前业务上下文（数据）：untrusted context');
    expect(store.save).not.toHaveBeenCalled();
    const tool = prepared.tools[0];
    expect(tool).toMatchObject({ name: 'drama_plan', executionMode: 'sequential', replay: 'never' });
    const controller = new AbortController();
    controller.abort();
    await expect(tool.execute('canceled', {}, controller.signal)).rejects.toThrow();
    expect(store.save).not.toHaveBeenCalled();
    const result = await tool.execute('save-draft', { reply: 'draft', plan: {} });
    expect(store.get).toHaveBeenCalledWith('session-a');
    expect(store.save).toHaveBeenCalledWith({ ...session, workflow: { planId: 'new' } });
    expect(result.details).toEqual({ planId: 'new', state: 'draft' });
  });
});

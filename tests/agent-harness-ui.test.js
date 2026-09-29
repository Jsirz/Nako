// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { createCanvasAgentChat } from '../modules/agent/ui/agent/canvasAgentChat.ts';
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import {
  AgentTimelineActivity,
  AgentUnlinkedActivity,
  timelineActivities,
} from '../modules/agent/ui/agent/AgentTimelineActivity';
import { agentActivity } from '../modules/contracts/agentActivity.js';

it('keeps live generation cards between assistant turns before and after snapshot restoration', async () => {
  const tool = {
    id: 'g1',
    name: 'generation_control',
    action: 'prepareGeneration',
    status: 'settled',
    cards: [{ kind: 'generation', id: 'batch-1' }],
  };
  let live;
  const saved = snapshot({
    messages: [
      { id: 'u1', role: 'user', content: '生成要求1' },
      { id: 'a1', role: 'assistant', content: '准备第一批', tools: [tool] },
      { id: 'a2', role: 'assistant', content: '后续对话' },
    ],
    knownCards: tool.cards,
  });
  const client = {
    listSessions: async () => [],
    getSession: async () => saved,
    streamMessage: async (_input, _token, { onEvent }) => {
      onEvent({ type: 'message_start', payload: { role: 'assistant' } });
      onEvent({
        type: 'message_end',
        payload: { role: 'assistant', entryId: 'a1', content: '准备第一批' },
      });
      onEvent({
        type: 'tool_start',
        payload: { toolCallId: 'g1', toolName: 'generation_control', action: 'prepareGeneration' },
      });
      onEvent({
        type: 'tool_end',
        payload: {
          toolCallId: 'g1',
          toolName: 'generation_control',
          receipt: { ok: true, generationPlanId: 'batch-1' },
        },
      });
      onEvent({ type: 'message_start', payload: { role: 'assistant' } });
      onEvent({
        type: 'message_end',
        payload: { role: 'assistant', entryId: 'a2', content: '后续对话' },
      });
      live = chat.getSnapshot();
      return { response: '后续对话' };
    },
  };
  const chat = createCanvasAgentChat(client);
  chat.activate();
  try {
    await chat.sendMessage('生成要求1', [], 'model');
    expect(live.messages.find((m) => m.id === 'a1').tools).toEqual([tool]);
    expect(live.messages.find((m) => m.id === 'a2').tools).toBeUndefined();
    expect(chat.getSnapshot().messages.find((m) => m.id === 'a1').tools).toEqual([tool]);
  } finally {
    chat.deactivate();
  }
});

it('renders alternating messages and cards, updates confirmations in place, and hides cards from another branch', async () => {
  let batches = ['batch-1', 'batch-2', 'other-branch'].map((id) => ({
    id,
    sessionId: 's1',
    state: 'pending',
    expiresAt: Date.now() + 60000,
    items: [
      {
        nodeId: id,
        title: id,
        model: 'mock model',
        count: 1,
        state: 'pending',
        parameters: '',
        references: [],
      },
    ],
  }));
  const listeners = new Set();
  const creation = {
    getSnapshot: () => batches,
    getError: () => '',
    subscribe: (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    approve: vi.fn(async (id) => {
      batches = batches.map((b) =>
        b.id === id
          ? { ...b, state: 'finished', items: b.items.map((i) => ({ ...i, state: 'success' })) }
          : b,
      );
      listeners.forEach((f) => f());
    }),
    cancel: vi.fn(),
  };
  const activity = (id) =>
    agentActivity({
      id,
      name: 'generation_control',
      action: 'prepareGeneration',
      status: 'settled',
      result: { ok: true, generationPlanId: id },
    });
  const controllers = { sessionId: 's1', creation };
  const messages = timelineActivities([
    { id: 'a1', content: '生成要求1', tools: [activity('batch-1')] },
    { id: 'a2', content: '对话1' },
    { id: 'a3', content: '生成要求2', tools: [activity('batch-2')] },
    { id: 'a4', content: '对话2', tools: [activity('batch-1')] },
    { id: 'a5', content: '对话3' },
  ]);
  const knownCards = batches.map((b) => ({ kind: 'generation', id: b.id }));
  const view = render(
    React.createElement(
      'div',
      {},
      React.createElement(AgentUnlinkedActivity, { controllers, knownCards }),
      ...messages.map((m) =>
        React.createElement(
          'div',
          { key: m.id, 'data-message': m.id },
          React.createElement('p', { 'data-text': true }, m.content),
          React.createElement(AgentTimelineActivity, { tools: m.tools, controllers }),
        ),
      ),
    ),
  );
  try {
    const order = () =>
      [...view.container.querySelectorAll('[data-text],[data-agent-card-id]')].map(
        (e) => e.getAttribute('data-agent-card-id') || e.textContent,
      );
    expect(order()).toEqual([
      '生成要求1',
      'batch-1',
      '对话1',
      '生成要求2',
      'batch-2',
      '对话2',
      '对话3',
    ]);
    await act(async () => fireEvent.click(view.getAllByText('确认本批生成与费用')[0]));
    expect(creation.approve).toHaveBeenCalledWith('batch-1');
    expect(view.getAllByText('确认本批生成与费用')).toHaveLength(1);
    expect(order()).toEqual([
      '生成要求1',
      'batch-1',
      '对话1',
      '生成要求2',
      'batch-2',
      '对话2',
      '对话3',
    ]);
    expect(view.container.querySelector('[data-agent-unlinked-activity]')).toBeNull();
    expect(view.container.textContent).not.toContain('other-branch');
    expect(
      [...view.container.querySelectorAll('[data-agent-timeline-activity] details')].every(
        (e) => !e.open,
      ),
    ).toBe(true);
  } finally {
    cleanup();
  }
});
const snapshot = (extra = {}) => ({
  version: 2,
  id: 's1',
  topic: '测试',
  revision: 12,
  activeBranch: 'main',
  branches: [{ id: 'main', tipId: 'a2' }],
  createdAt: new Date().toISOString(),
  run: { id: 'r1', status: 'completed' },
  receipts: [{ id: 'receipt1', tool: 'canvas_control', state: 'settled' }],
  messages: [
    { id: 'u1', role: 'user', content: '读取画布' },
    { id: 'a1', role: 'assistant', content: '先读取' },
    { id: 'a2', role: 'assistant', content: '已读取', branchable: true },
  ],
  ...extra,
});
it('renders separate assistant messages per turn and restores durable entry ids and tool receipts', async () => {
  let observed;
  const client = {
    stopProject: vi.fn(async () => {}),
    listSessions: vi.fn(async () => []),
    getSession: vi.fn(async () => snapshot()),
    streamMessage: vi.fn(async (input, onToken, options) => {
      const event = (type, payload) =>
        options.onEvent({
          protocol: 2,
          type,
          sessionId: input.sessionId,
          runId: 'r1',
          sequence: 1,
          payload,
        });
      event('message_start', { role: 'assistant' });
      onToken('先读取');
      event('message_end', { role: 'assistant', entryId: 'a1', content: '先读取' });
      event('tool_start', { toolCallId: 'c1', toolName: 'canvas_control' });
      event('tool_end', { toolCallId: 'c1', toolName: 'canvas_control', isError: false });
      event('message_start', { role: 'assistant' });
      onToken('已读取');
      event('message_end', { role: 'assistant', entryId: 'a2', content: '已读取' });
      observed = chat.getSnapshot();
      event('run_end', { status: 'completed' });
      return { response: '已读取', messageCount: 3 };
    }),
  };
  const chat = createCanvasAgentChat(client, () => crypto.randomUUID(), undefined, {
    projectId: 'p1',
    execute: vi.fn(),
  });
  chat.activate();
  try {
    await chat.sendMessage('读取画布', undefined, 'configured-model');
    expect(observed.messages.filter((m) => m.role === 'assistant').map((m) => m.content)).toEqual([
      '先读取',
      '已读取',
    ]);
    expect(observed.tools[0].status).toBe('settled');
    expect(chat.getSnapshot()).toMatchObject({
      revision: 12,
      branch: 'main',
      isLoading: false,
      runStatus: 'completed',
    });
    expect(chat.getSnapshot().messages.map((m) => m.id)).toEqual(['u1', 'a1', 'a2']);
    chat.startNewChat();
    expect(chat.getSnapshot()).toMatchObject({ messages: [], tools: [], branches: [] });
    expect(chat.getSnapshot().revision).toBeUndefined();
  } finally {
    chat.deactivate();
  }
});
it('branches and compacts with the displayed revision instead of replaying a turn', async () => {
  const client = {
    stopProject: vi.fn(async () => {}),
    getSession: vi.fn(async () => snapshot()),
    branch: vi.fn(async () => snapshot({ activeBranch: 'fork', revision: 13, messages: [] })),
    compact: vi.fn(async () => snapshot({ revision: 14 })),
    listSessions: vi.fn(async () => []),
    streamMessage: vi.fn(),
  };
  const chat = createCanvasAgentChat(client, undefined, undefined, {
    projectId: 'p1',
    execute: vi.fn(),
  });
  chat.activate();
  try {
    await chat.loadSession('s1');
    await chat.branch('a2');
    expect(client.branch).toHaveBeenCalledWith('s1', 'p1', 12, 'a2', expect.anything());
    await chat.compact('model');
    expect(client.compact).toHaveBeenCalledWith('s1', 'p1', 'model', 13, expect.anything());
    expect(client.streamMessage).not.toHaveBeenCalled();
  } finally {
    chat.deactivate();
  }
});

it('retains a tool-only message and its card if the stream and subsequent snapshot read fail', async () => {
  const client = {
    listSessions: async () => [],
    getSession: async () => {
      throw Error('offline');
    },
    streamMessage: async (_input, _token, { onEvent }) => {
      onEvent({ type: 'message_start', payload: { role: 'assistant' } });
      onEvent({
        type: 'message_end',
        payload: { role: 'assistant', entryId: 'tool-only', content: '' },
      });
      onEvent({
        type: 'tool_start',
        payload: { toolCallId: 'g1', toolName: 'generation_control', action: 'prepareGeneration' },
      });
      onEvent({
        type: 'tool_end',
        payload: {
          toolCallId: 'g1',
          toolName: 'generation_control',
          receipt: { ok: true, generationPlanId: 'batch-1' },
        },
      });
      throw Error('stream interrupted');
    },
  };
  const chat = createCanvasAgentChat(client);
  chat.activate();
  try {
    await chat.sendMessage('生成', [], 'model');
    expect(chat.getSnapshot().messages.find((m) => m.id === 'tool-only')?.tools[0].cards).toEqual([
      { kind: 'generation', id: 'batch-1' },
    ]);
  } finally {
    chat.deactivate();
  }
});

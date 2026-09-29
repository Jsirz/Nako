// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';
import { createCanvasAgentChat } from '../modules/agent/ui/agent/canvasAgentChat.ts';

function fixture() {
  let status = 'running',
    streamSignal;
  const client = {
    stop: vi.fn(async () => {
      status = 'aborted';
    }),
    stopProject: vi.fn(async () => {
      status = 'aborted';
    }),
    resumeOperations: vi.fn(async () => []),
    getSession: vi.fn(async () => ({
      id: 's1',
      topic: 'test',
      revision: 2,
      activeBranch: 'main',
      branches: [],
      createdAt: new Date().toISOString(),
      run: { id: 'r1', status },
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: status === 'completed' ? 'saved answer' : 'working',
        },
      ],
    })),
    listSessions: vi.fn(async () => []),
    streamMessage: vi.fn(
      (_input, _token, { signal }) =>
        new Promise((_, reject) => {
          streamSignal = signal;
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Detached', 'AbortError')),
            { once: true },
          );
        }),
    ),
  };
  const chat = createCanvasAgentChat(client, () => 's1', undefined, {
    projectId: 'p1',
    execute: vi.fn(),
  });
  chat.activate();
  return {
    client,
    chat,
    complete: () => {
      status = 'completed';
    },
    signal: () => streamSignal,
  };
}

it('detaches on panel close and syncs running/completed snapshots on reopen without resubmitting', async () => {
  vi.useFakeTimers();
  const f = fixture();
  try {
    const sent = f.chat.sendMessage('hello', [], 'model');
    f.chat.setConversationEnabled(false);
    expect(f.signal().aborted).toBe(true);
    expect(await sent).toBe(false);
    expect(f.client.stop).not.toHaveBeenCalled();
    expect(f.client.stopProject).not.toHaveBeenCalled();
    f.chat.setConversationEnabled(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.chat.getSnapshot()).toMatchObject({
      isStreaming: true,
      isLoading: true,
      runStatus: 'running',
    });
    expect(await f.chat.sendMessage('duplicate', [], 'model')).toBe(false);
    f.complete();
    await vi.advanceTimersByTimeAsync(800);
    expect(f.chat.getSnapshot()).toMatchObject({
      isStreaming: false,
      isLoading: false,
      runStatus: 'completed',
    });
    expect(f.chat.getSnapshot().messages.at(-1).content).toBe('saved answer');
    expect(f.client.streamMessage).toHaveBeenCalledOnce();
    f.chat.setConversationEnabled(false);
    const reads = f.client.getSession.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(f.client.getSession).toHaveBeenCalledTimes(reads);
    f.chat.deactivate();
    expect(f.client.stopProject).toHaveBeenCalledWith('p1');
  } finally {
    f.chat.deactivate();
    vi.useRealTimers();
  }
});

it('allows explicit stop after restoring an in-flight session and cancels further polling', async () => {
  vi.useFakeTimers();
  const f = fixture();
  try {
    await f.chat.loadSession('s1');
    await vi.advanceTimersByTimeAsync(1);
    expect(f.chat.getSnapshot().isStreaming).toBe(true);
    f.chat.stop();
    expect(f.client.stop).toHaveBeenCalledWith('s1');
    expect(f.chat.getSnapshot().runStatus).toBe('aborted');
    const reads = f.client.getSession.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(f.client.getSession).toHaveBeenCalledTimes(reads);
  } finally {
    f.chat.deactivate();
    vi.useRealTimers();
  }
});

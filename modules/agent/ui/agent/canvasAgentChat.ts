import { browserServices } from '../../../kernel/browser';
import {
  agentActivity,
  type AgentActivity,
  type AgentCardReference,
} from '../../../contracts/agentActivity.js';
import type { AgentEvent } from '../../../contracts/agentProtocol.js';
import type * as React from 'react';
import { createAgentTextBuffer } from './agentTextBuffer';
import { createAgentRunSync } from './agentRunSync';
import type { AgentConversation } from './agentConversation';
import type { CanvasActionHandler } from '../../../contracts/canvasControlProtocol.js';
import type { CanvasActionLog } from '../../../contracts/canvasControlProtocol.js';
import {
  AgentClientError,
  createAgentClient,
  type AgentClient,
  type AgentSession,
  type AgentMessageInput,
  type AgentNode,
} from './agentClient';
type Media = NonNullable<AgentMessageInput['media']>;
export interface ChatMessage {
  tools?: AgentActivity[];
  id: string;
  role: string;
  content: string;
  media?: Media;
  timestamp: Date;
  actions?: CanvasActionLog[];
  stopped?: boolean;
  branchable?: boolean;
}
interface ChatState {
  knownCards?: AgentCardReference[];
  runStatus?: string;
  tools?: Array<{ id: string; name: string; status: string }>;
  revision?: number;
  branch?: string;
  branches?: Array<{ id: string; tipId: string | null }>;
  messages: ChatMessage[];
  topic: string | null;
  sessionId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sessions: Array<Record<string, unknown>>;
  isLoadingSessions: boolean;
}
function messageError(error: unknown) {
  if (
    error instanceof AgentClientError &&
    error.status > 0 &&
    !['AGENT_STREAM_INCOMPLETE', 'AGENT_STREAM_INVALID', 'AGENT_STREAM_UNAVAILABLE'].includes(
      error.code,
    )
  )
    return error.message;
  return '连接中断，回答状态未确认。请先在对话历史中核对。';
}
export function createCanvasAgentChat(
  client: AgentClient,
  createId: () => string = () => crypto.randomUUID(),
  conversation?: AgentConversation,
  canvas?: { projectId: string; execute: CanvasActionHandler },
) {
  let state: ChatState = {
    messages: [],
    topic: null,
    sessionId: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    sessions: [],
    isLoadingSessions: false,
  };
  let active = false,
    turnEpoch = 0,
    listEpoch = 0;
  let turnRequest: AbortController | undefined, listRequest: AbortController | undefined;
  let turnBuffer: ReturnType<typeof createAgentTextBuffer> | undefined;
  let loadingSessionId: string | null = null;
  const deletions = new Map<string, AbortController>(),
    listeners = new Set<() => void>();
  let unbindConversation: (() => void) | undefined;
  let conversationEnabled = true;
  const bindingOperations = {
    ensureSession: () => {
      const id = state.sessionId || createId();
      if (id !== state.sessionId) update({ sessionId: id });
      return id;
    },
    setMessages: (messages: ChatMessage[]) => update({ messages }),
    setTopic: (topic: string) => update({ topic }),
    setError: (error: string | null) => update({ error }),
    setLoading: (isLoading: boolean) => update({ isLoading }),
  };
  const bindConversation = () => {
    unbindConversation?.();
    unbindConversation = conversationEnabled
      ? conversation?.bind({
          ...bindingOperations,
          sessionId: state.sessionId,
          isLoading: state.isLoading,
        })
      : undefined;
  };
  const update = (patch: Partial<ChatState>) => {
    if (!active) return;
    const previous = state;
    state = { ...state, ...patch };
    if (previous.sessionId !== state.sessionId || previous.isLoading !== state.isLoading)
      bindConversation();
    listeners.forEach((listener) => listener());
  };
  const owns = (epoch: number) => active && turnEpoch === epoch;
  const sync = createAgentRunSync({
    client, canvas,
    apply: session => {
      if (!active || !conversationEnabled || state.sessionId !== session.id) return;
      applySnapshot(session);
      update({ isLoading: session.run?.status === 'running', isStreaming: session.run?.status === 'running', error: null });
    },
    failed: error => update({ error: messageError(error), ...(error instanceof AgentClientError && error.status === 404 ? { isLoading: false, isStreaming: false } : {}) }),
    settled: id => { void conversation?.onTurnSettled(id, canvas?.projectId).catch(() => {}); },
  });
  const invalidate = () => {
    sync.cancel();
    turnBuffer?.cancel();
    turnBuffer = undefined;
    turnEpoch++;
    turnRequest?.abort();
    turnRequest = undefined;
    loadingSessionId = null;
  };
  const refreshSessions = async () => {
    if (!active) return;
    const epoch = ++listEpoch;
    listRequest?.abort();
    const controller = new AbortController();
    listRequest = controller;
    update({ isLoadingSessions: true });
    try {
      const sessions = await client.listSessions({ signal: controller.signal }, canvas?.projectId);
      if (!Array.isArray(sessions)) throw Error('对话历史格式无效');
      if (active && epoch === listEpoch) update({ sessions });
    } catch (error) {
      if (active && epoch === listEpoch && !controller.signal.aborted)
        update({ error: error instanceof Error ? error.message : '读取对话历史失败' });
    } finally {
      if (active && epoch === listEpoch) {
        listRequest = undefined;
        update({ isLoadingSessions: false });
      }
    }
  };
  const startNewChat = () => {
    if (!active) return;
    invalidate();
    update({
      messages: [],
      topic: null,
      sessionId: createId(),
      error: null,
      isLoading: false,
      isStreaming: false,
      tools: [],
      runStatus: undefined,
      revision: undefined,
      branch: undefined,
      branches: [],
      knownCards: [],
    });
  };
  const applySnapshot = (session: AgentSession) =>
    update({
      sessionId: session.id,
      topic: session.topic,
      revision: session.revision,
      branch: session.activeBranch,
      branches: session.branches,
      runStatus: session.run?.status,
      knownCards: session.knownCards || [],
      tools: session.receipts?.map((receipt) => ({
        id: receipt.id,
        name: receipt.tool,
        status: receipt.state,
      })),
      messages: session.messages.map((message, index) => ({
        ...message,
        id: message.id || 'loaded-' + session.id + '-' + index,
        timestamp: new Date(message.timestamp || session.createdAt),
      })),
    });
  const changeHistory = async (
    operation: 'branch' | 'switch' | 'compact',
    value: string | null,
  ) => {
    const id = state.sessionId,
      project = canvas?.projectId || conversation?.requestContext().projectId;
    if (!active || state.isLoading || !id || !project) return false;
    invalidate();
    const epoch = turnEpoch,
      controller = new AbortController();
    turnRequest = controller;
    update({
      isLoading: true,
      isStreaming: operation === 'compact',
      error: null,
      ...(operation === 'compact' ? { runStatus: 'compacting' } : {}),
    });
    try {
      const revision =
        state.revision ?? (await client.getSession(id, { signal: controller.signal })).revision;
      const result =
        operation === 'compact'
          ? await client.compact(id, project, value!, revision, { signal: controller.signal })
          : operation === 'switch'
            ? await client.switchBranch(id, project, revision, value!, {
                signal: controller.signal,
              })
            : await client.branch(id, project, revision, value, { signal: controller.signal });
      if (!owns(epoch)) return false;
      applySnapshot(result);
      return true;
    } catch (error) {
      if (owns(epoch)) update({ error: messageError(error) });
      return false;
    } finally {
      if (owns(epoch)) {
        turnRequest = undefined;
        update({ isLoading: false, isStreaming: false });
      }
    }
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    setConversationEnabled(enabled: boolean) {
      if (conversationEnabled === enabled) return;
      conversationEnabled = enabled;
      if (!enabled) {
        // Stop late API/drama writes when another backend owns the visible chat.
        // Keep its saved messages and selection for an explicit switch back.
        invalidate();
        update({ isLoading: false, isStreaming: false });
      } else if (active && state.sessionId) {
        update({ isLoading: true });
        sync.start(state.sessionId);
      }
      if (active) bindConversation();
    },
    activate() {
      active = true;
      bindConversation();
    },
    deactivate() {
      if (canvas?.projectId) void client.stopProject(canvas.projectId).catch(() => {});
      active = false;
      unbindConversation?.();
      unbindConversation = undefined;
      invalidate();
      listEpoch++;
      listRequest?.abort();
      listRequest = undefined;
      deletions.forEach((controller) => controller.abort());
      deletions.clear();
      state = { ...state, isLoading: false, isStreaming: false, isLoadingSessions: false };
    },
    leaveProject() {
      if (canvas?.projectId) void client.stopProject(canvas.projectId).catch(() => {});
    },
    refreshSessions,
    startNewChat,
    branch: (entryId: string | null) => changeHistory('branch', entryId),
    switchBranch: (branchId: string) => changeHistory('switch', branchId),
    compact: (model: string) => changeHistory('compact', model),
    stop() {
      if (!active || !state.isStreaming) return;
      if (state.sessionId) void client.stop(state.sessionId).catch(() => {});
      turnBuffer?.flush();
      invalidate();
      update({
        isLoading: false,
        isStreaming: false,
        error: null,
        runStatus: 'aborted',
        messages: state.messages.map((item, index) =>
          index === state.messages.length - 1 && item.role === 'assistant'
            ? { ...item, stopped: true }
            : item,
        ),
      });
    },
    async loadSession(id: string) {
      if (!active || !id || deletions.has(id)) return false;
      invalidate();
      const epoch = turnEpoch,
        controller = new AbortController();
      turnRequest = controller;
      loadingSessionId = id;
      update({ isLoading: true, isStreaming: false, error: null });
      try {
        const session = await client.getSession(id, { signal: controller.signal });
        if (!Array.isArray(session.messages)) throw Error('对话内容格式无效');
        if (!owns(epoch)) return false;
        applySnapshot(session);
        if (conversationEnabled && session.run?.status === 'running') sync.start(id);
        return true;
      } catch (error) {
        if (owns(epoch)) update({ error: error instanceof Error ? error.message : '读取对话失败' });
        return false;
      } finally {
        if (owns(epoch)) {
          turnRequest = undefined;
          loadingSessionId = null;
          update({ isLoading: state.runStatus === 'running', isStreaming: state.runStatus === 'running' });
        }
      }
    },
    async deleteSession(id: string) {
      if (!active || !id || deletions.has(id)) return false;
      if (state.isLoading) {
        update({ error: '请等待当前对话操作完成后再删除。' });
        return false;
      }
      const controller = new AbortController();
      deletions.set(id, controller);
      const epoch = turnEpoch,
        wasCurrent = state.sessionId === id;
      if (wasCurrent) update({ isLoading: true });
      try {
        const receipt = await client.deleteSession(id, { signal: controller.signal });
        if (receipt.success !== true) throw Error('删除对话未得到确认');
        if (!active || controller.signal.aborted) return false;
        if (state.sessionId === id) {
          // A different history load may still be running, or may already have
          // failed. A confirmed deletion must never leave the removed ID active.
          if (loadingSessionId !== null && loadingSessionId !== id)
            update({ sessionId: null, messages: [], topic: null });
          else startNewChat();
        }
        update({ sessions: state.sessions.filter((session) => session.id !== id) });
        void refreshSessions();
        return true;
      } catch (error) {
        if (active && !controller.signal.aborted)
          update({ error: error instanceof Error ? error.message : '删除对话失败' });
        return false;
      } finally {
        if (deletions.get(id) === controller) deletions.delete(id);
        if (owns(epoch) && state.sessionId === id) update({ isLoading: false });
      }
    },
    async sendMessage(
      message: string,
      media?: Media,
      model?: string,
      modelParams?: Record<string, unknown>,
      nodes?: AgentNode[],
    ) {
      if (
        !active ||
        !conversationEnabled ||
        state.isLoading ||
        (state.sessionId !== null && deletions.has(state.sessionId)) ||
        (!message.trim() && !media?.length) ||
        !model
      )
        return false;
      invalidate();
      const epoch = turnEpoch,
        controller = new AbortController();
      turnRequest = controller;
      const sessionId = state.sessionId || createId();
      let assistantId = createId(),
        assistantStarted = false;
      const context = conversation?.requestContext();
      const user: ChatMessage = {
        id: createId(),
        role: 'user',
        content: message,
        media: media?.map((item) => ({ type: item.type, url: item.url })),
        timestamp: new Date(),
      };
      update({
        sessionId,
        tools: [],
        runStatus: 'running',
        isLoading: true,
        isStreaming: true,
        error: null,
        messages: [
          ...state.messages,
          user,
          { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
        ],
      });
      const replaceAnswer = (content: string) =>
        update({
          messages: state.messages.map((item) =>
            item.id === assistantId ? { ...item, content } : item,
          ),
        });
      let buffer = createAgentTextBuffer((content) => {
        if (owns(epoch)) replaceAnswer(content);
      });
      turnBuffer = buffer;
      try {
        const result = await client.streamMessage(
          {
            ...context,
            ...(canvas ? { projectId: canvas.projectId, canvasControl: true } : {}),
            sessionId,
            message,
            model,
            modelParams,
            nodes: nodes?.map((node) => ({
              id: node.id,
              type: node.type,
              title: node.title,
              prompt: node.prompt,
              textContent: node.textContent,
              model: node.model,
              imageModel: node.imageModel,
              videoModel: node.videoModel,
              audioModel: node.audioModel,
              comfyMode: node.comfyMode,
            })),
            media: media?.map((item) => ({
              type: item.type,
              url: item.url,
            })),
          },
          (token) => {
            if (owns(epoch)) buffer.push(token);
          },
          {
            signal: controller.signal,
            onEvent: (event: AgentEvent) => {
              if (!owns(epoch)) return;
              if (event.type === 'message_start' && event.payload.role === 'assistant') {
                if (assistantStarted) {
                  buffer.cancel();
                  assistantId = createId();
                  update({
                    messages: [
                      ...state.messages,
                      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
                    ],
                  });
                  buffer = createAgentTextBuffer((content) => {
                    if (owns(epoch)) replaceAnswer(content);
                  });
                  turnBuffer = buffer;
                }
                assistantStarted = true;
              }
              if (event.type === 'message_end' && event.payload.role === 'assistant') {
                buffer.cancel();
                update({
                  messages: state.messages.map((item) =>
                    item.id === assistantId
                      ? {
                          ...item,
                          id: String(event.payload.entryId),
                          content: String(event.payload.content),
                        }
                      : item,
                  ),
                });
                assistantId = String(event.payload.entryId);
              }
              if (event.type === 'run_end') update({ runStatus: String(event.payload.status) });
              if (event.type === 'compaction_start') update({ runStatus: 'compacting' });
              if (event.type === 'compaction_end') update({ runStatus: 'running' });
              if (event.type === 'authorization_required')
                update({ runStatus: 'awaiting-authorization' });
              if (event.type === 'tool_start') {
                const tool = agentActivity({
                  id: String(event.payload.toolCallId),
                  name: String(event.payload.toolName),
                  action:
                    typeof event.payload.action === 'string' ? event.payload.action : undefined,
                  status: 'running',
                });
                update({
                  messages: state.messages.map((message) =>
                    message.id === assistantId
                      ? { ...message, tools: [...(message.tools || []), tool] }
                      : message,
                  ),
                  tools: [
                    ...(state.tools || []),
                    {
                      id: String(event.payload.toolCallId),
                      name: String(event.payload.toolName),
                      status: 'running',
                    },
                  ],
                });
              }
              if (event.type === 'tool_end') {
                const previous = state.messages
                  .find((message) => message.id === assistantId)
                  ?.tools?.find((tool) => tool.id === event.payload.toolCallId);
                const tool = agentActivity({
                  id: String(event.payload.toolCallId),
                  name: String(event.payload.toolName),
                  action: previous?.action,
                  status:
                    event.payload.isError ||
                    (event.payload.receipt as { ok?: boolean })?.ok === false
                      ? 'failed'
                      : 'settled',
                  result: event.payload.receipt,
                });
                update({
                  messages: state.messages.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          tools: (message.tools || []).map((item) =>
                            item.id === tool.id ? tool : item,
                          ),
                        }
                      : message,
                  ),
                  knownCards: [...(state.knownCards || []), ...tool.cards],
                  tools: (state.tools || []).map((tool) =>
                    tool.id === event.payload.toolCallId
                      ? { ...tool, status: event.payload.isError ? 'failed' : 'settled' }
                      : tool,
                  ),
                });
              }
            },
            onCanvasAction: (request, signal) =>
              owns(epoch) && !controller.signal.aborted && canvas
                ? canvas.execute(request, signal)
                : { ok: false, code: 'UNAVAILABLE' },
            onCanvasResult: (action) => {
              if (owns(epoch)) buffer.flush();
              if (owns(epoch))
                update({
                  messages: state.messages.map((item) =>
                    item.id === assistantId
                      ? { ...item, actions: [...(item.actions || []), action] }
                      : item,
                  ),
                });
            },
          },
        );
        if (!owns(epoch)) return false;
        buffer.cancel();
        replaceAnswer(result.response);
        update({ topic: result.topic || state.topic });
        void refreshSessions();
        return true;
      } catch (error) {
        if (owns(epoch)) buffer.flush();
        if (owns(epoch))
          update({
            error: messageError(error),
            messages: state.messages.filter(
              (item) =>
                item.id !== assistantId ||
                !!item.content ||
                !!item.actions?.length ||
                !!item.tools?.length,
            ),
          });
        return false;
      } finally {
        buffer.cancel();
        if (owns(epoch)) {
          turnBuffer = undefined;
          turnRequest = undefined;
          try {
            const saved = await client.getSession(sessionId, { signal: controller.signal });
            if (owns(epoch)) {
              applySnapshot(saved);
              if (saved.run?.status === 'running') sync.start(sessionId);
            }
          } catch {
            /* Keep streamed state and original error; no replay on read failure. */
          }
          if (owns(epoch)) update({ isLoading: state.runStatus === 'running', isStreaming: state.runStatus === 'running' });
          void conversation?.onTurnSettled(sessionId, context?.projectId).catch(() => {});
        }
      }
    },
  };
}
type Runtime = Pick<typeof React, 'useMemo' | 'useEffect' | 'useSyncExternalStore' | 'useRef'>;
export function useCanvasAgentChat(
  React: Runtime,
  conversationEnabled = true,
  canvas?: { projectId: string; execute: CanvasActionHandler },
) {
  const canvasRef = React.useRef(canvas);
  const projectId = canvas?.projectId;
  React.useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);
  const controller = React.useMemo(() => {
    // CanvasSidePanels keys the Agent by document epoch, including unsaved projects.
    return createCanvasAgentChat(
      createAgentClient(),
      undefined,
      browserServices.__NAKO_AGENT_CONVERSATION__,
      projectId !== undefined
        ? {
            projectId,
            execute: (request, signal) =>
              canvasRef.current?.execute(request, signal) || { ok: false, code: 'UNAVAILABLE' },
          }
        : undefined,
    );
  }, [projectId]);
  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  React.useEffect(() => {
    controller.setConversationEnabled(conversationEnabled);
  }, [controller, conversationEnabled]);
  React.useEffect(() => {
    controller.activate();
    void controller.refreshSessions();
    window.addEventListener('pagehide', controller.leaveProject);
    return () => {
      window.removeEventListener('pagehide', controller.leaveProject);
      controller.deactivate();
    };
  }, [controller]);
  return {
    ...state,
    sendMessage: controller.sendMessage,
    loadSession: controller.loadSession,
    deleteSession: controller.deleteSession,
    startNewChat: controller.startNewChat,
    stop: controller.stop,
    createBranch: controller.branch,
    switchBranch: controller.switchBranch,
    compact: controller.compact,
    refreshSessions: controller.refreshSessions,
    hasMessages: state.messages.length > 0,
  };
}

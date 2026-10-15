import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { browserServices } from '../../../kernel/browser';
import {
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
import { applyChatToolEvent } from './chatToolEvents';
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
      update({ isLoading: session.run?.status === 'running', isStreaming: session.run?.status === 'running',
        error: session.run?.status === 'failed' ? session.run.error || state.error : null });
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
  const scope: ChatScope = {
    client, createId, conversation, canvas, deletions, listeners, update, owns, invalidate,
    get state() { return state; }, get active() { return active; },
    get conversationEnabled() { return conversationEnabled; }, get turnEpoch() { return turnEpoch; },
    get listEpoch() { return listEpoch; }, set listEpoch(value) { listEpoch = value; },
    get listRequest() { return listRequest; }, set listRequest(value) { listRequest = value; },
    get turnRequest() { return turnRequest; }, set turnRequest(value) { turnRequest = value; },
    get turnBuffer() { return turnBuffer; }, set turnBuffer(value) { turnBuffer = value; },
    get loadingSessionId() { return loadingSessionId; }, set loadingSessionId(value) { loadingSessionId = value; },
    sync,
  };
  const { refreshSessions, startNewChat, applySnapshot, changeHistory } = createChatHistory(scope);
  return {
    ...createChatSessionActions(scope, { applySnapshot, refreshSessions, startNewChat }),
    ...createChatTurn(scope, { applySnapshot, refreshSessions }),
    ...createChatLifecycle(scope),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => state,
    setConversationEnabled(enabled: boolean) {
      if (conversationEnabled === enabled) return;
      conversationEnabled = enabled;
      if (!enabled) { invalidate(); update({ isLoading: false, isStreaming: false }); }
      else if (active && state.sessionId) { update({ isLoading: true }); sync.start(state.sessionId); }
      if (active) bindConversation();
    },
    activate() { active = true; bindConversation(); },
    deactivate() {
      if (canvas?.projectId) void client.stopProject(canvas.projectId).catch(() => {});
      active = false; unbindConversation?.(); unbindConversation = undefined; invalidate();
      listEpoch++; listRequest?.abort(); listRequest = undefined;
      deletions.forEach((controller) => controller.abort()); deletions.clear();
      state = { ...state, isLoading: false, isStreaming: false, isLoadingSessions: false };
    },
    refreshSessions, startNewChat,
    branch: (entryId: string | null) => changeHistory('branch', entryId),
    switchBranch: (branchId: string) => changeHistory('switch', branchId),
    compact: (model: string) => changeHistory('compact', model),
  };
}

type ChatScope = {
  client: AgentClient; createId(): string; conversation?: AgentConversation;
  canvas?: { projectId: string; execute: CanvasActionHandler };
  deletions: Map<string, AbortController>; listeners: Set<() => void>;
  update(patch: Partial<ChatState>): void; owns(epoch: number): boolean; invalidate(): void;
  readonly state: ChatState; readonly active: boolean; readonly conversationEnabled: boolean;
  readonly turnEpoch: number; listEpoch: number; listRequest?: AbortController;
  turnRequest?: AbortController; turnBuffer?: ReturnType<typeof createAgentTextBuffer>;
  loadingSessionId: string | null; sync: ReturnType<typeof createAgentRunSync>;
};
function createChatHistory(scope: ChatScope) {
  const { client, canvas, createId, update, invalidate, owns, conversation } = scope;
  const refreshSessions = async () => {
    if (!scope.active) return;
    const epoch = ++scope.listEpoch;
    scope.listRequest?.abort();
    const controller = new AbortController();
    scope.listRequest = controller;
    update({ isLoadingSessions: true });
    try {
      const sessions = await client.listSessions({ signal: controller.signal }, canvas?.projectId);
      if (!Array.isArray(sessions)) throw new AgentOperationError('对话历史格式无效', { operation: 'list-agent-sessions' });
      if (scope.active && epoch === scope.listEpoch) update({ sessions });
    } catch (error) {
      if (scope.active && epoch === scope.listEpoch && !controller.signal.aborted)
        update({ error: error instanceof Error ? error.message : '读取对话历史失败' });
    } finally {
      if (scope.active && epoch === scope.listEpoch) {
        scope.listRequest = undefined;
        update({ isLoadingSessions: false });
      }
    }
  };
  const startNewChat = () => {
    if (!scope.active) return;
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
      ...(session.run?.status === 'failed' && session.run.error ? { error: session.run.error } : {}),
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
    const id = scope.state.sessionId,
      project = canvas?.projectId || conversation?.requestContext().projectId;
    if (!scope.active || scope.state.isLoading || !id || !project) return false;
    invalidate();
    const epoch = scope.turnEpoch,
      controller = new AbortController();
    scope.turnRequest = controller;
    update({
      isLoading: true,
      isStreaming: operation === 'compact',
      error: null,
      ...(operation === 'compact' ? { runStatus: 'compacting' } : {}),
    });
    try {
      const revision =
        scope.state.revision ?? (await client.getSession(id, { signal: controller.signal })).revision;
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
        scope.turnRequest = undefined;
        update({ isLoading: false, isStreaming: false });
      }
    }
  };
  return { refreshSessions, startNewChat, applySnapshot, changeHistory };
}

function createChatLifecycle(scope: ChatScope) {
  return {
    leaveProject() {
      if (scope.canvas?.projectId) void scope.client.stopProject(scope.canvas.projectId).catch(() => {});
    },
    stop() {
      if (!scope.active || !scope.state.isStreaming) return;
      if (scope.state.sessionId) void scope.client.stop(scope.state.sessionId).catch(() => {});
      scope.turnBuffer?.flush();
      scope.invalidate();
      scope.update({
        isLoading: false,
        isStreaming: false,
        error: null,
        runStatus: 'aborted',
        messages: scope.state.messages.map((item, index) =>
          index === scope.state.messages.length - 1 && item.role === 'assistant'
            ? { ...item, stopped: true }
            : item,
        ),
      });
    },
  };
}

type ChatHistory = ReturnType<typeof createChatHistory>;
function createChatSessionActions(scope: ChatScope,
  { applySnapshot, refreshSessions, startNewChat }: Pick<ChatHistory, 'applySnapshot' | 'refreshSessions' | 'startNewChat'>) {
  const { client, update, invalidate, owns, deletions, sync } = scope;
  return {
    async loadSession(id: string) {
      if (!scope.active || !id || deletions.has(id)) return false;
      invalidate();
      const epoch = scope.turnEpoch,
        controller = new AbortController();
      scope.turnRequest = controller;
      scope.loadingSessionId = id;
      update({ isLoading: true, isStreaming: false, error: null });
      try {
        const session = await client.getSession(id, { signal: controller.signal });
        if (!Array.isArray(session.messages)) throw new AgentOperationError('对话内容格式无效', { operation: 'load-agent-session', sessionId: id });
        if (!owns(epoch)) return false;
        applySnapshot(session);
        if (scope.conversationEnabled && session.run?.status === 'running') sync.start(id);
        return true;
      } catch (error) {
        if (owns(epoch)) update({ error: error instanceof Error ? error.message : '读取对话失败' });
        return false;
      } finally {
        if (owns(epoch)) {
          scope.turnRequest = undefined;
          scope.loadingSessionId = null;
          update({ isLoading: scope.state.runStatus === 'running', isStreaming: scope.state.runStatus === 'running' });
        }
      }
    },
    async deleteSession(id: string) {
      if (!scope.active || !id || deletions.has(id)) return false;
      if (scope.state.isLoading) {
        update({ error: '请等待当前对话操作完成后再删除。' });
        return false;
      }
      const controller = new AbortController();
      deletions.set(id, controller);
      const epoch = scope.turnEpoch,
        wasCurrent = scope.state.sessionId === id;
      if (wasCurrent) update({ isLoading: true });
      try {
        const receipt = await client.deleteSession(id, { signal: controller.signal });
        if (receipt.success !== true) throw new AgentOperationError('删除对话未得到确认', { operation: 'delete-agent-session', sessionId: id });
        if (!scope.active || controller.signal.aborted) return false;
        if (scope.state.sessionId === id) {
          // A different history load may still be running, or may already have
          // failed. A confirmed deletion must never leave the removed ID active.
          if (scope.loadingSessionId !== null && scope.loadingSessionId !== id)
            update({ sessionId: null, messages: [], topic: null });
          else startNewChat();
        }
        update({ sessions: scope.state.sessions.filter((session) => session.id !== id) });
        void refreshSessions();
        return true;
      } catch (error) {
        if (scope.active && !controller.signal.aborted)
          update({ error: error instanceof Error ? error.message : '删除对话失败' });
        return false;
      } finally {
        if (deletions.get(id) === controller) deletions.delete(id);
        if (owns(epoch) && scope.state.sessionId === id) update({ isLoading: false });
      }
    },
  };
}

function createChatTurn(scope: ChatScope,
  { applySnapshot, refreshSessions }: Pick<ChatHistory, 'applySnapshot' | 'refreshSessions'>) {
  const { client, createId, conversation, canvas, update, invalidate, owns, deletions, sync } = scope;
  return {
    async sendMessage(
      message: string,
      media?: Media,
      model?: string,
      modelParams?: Record<string, unknown>,
      nodes?: AgentNode[],
    ) {
      if (
        !scope.active ||
        !scope.conversationEnabled ||
        scope.state.isLoading ||
        (scope.state.sessionId !== null && deletions.has(scope.state.sessionId)) ||
        (!message.trim() && !media?.length) ||
        !model
      )
        return false;
      invalidate();
      const epoch = scope.turnEpoch,
        controller = new AbortController();
      scope.turnRequest = controller;
      const sessionId = scope.state.sessionId || createId();
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
          ...scope.state.messages,
          user,
          { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
        ],
      });
      const replaceAnswer = (content: string) =>
        update({
          messages: scope.state.messages.map((item) =>
            item.id === assistantId ? { ...item, content } : item,
          ),
        });
      let buffer = createAgentTextBuffer((content) => {
        if (owns(epoch)) replaceAnswer(content);
      });
      scope.turnBuffer = buffer;
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
                      ...scope.state.messages,
                      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
                    ],
                  });
                  buffer = createAgentTextBuffer((content) => {
                    if (owns(epoch)) replaceAnswer(content);
                  });
                  scope.turnBuffer = buffer;
                }
                assistantStarted = true;
              }
              if (event.type === 'message_end' && event.payload.role === 'assistant') {
                buffer.cancel();
                update({
                  messages: scope.state.messages.map((item) =>
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
              applyChatToolEvent(event, assistantId, scope.state, update);
            },
            onCanvasAction: (request, signal) =>
              owns(epoch) && !controller.signal.aborted && canvas
                ? canvas.execute(request, signal)
                : { ok: false, code: 'UNAVAILABLE' },
            onCanvasResult: (action) => {
              if (owns(epoch)) buffer.flush();
              if (owns(epoch))
                update({
                  messages: scope.state.messages.map((item) =>
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
        update({ topic: result.topic || scope.state.topic });
        void refreshSessions();
        return true;
      } catch (error) {
        if (owns(epoch)) buffer.flush();
        if (owns(epoch))
          update({
            error: messageError(error),
            messages: scope.state.messages.filter(
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
          scope.turnBuffer = undefined;
          scope.turnRequest = undefined;
          try {
            const saved = await client.getSession(sessionId, { signal: controller.signal });
            if (owns(epoch)) {
              applySnapshot(saved);
              if (saved.run?.status === 'running') sync.start(sessionId);
            }
          } catch {
            /* Keep streamed state and original error; no replay on read failure. */
          }
          if (owns(epoch)) update({ isLoading: scope.state.runStatus === 'running', isStreaming: scope.state.runStatus === 'running' });
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

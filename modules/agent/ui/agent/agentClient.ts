import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { browserServices } from '../../../kernel/browser';
import type { AgentActivity, AgentCardReference } from '../../../contracts/agentActivity.js';
import type { AgentSelectedSkill } from '../../../contracts/skillCatalog.js';
export type { AgentSelectedSkill } from '../../../contracts/skillCatalog.js';
import { isAgentEvent, type AgentEvent, type AgentMediaReference } from '../../../contracts/agentProtocol.js';
import type { DramaComposition, DramaExecution, DramaPlan } from './dramaClient';
import {
  projectCanvasResult,
  validCanvasControl,
  type CanvasActionHandler,
  type CanvasActionRequest,
} from '../../../contracts/canvasControlProtocol.js';
import type { CanvasActionLog } from '../../../contracts/canvasControlProtocol.js';
import { resumeAgentOperations } from './agentPendingOperations';

export type AgentNode = {
  id: string;
  type: string;
  title?: string;
  model?: string;
  prompt?: string;
  textContent?: string;
  imageModel?: string;
  videoModel?: string;
  audioModel?: string;
  comfyMode?: string;
};
export type AgentMessageInput = {
  sessionId: string;
  message?: string;
  media?: AgentMediaReference[];
  nodes?: AgentNode[];
  model?: string;
  modelParams?: Record<string, unknown>;
  projectId?: string;
  canvasControl?: boolean;
};

export type AgentSession = {
  knownCards?: AgentCardReference[];
  version: 2;
  revision: number;
  activeBranch: string;
  branches: Array<{ id: string; tipId: string | null }>;
  run?: { id: string; status: string } | null;
  receipts?: Array<{ id: string; tool: string; state: string; action: string }>;
  id: string;
  topic: string;
  createdAt: string;
  messages: Array<{
    id?: string;
    role: string;
    content: string;
    timestamp?: string;
    media?: AgentMessageInput['media'];
    actions?: CanvasActionLog[];
    stopped?: boolean;
    branchable?: boolean;
    tools?: AgentActivity[];
  }>;
  selectedSkill?: AgentSelectedSkill | null;
  skillProjectId?: string;
  workflow?: {
    id: 'minimax-drama';
    projectId: string;
    version: string;
    bundleId?: string;
    script?: { name: string; text: string };
    planId?: string;
    previousPlanIds?: string[];
  };
};

export type DramaConversationState = {
  session: AgentSession;
  plan: DramaPlan | null;
  execution: DramaExecution | null;
  composition?: DramaComposition;
};
export type DramaConversationAction = {
  action: 'approve' | 'generate' | 'compose' | 'query';
  planId: string;
  planRevision: number;
  assetId?: string;
  attemptId?: string;
  retryOfAttemptId?: string;
  confirmPaidExecution?: boolean;
  maxAssets?: number;
  confirmAssets?: boolean;
};
export type AgentStreamResult = { response: string; topic?: string; messageCount: number };
export class AgentClientError extends AgentOperationError {
  constructor(
    message: string,
    code: string,
    public status: number,
    public retryable: boolean,
  ) {
    super(message, { operation: 'agent-client-request' }, code, status);
    this.name = 'AgentClientError';
  }
}
type Options = {
  signal?: AbortSignal;
  onCanvasAction?: CanvasActionHandler;
  onCanvasResult?: (action: CanvasActionLog) => void;
  onEvent?: (event: AgentEvent) => void;
};
function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason;
}
async function request<T>(
  options: Options,
  timeout: number,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () =>
    controller.abort(options.signal?.reason || new DOMException('请求已停止', 'AbortError'));
  const aborted = new Promise<never>((_, reject) =>
    controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {
      once: true,
    }),
  );
  const timer =
    timeout > 0
      ? setTimeout(
          () =>
            controller.abort(
              new AgentClientError('Agent 请求等待超时', 'AGENT_REQUEST_TIMEOUT', 0, false),
            ),
          timeout,
        )
      : undefined;
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        checkAbort(controller.signal);
        return work(controller.signal);
      }),
      aborted,
    ]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    controller.abort();
  }
}
async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => {
    throw new AgentClientError(
      'Agent 响应格式无效',
      'AGENT_RESPONSE_INVALID',
      response.status,
      false,
    );
  });
  if (!response.ok)
    throw new AgentClientError(
      String(body?.error || `Agent 请求失败 (${response.status})`),
      String(body?.code || 'AGENT_REQUEST_FAILED'),
      response.status,
      body?.retryable === true,
    );
  return body;
}
function parseEventBlock(block: string) {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  if (!data.length) return null;
  try {
    const value: unknown = JSON.parse(data.join('\n'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AgentOperationError('Agent 流式响应格式无效', { operation: 'parse-agent-event' });
    return { event, data: value as Record<string, unknown> };
  } catch {
    throw new AgentClientError('Agent 流式响应格式无效', 'AGENT_STREAM_INVALID', 502, false);
  }
}
export function createAgentClient(fetcher: typeof fetch = globalThis.fetch) {
  const projectSnapshot = (body: unknown): unknown => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
    const value = body as Record<string, unknown>;
    if (value.version === 2 && Array.isArray(value.transcript))
      return { ...value, messages: value.transcript };
    if (value.session) return { ...value, session: projectSnapshot(value.session) };
    return body;
  };
  const json = <T>(url: string, init: RequestInit = {}, options: Options = {}, timeout = 15000) =>
    request(options, timeout, async (signal) => {
      const response = await fetcher(url, { ...init, signal });
      checkAbort(signal);
      const value = await readJson<T>(response);
      checkAbort(signal);
      return projectSnapshot(value) as T;
    });
  const dramaRoute = (sessionId: string) =>
    `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/drama`;
  const post = <T>(url: string, body: unknown, options: Options = {}, timeout = 15000) =>
    json<T>(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options,
      timeout,
    );
  return {
    ...createSessionClient(fetcher, json, post),
    ...createDramaConversationClient(json, post, dramaRoute),
    ...createStreamClient(fetcher),
  };
}

type JsonRequest = <T>(url: string, init?: RequestInit, options?: Options, timeout?: number) => Promise<T>;
type PostRequest = <T>(url: string, body: unknown, options?: Options, timeout?: number) => Promise<T>;

function createSessionClient(fetcher: typeof fetch, json: JsonRequest, post: PostRequest) {
  return {
    resumeOperations: (sessionId: string, projectId: string, options: Options = {}) =>
      resumeAgentOperations(fetcher, sessionId, projectId, options),
    async stopProject(projectId: string): Promise<void> {
      const response = await fetcher(`/api/agent/v2/projects/${encodeURIComponent(projectId)}/stop`, {
        method: 'POST', keepalive: true,
      });
      await readJson(response);
    },
    switchBranch(
      sessionId: string,
      projectId: string,
      expectedRevision: number,
      branchId: string,
      options: Options = {},
    ): Promise<AgentSession> {
      return post(
        '/api/agent/v2/sessions/' + encodeURIComponent(sessionId) + '/branches',
        { projectId, expectedRevision, branchId },
        options,
      );
    },
    branch(
      sessionId: string,
      projectId: string,
      expectedRevision: number,
      entryId: string | null,
      options: Options = {},
    ): Promise<AgentSession> {
      return post(
        `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/branches`,
        { projectId, expectedRevision, entryId },
        options,
      );
    },
    compact(
      sessionId: string,
      projectId: string,
      model: string,
      expectedRevision: number,
      options: Options = {},
    ): Promise<AgentSession> {
      return post(
        `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/compact`,
        { projectId, model, expectedRevision, operationId: crypto.randomUUID() },
        options,
        600000,
      );
    },
    stop(sessionId: string): Promise<{ success: boolean }> {
      return post(`/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/stop`, {});
    },
    ...createSessionHistoryClient(json),
  };
}

function createDramaConversationClient(json: JsonRequest, post: PostRequest, dramaRoute: (id: string) => string) {
  return {
    selectSkill(
      sessionId: string,
      projectId: string,
      slug: string | null,
      options: Options = {},
    ): Promise<AgentSession> {
      return post(
        `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/skill`,
        { projectId, slug },
        options,
      );
    },
    getDramaConversation(
      sessionId: string,
      projectId: string,
      options: Options = {},
    ): Promise<DramaConversationState> {
      return json(
        `${dramaRoute(sessionId)}?projectId=${encodeURIComponent(projectId)}`,
        { cache: 'no-store' },
        options,
      );
    },
    attachDramaScript(
      sessionId: string,
      projectId: string,
      script: { name: string; text: string },
      options: Options = {},
    ): Promise<DramaConversationState> {
      return post(`${dramaRoute(sessionId)}/script`, { projectId, script }, options);
    },
    dramaAction(
      sessionId: string,
      projectId: string,
      action: DramaConversationAction,
      options: Options = {},
    ): Promise<DramaConversationState> {
      return post(`${dramaRoute(sessionId)}/actions`, { projectId, ...action }, options, 600000);
    },
    startOfficialDrama(
      sessionId: string,
      projectId: string,
      options: Options = {},
    ): Promise<AgentSession> {
      return post(
        `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/official-drama`,
        { projectId },
        options,
      );
    },
  };
}

function createStreamClient(fetcher: typeof fetch) {
  return {
    streamMessage(
      input: AgentMessageInput,
      onToken: (token: string) => void = () => undefined,
      options: Options = {},
    ): Promise<AgentStreamResult> {
      return request(options, 0, async (signal) => {
        const operationId = crypto.randomUUID();
        let sequence = 0;
        const response = await fetcher('/api/agent/v2/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, protocol: 2, operationId }),
          signal,
        });
        checkAbort(signal);
        if (!response.ok) return readJson<AgentStreamResult>(response);
        if (!response.body)
          throw new AgentClientError(
            'Agent 流式响应不可用',
            'AGENT_STREAM_UNAVAILABLE',
            502,
            false,
          );
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        const cancel = () => {
          void reader.cancel().catch(() => {});
        };
        signal.addEventListener('abort', cancel, { once: true });
        let buffer = '',
          result: AgentStreamResult | undefined;
        const continuations: Array<() => Promise<void>> = [];
        const seenActions = new Set<string>();
        const consume = async (block: string) => {
          checkAbort(signal);
          let parsed = parseEventBlock(block);
          if (!parsed) return;
          if (parsed.event === 'agent') {
            const envelope = parsed.data;
            if (
              !isAgentEvent(envelope) ||
              envelope.sessionId !== input.sessionId ||
              envelope.runId !== operationId ||
              envelope.sequence !== sequence + 1
            )
              throw new AgentClientError(
                'Agent 事件顺序或会话不匹配，请读取原运行记录。',
                'AGENT_PROTOCOL_INVALID',
                409,
                false,
              );
            sequence = envelope.sequence;
            options.onEvent?.(envelope);
            const events: Record<string, string> = {
              operation_requested: 'canvas_action',
              operation_receipt: 'canvas_result',
              message_update: 'delta',
              run_end: 'done',
              request_error: 'error',
            };
            if (envelope.type === 'run_end' && envelope.payload.status === 'failed')
              throw new AgentClientError(
                String(envelope.payload.error || '本轮运行失败，已确认的操作和回执已保留。'),
                String(envelope.payload.code || 'AGENT_RUN_FAILED'),
                502,
                false,
              );
            parsed = {
              event: events[envelope.type] || envelope.type,
              data: {
                ...envelope.payload,
                ...(envelope.type === 'message_update' ? { token: envelope.payload.delta } : {}),
              },
            };
          } else
            throw new AgentClientError('Agent 协议版本无效', 'AGENT_PROTOCOL_INVALID', 502, false);
          if (parsed.event === 'canvas_action') {
            const value = parsed.data;
            if (
              !input.canvasControl ||
              value.projectId !== input.projectId ||
              value.sessionId !== input.sessionId ||
              typeof value.requestId !== 'string' ||
              !/^[\w-]{1,128}$/.test(value.requestId) ||
              !validCanvasControl(value.command) ||
              typeof value.expiresAt !== 'number' ||
              value.expiresAt <= Date.now() ||
              seenActions.has(value.requestId)
            )
              throw new AgentClientError(
                '画布指令无效或已失效，请核对当前画布。',
                'AGENT_CANVAS_SCOPE',
                409,
                false,
              );
            seenActions.add(value.requestId);
            let receipt;
            let afterTurn: (() => Promise<void>) | undefined;
            try {
              const local = (await options.onCanvasAction?.(
                value as unknown as CanvasActionRequest,
                signal,
              )) || { ok: false, code: 'UNAVAILABLE' };
              if (local.ok) afterTurn = local.afterTurn;
              receipt = projectCanvasResult(local);
            } catch {
              receipt = { ok: false, code: 'UNCONFIRMED' };
            }
            checkAbort(signal);
            const ack = await fetcher(`/api/agent/v2/operations/${value.requestId}/receipt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: input.projectId,
                sessionId: input.sessionId,
                result: receipt,
              }),
              signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
            });
            const confirmed = await readJson<{ success: boolean }>(ack);
            if (confirmed.success !== true)
              throw new AgentClientError(
                '画布回执未确认，请核对画布；不会重复执行。',
                'AGENT_CANVAS_UNCONFIRMED',
                409,
                false,
              );
            if (afterTurn) continuations.push(afterTurn);
          }
          if (parsed.event === 'canvas_result') {
            const value = parsed.data;
            if (['edit', 'undo'].includes(String(value.action)) && typeof value.ok === 'boolean')
              options.onCanvasResult?.(value as unknown as CanvasActionLog);
          }
          if (parsed.event === 'delta' && typeof parsed.data.token === 'string')
            onToken(parsed.data.token);
          if (parsed.event === 'done') {
            if (
              typeof parsed.data.response !== 'string' ||
              !Number.isFinite(parsed.data.messageCount)
            )
              throw new AgentClientError('Agent 完成回执无效', 'AGENT_STREAM_INVALID', 502, false);
            result = {
              response: parsed.data.response,
              topic: typeof parsed.data.topic === 'string' ? parsed.data.topic : undefined,
              messageCount: Number(parsed.data.messageCount),
            };
          }
          if (parsed.event === 'error')
            throw new AgentClientError(
              String(parsed.data.error || 'Agent 流式请求失败'),
              String(parsed.data.code || 'AGENT_STREAM_FAILED'),
              200,
              parsed.data.retryable === true,
            );
        };
        try {
          while (!result) {
            // Several adapters emit their first delta only after the full answer.
            // The total request deadline applies; silence is not a failed stream.
            const next = await reader.read();
            checkAbort(signal);
            buffer += decoder.decode(next.value, { stream: !next.done });
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() || '';
            for (const block of blocks) {
              await consume(block);
              if (result) break;
            }
            if (next.done) {
              if (!result && buffer.trim()) await consume(buffer);
              break;
            }
          }
          if (!result)
            throw new AgentClientError(
              'Agent 流式响应未正常结束',
              'AGENT_STREAM_INCOMPLETE',
              502,
              false,
            );
          for (const continuation of continuations) {
            checkAbort(signal);
            await continuation();
          }
          return result;
        } finally {
          signal.removeEventListener('abort', cancel);
          cancel();
          reader.releaseLock();
        }
      });
    },
  };
}

function createSessionHistoryClient(json: JsonRequest) {
  return {
    listSessions(
      options: Options = {},
      projectId?: string,
    ): Promise<Array<Record<string, unknown>>> {
      return json(
        '/api/agent/v2/sessions' + (projectId ? '?projectId=' + encodeURIComponent(projectId) : ''),
        {},
        options,
      );
    },
    getSession(sessionId: string, options: Options = {}): Promise<AgentSession> {
      return json(`/api/agent/v2/sessions/${encodeURIComponent(sessionId)}`, {}, options);
    },
    async deleteSession(
      sessionId: string,
      options: Options = {},
    ): Promise<{ success: boolean; recoverable: boolean }> {
      const receipt = await json<{ success: boolean; recoverable: boolean }>(
        `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' },
        options,
      );
      if (receipt?.success !== true)
        throw new AgentClientError('删除对话未得到确认', 'AGENT_DELETE_UNCONFIRMED', 200, false);
      return receipt;
    },
    searchNodes(query: string, nodes: AgentNode[], type?: string, options: Options = {}) {
      return json<{
        results: Array<{ id: string; title: string; locateUrl: string }>;
        total: number;
      }>(
        '/api/agent/v2/tools/search-nodes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, type, nodes }),
        },
        options,
      );
    },
  };
}
export type AgentClient = ReturnType<typeof createAgentClient>;
declare global {
  interface Window {
    __NAKO_AGENT__?: AgentClient;
  }
}
export function installAgentClient(client = createAgentClient()): AgentClient {
  browserServices.__NAKO_AGENT__ = client;
  return client;
}

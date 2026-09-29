import {
  validCanvasControl,
  projectCanvasResult,
  type CanvasActionHandler,
} from '../../../contracts/canvasControlProtocol.js';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import type { AgentPendingOperations } from '../../../contracts/agentProtocol.js';

export async function resumeAgentOperations(
  fetcher: typeof fetch,
  sessionId: string,
  projectId: string,
  options: { signal?: AbortSignal; onCanvasAction?: CanvasActionHandler },
) {
  const signal = options.signal;
  const post = async (url: string, body: unknown) => {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new PluginError(ERRORS.agentOperationSync, '画布操作同步失败，请核对会话状态。');
    return response.json();
  };
  const requests = await post(
    `/api/agent/v2/sessions/${encodeURIComponent(sessionId)}/operations/claim`,
    { projectId },
  );
  if (!Array.isArray(requests))
    throw new PluginError(ERRORS.agentOperationSync, '画布操作响应无效');
  const continuations: Array<() => Promise<void>> = [];
  for (const request of requests as AgentPendingOperations) {
    signal?.throwIfAborted();
    if (
      request.projectId !== projectId ||
      request.sessionId !== sessionId ||
      !/^[\w-]{1,128}$/.test(request.requestId) ||
      !validCanvasControl(request.command) ||
      request.expiresAt <= Date.now()
    )
      throw new PluginError(ERRORS.agentOperationSync, '画布操作已失效或不属于当前会话');
    let result, afterTurn: (() => Promise<void>) | undefined;
    try {
      const local = (await options.onCanvasAction?.(request, signal)) || {
        ok: false,
        code: 'UNAVAILABLE',
      };
      if (local.ok) afterTurn = local.afterTurn;
      result = projectCanvasResult(local);
    } catch {
      result = { ok: false, code: 'UNCONFIRMED' };
    }
    signal?.throwIfAborted();
    const receipt = await post(`/api/agent/v2/operations/${request.requestId}/receipt`, {
      projectId,
      sessionId,
      result,
    });
    if (receipt.success !== true)
      throw new PluginError(ERRORS.agentOperationSync, '画布回执未确认，不会重复执行');
    if (afterTurn) continuations.push(afterTurn);
  }
  return continuations;
}

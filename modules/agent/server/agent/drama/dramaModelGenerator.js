import { Agent } from '@earendil-works/pi-agent-core';
import { createModelAdapter, textContent, imageBlocks } from '../../harness/modelAdapter.js';
import { AgentTextGenerationError } from '../../../../contracts/agentTextGeneration.js';
import { ERRORS } from '../../../../contracts/index.js';
import { setTimeout, clearTimeout } from 'node:timers';
import {
  classifyGenerationError,
  getUpstreamStatus,
} from '../../../../contracts/generationFailure.js';
import {
  assertDramaObject,
  DramaPlanError,
  DRAMA_PLAN_LIMITS,
  requireDramaProjectId,
} from './dramaPlan.js';

const SAFE_FAILURES = Object.freeze({
  PROVIDER_BALANCE_INSUFFICIENT: '文本模型余额不足，请检查模型账户；本次未自动重试',
  PROVIDER_TOKEN_QUOTA_INSUFFICIENT: '文本模型 API Key 独立额度不足，请检查额度；本次未自动重试',
  PROVIDER_RATE_LIMIT: '文本模型当前繁忙；本次未自动重试',
  PROVIDER_AUTH_FAILED: '文本模型服务未接受当前密钥，请检查密钥有效性和模型调用权限',
  PROVIDER_CREDENTIAL_MISSING: '尚未配置文本模型服务的密钥，请到设置中连接当前来源并保存自己的密钥',
  PROVIDER_NETWORK_ERROR: '文本模型连接中断，提交结果可能不明确；本次不会自动重放',
  UPSTREAM_INVALID_RESPONSE: '文本模型返回无效响应；本次不会自动重放',
  GENERATION_TIMEOUT: '文本规划等待超时；本次不会自动重放',
});
function normalizeMessages(messages) {
  if (
    !Array.isArray(messages) ||
    messages.length !== 2 ||
    messages[0]?.role !== 'system' ||
    messages[1]?.role !== 'user'
  )
    throw new DramaPlanError('规划消息必须包含独立的系统规则和剧本素材');
  return messages.map((message) => {
    assertDramaObject(message, ['role', 'content'], '规划消息');
    if (typeof message.content !== 'string' || !message.content.trim())
      throw new DramaPlanError('规划消息为空或过长');
    // Preserve every character and its role; never reuse chat-history truncation here.
    return { role: message.role, content: message.content };
  });
}

/** Uses the same streaming transport as existing text providers, with role-safe planning messages. */
export function createDramaModelGenerator({
  /** @type {import('../../../../contracts/agentTextGeneration.js').AgentTextGenerationService} */
  textTransport,
  defaultModels,
  readImages,
  timeoutMs = 0,
  libraryDirectory,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0) throw new DramaPlanError('规划观察时限无效');
  return async function generatePlan({
    messages,
    media = [],
    model: requested,
    modelParams = {},
    projectId,
    requestContext,
    onToken,
    signal,
  }) {
    const model = await textTransport.resolveModel(
      defaultModels ? await defaultModels.resolve('text', requested) : requested,
    );
    const inputMessages = normalizeMessages(messages);
    requireDramaProjectId(projectId);
    const images = await readImages(media, {
      libraryDirectory,
      projectId,
      model,
      detail: modelParams.detail,
    });
    const adapter = createModelAdapter({
      modelConfig: model,
      modelParams,
      textGeneration: textTransport,
    });
    const agent = new Agent({
      streamFn: adapter.streamFn,
      initialState: { model: adapter.model, tools: [], systemPrompt: inputMessages[0].content },
    });
    agent.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta')
        onToken?.(event.assistantMessageEvent.delta);
    });
    const controller = new globalThis.AbortController();
    let timedOut = false;
    const timeout =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
            agent.abort();
          }, timeoutMs)
        : undefined;
    const abort = () => {
      controller.abort();
      agent.abort();
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    requestContext?.once?.('aborted', abort);
    if (requestContext?.aborted) abort();
    try {
      controller.signal.throwIfAborted();
      await agent.prompt({
        role: 'user',
        content: [{ type: 'text', text: inputMessages[1].content }, ...imageBlocks(images)],
        timestamp: Date.now(),
      });
      controller.signal.throwIfAborted();
      const answer = agent.state.messages.at(-1);
      if (answer?.stopReason !== 'stop')
        throw adapter.error || new AgentTextGenerationError(ERRORS.providerRequest, '文本规划响应未完整结束');
      const result = { text: textContent(answer.content) };
      if (
        typeof result?.text !== 'string' ||
        !result.text.trim() ||
        result.text.length > DRAMA_PLAN_LIMITS.outputCharacters
      )
        throw new DramaPlanError(
          '文本模型未返回完整且有界的制作计划',
          'DRAMA_PLAN_OUTPUT_INVALID',
          422,
        );
      return result.text;
    } catch (error) {
      const classified = classifyGenerationError(error);
      const cancelled =
        !timedOut && (controller.signal.aborted || classified.code === 'GENERATION_CANCELLED');
      const safe =
        error instanceof DramaPlanError || error instanceof AgentTextGenerationError
          ? error
          : new DramaPlanError(
              cancelled
                ? '已停止文本规划；本次不会自动重放'
                : timedOut
                  ? '文本规划等待超时；本次不会自动重放'
                  : (SAFE_FAILURES[classified.code] ?? '文本规划未完成；本次不会自动重复调用'),
              cancelled
                ? 'GENERATION_CANCELLED'
                : timedOut
                  ? 'DRAMA_PLANNING_TIMEOUT'
                  : 'DRAMA_PLANNING_PROVIDER_FAILED',
              cancelled ? 499 : timedOut ? 504 : classified.status,
            );
      safe.upstreamStatus = getUpstreamStatus(error);
      if (error.diagnostics) safe.diagnostics = error.diagnostics;
      throw safe;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      requestContext?.off?.('aborted', abort);
    }
  };
}

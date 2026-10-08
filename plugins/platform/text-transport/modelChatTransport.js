import { ERRORS } from '../../../modules/contracts/index.js';
import { AgentTextGenerationError } from '../../../modules/contracts/agentTextGeneration.js';
import { chatPayloads } from '../../../modules/contracts/chatStream.js';
import { createToolCallAccumulator } from './toolCallAccumulator.js';

function failure(message, code = 'AGENT_CANVAS_INCOMPLETE', status = 502) {
  return new AgentTextGenerationError(ERRORS.providerRequest, message, { status, context: { reason: code } });
}

function providerFailure(status, payload) {
  return classifyProviderFailure(status, payload);
}

function classifyProviderFailure(status, payload) {
  // Classify only; never echo provider bodies which can contain prompts or credentials.
  const detail = `${payload?.error?.code || payload?.code || ''} ${payload?.error?.type || ''} ${payload?.error?.message || payload?.message || ''}`;
  if (/^SetLimitExceeded$/i.test(payload?.error?.code || payload?.code || ''))
    return failure(
      '当前模型已达到火山方舟设置的推理用量上限，服务已暂停。请到火山方舟“模型开通”检查该模型的用量限额；调整后可继续原对话。',
      'PROVIDER_USAGE_LIMIT',
      status || 429,
    );
  if (status === 402 || /insufficient[_\s-]*(?:quota|balance)|余额不足|用户额度不足/i.test(detail))
    return failure(
      '模型账户余额或额度不足，请检查对应服务账户。',
      'PROVIDER_BALANCE_INSUFFICIENT',
      402,
    );
  if (
    [401, 403].includes(status) ||
    /invalid[_-]?api[_-]?key|authentication[_-]?error|unauthorized|accessdenied/i.test(detail)
  )
    return failure(
      '模型服务未接受当前密钥或调用权限，请检查设置。',
      'PROVIDER_AUTH_FAILED',
      status || 401,
    );
  if (
    /context[_\s-]*(?:length|window|limit)|maximum context|too many tokens|上下文.{0,12}(?:超|长)/i.test(
      detail,
    )
  )
    return failure(
      '当前对话超过所选模型的上下文容量。请换用容量更大的模型，或新建对话；原对话已保留，本次不会自动裁剪或重试。',
      'AGENT_CONTEXT_EXCEEDED',
      status || 400,
    );
  if (status === 429 || /rate[_\s-]*limit/i.test(detail))
    return failure(
      '模型请求过于频繁或并发已满，请稍后再试。本次不会自动重试。',
      'PROVIDER_RATE_LIMIT',
      status || 429,
    );
  if (status === 413)
    return failure(
      '本次内容超过模型服务的请求大小限制。请减少本轮附件或分次发送；原内容已保留。',
      'AGENT_REQUEST_TOO_LARGE',
      status,
    );
  if (status >= 500 || /service[_\s-]*unavailable|overloaded/i.test(detail))
    return failure(
      '模型服务暂时不可用，请稍后再试。本次不会自动重试。',
      'PROVIDER_UNAVAILABLE',
      status || 503,
    );
  if (status === 400)
    return failure(
      '模型服务不接受本次参数或附件，请检查所选模型支持的输入。',
      'AGENT_CANVAS_INVALID_INPUT',
      status,
    );
  return failure('模型请求失败，本次不会自动重试。', 'AGENT_CANVAS_PROVIDER_FAILED', status || 502);
}

/** Accumulate complete tool arguments before dispatch; a broken stream never executes partial JSON. */
export async function readToolChat(response, onToken, signal) {
  return readToolChatResponse(response, onToken, signal);
}

async function* responseBytes(body, signal) {
  const reader = body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) return;
      yield value;
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function readToolChatResponse(response, onToken, signal) {
  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      /* HTML/empty errors still have an HTTP status. */
    }
    throw providerFailure(response.status, payload);
  }
  let content = '',
    reasoning = '',
    finish,
    usage;
  const calls = createToolCallAccumulator();
  function accept(payload, streaming) {
    if (payload.error) throw providerFailure(0, payload);
    usage = payload.usage || usage;
    const choice = payload.choices?.[0];
    if (!choice) return;
    finish = choice.finish_reason || finish;
    const delta = streaming ? choice.delta : choice.message;
    if (!delta) return;
    if (typeof delta.content === 'string') {
      content += delta.content;
      if (delta.content) onToken?.(delta.content);
    }
    if (typeof delta.reasoning_content === 'string') reasoning += delta.reasoning_content;
    calls.accept(delta.tool_calls, streaming);
  }
  try {
    const source = { headers: response.headers, body: responseBytes(response.body, signal) };
    for await (const { payload, streaming } of chatPayloads(source)) accept(payload, streaming);
  } catch (error) {
    if (error instanceof AgentTextGenerationError || error.name === 'AbortError') throw error;
    throw failure('模型工具响应不完整，本次未执行其中的画布操作。');
  }
  if (!['stop', 'tool_calls'].includes(finish) || (calls.size && finish !== 'tool_calls'))
    throw failure('模型回答未完整结束，请核对已完成操作；不会自动重试。');
  const toolCalls = calls.finish();
  return {
    message: {
      role: 'assistant',
      content: content || null,
      ...(reasoning ? { reasoning_content: reasoning } : {}),
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    },
    usage,
  };
}

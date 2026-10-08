import { ERRORS } from '../../../modules/contracts/index.js';
import { AgentTextGenerationError } from '../../../modules/contracts/agentTextGeneration.js';
import { resolveModel, modelParameters, textModelConnection, TEXT_SOURCES } from './modelConfig.js';
import { wireMessages, wireTools, neutralResult } from './messages.js';
import { readToolChat } from './modelChatTransport.js';

function abortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
function publicModel(model) {
  return {
    reference: { name: model.name, provider: model.provider },
    id: model.endpoint['multimodal-chat'].model,
    name: model.name, provider: model.provider,
    contextWindow: model.contextWindow || 65536,
    languageModes: structuredClone(model.languageModes || []),
  };
}
function requestBody(input, model) {
  const parameters = modelParameters(input.params ?? {}, model);
  if (parameters.max_output_tokens !== undefined) {
    parameters.max_completion_tokens = parameters.max_output_tokens;
    delete parameters.max_output_tokens;
  }
  if (input.maxTokens !== undefined) {
    if (!Number.isSafeInteger(input.maxTokens) || input.maxTokens < 1)
      throw new AgentTextGenerationError(ERRORS.invalidModel, '输出长度须为正整数', { status: 400 });
    const key = model.provider === 'DoubaoTextProvider' ? 'max_completion_tokens' : 'max_tokens';
    parameters[key] = Math.min(parameters[key] || Infinity, input.maxTokens);
  }
  const tools = wireTools(input.tools);
  return {
    ...parameters, model: model.endpoint['multimodal-chat'].model,
    messages: wireMessages(input.messages),
    ...(tools.length ? { tools } : {}), stream: true, stream_options: { include_usage: true },
  };
}

/** @returns {import('../../../modules/contracts/agentTextGeneration.js').AgentTextGenerationService} */
export function createTextGenerationService({ credentials, modelCatalog, fetcher, configureProxy }) {
  const catalog = () => typeof modelCatalog === 'function' ? modelCatalog() : modelCatalog;
  return Object.freeze({
    async resolveModel(requested) {
      return publicModel(resolveModel(requested, await catalog()));
    },
    async generate(input, { signal, onEvent } = {}) {
      try {
        signal?.throwIfAborted();
        const reference = input?.model;
        if (!reference || typeof reference.provider !== 'string' ||
            Object.keys(reference).some((key) => !['name', 'provider'].includes(key)))
          throw new AgentTextGenerationError(ERRORS.invalidModel, '文本模型引用无效', { status: 400 });
        const model = resolveModel(reference.name, await abortable(catalog(), signal));
        if (model.provider !== reference.provider)
          throw new AgentTextGenerationError(ERRORS.invalidModel, '文本模型来源已变化，请重新选择', { status: 400 });
        const body = requestBody(input, model);
        signal?.throwIfAborted();
        // Only this adapter holds the permission-scoped credential accessor.
        const supplied = await abortable(credentials.get(TEXT_SOURCES[model.provider].owner), signal);
        signal?.throwIfAborted();
        const { url, apiKey } = textModelConnection(model, supplied);
        const request = {
          method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body), signal,
        };
        configureProxy?.(request, model.useProxy === true);
        const response = await abortable(fetcher(url, request), signal);
        signal?.throwIfAborted();
        const result = await abortable(readToolChat(response, (text) => {
          signal?.throwIfAborted();
          onEvent?.({ type: 'textDelta', text });
        }, signal), signal);
        signal?.throwIfAborted();
        return neutralResult(result);
      } catch (error) {
        if (signal?.aborted)
          throw new AgentTextGenerationError(ERRORS.providerRequest, '已停止文本生成', {
            status: 499, context: { reason: 'GENERATION_CANCELLED' },
          });
        if (error instanceof AgentTextGenerationError) throw error;
        // Network/provider errors may echo headers, URLs or payloads: never cross the boundary.
        throw new AgentTextGenerationError(ERRORS.providerRequest, '模型连接中断或响应不完整，本次未自动重试。', {
          context: { reason: 'PROVIDER_NETWORK_ERROR' },
        });
      }
    },
  });
}

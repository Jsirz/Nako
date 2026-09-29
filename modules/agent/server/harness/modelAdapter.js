import { AssistantMessageEventStream } from '@earendil-works/pi-ai';
import { readToolChat } from '../agent/modelChatTransport.js';
import { textModelConnection, modelParameters } from './modelConfig.js';

export const textContent = (content) =>
  typeof content === 'string'
    ? content
    : (content || [])
        .filter((x) => x.type === 'text')
        .map((x) => x.text)
        .join('\n');
const zeroUsage = () => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});
export function assistantMessage(model, content = [], usage = zeroUsage(), stopReason = 'stop') {
  return {
    role: 'assistant',
    content,
    api: 'openai-completions',
    provider: model.provider,
    model: model.id,
    usage,
    stopReason,
    timestamp: Date.now(),
  };
}
function wireContent(content) {
  return typeof content === 'string'
    ? content
    : content.map((part) =>
        part.type === 'image'
          ? { type: 'image_url', image_url: { url: `data:${part.mimeType};base64,${part.data}` } }
          : { type: 'text', text: part.text || '' },
      );
}
function wireMessages(messages) {
  const result = [],
    pendingImages = [];
  for (const message of messages) {
    if (message.role !== 'toolResult' && pendingImages.length)
      result.push({ role: 'user', content: wireContent(pendingImages.splice(0)) });
    if (message.role === 'toolResult') {
      const images = message.content.filter((x) => x.type === 'image');
      result.push({
        role: 'tool',
        tool_call_id: message.toolCallId,
        content: textContent(message.content),
      });
      pendingImages.push(...images);
      continue;
    }
    if (message.role === 'assistant') {
      const tools = message.content.filter((x) => x.type === 'toolCall');
      const reasoning = message.content
        .filter((x) => x.type === 'thinking')
        .map((x) => x.thinking)
        .join('');
      result.push({
        role: 'assistant',
        content: textContent(message.content) || null,
        ...(reasoning ? { reasoning_content: reasoning } : {}),
        ...(tools.length
          ? {
              tool_calls: tools.map((x) => ({
                id: x.id,
                type: 'function',
                function: { name: x.name, arguments: JSON.stringify(x.arguments) },
              })),
            }
          : {}),
      });
      continue;
    }
    result.push({ role: 'user', content: wireContent(message.content) });
  }
  if (pendingImages.length) result.push({ role: 'user', content: wireContent(pendingImages) });
  return result;
}

/** pi never resolves its own provider/env credentials or retries. The application
 * supplies its existing transport, catalog and credential service per request. */
export function createModelAdapter({
  modelConfig,
  modelParams = {},
  getCredentials,
  textTransport,
}) {
  const endpoint = modelConfig.endpoint['multimodal-chat'];
  const model = {
    id: endpoint.model,
    name: modelConfig.name,
    provider: modelConfig.provider,
    api: 'openai-completions',
    baseUrl: endpoint.url,
    reasoning: true,
    input: ['text', 'image'],
    cost: zeroUsage().cost,
    contextWindow: modelConfig.contextWindow || 65536,
    maxTokens: 8192,
  };
  let lastError;
  function streamFn(_model, context, options = {}) {
    const stream = new AssistantMessageEventStream();
    const partial = assistantMessage(model, [{ type: 'text', text: '' }]);
    void (async () => {
      try {
        options.signal?.throwIfAborted();
        const credentials = await getCredentials(modelConfig.provider);
        const { url, apiKey } = textModelConnection(modelConfig, credentials);
        const parameters = modelParameters(modelParams, modelConfig);
        if (parameters.max_output_tokens !== undefined) {
          parameters.max_completion_tokens = parameters.max_output_tokens;
          delete parameters.max_output_tokens;
        }
        if (options.maxTokens) {
          const key =
            modelConfig.provider === 'DoubaoTextProvider' ? 'max_completion_tokens' : 'max_tokens';
          parameters[key] = Math.min(parameters[key] || Infinity, options.maxTokens);
        }
        const body = {
          ...parameters,
          model: endpoint.model,
          messages: [
            { role: 'system', content: context.systemPrompt || '' },
            ...wireMessages(context.messages),
          ],
          ...(context.tools?.length
            ? {
                tools: context.tools.map((t) => ({
                  type: 'function',
                  function: { name: t.name, description: t.description, parameters: t.parameters },
                })),
              }
            : {}),
          stream: true,
          stream_options: { include_usage: true },
        };
        const request = {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: options.signal,
        };
        textTransport.configureProxy?.(request, modelConfig.useProxy === true);
        const response = await textTransport.fetcher(url, request);
        stream.push({ type: 'start', partial });
        stream.push({ type: 'text_start', contentIndex: 0, partial });
        const result = await readToolChat(response, (delta) => {
          partial.content[0].text += delta;
          stream.push({ type: 'text_delta', contentIndex: 0, delta, partial });
        });
        options.signal?.throwIfAborted();
        // Only complete JSON reaches pi's schema validation. Broken tool streams fail closed.
        const calls = (result.message.tool_calls || []).map((call) => ({
          type: 'toolCall',
          id: call.id,
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
        }));
        partial.content = [
          ...(result.message.content ? [{ type: 'text', text: result.message.content }] : []),
          ...(result.message.reasoning_content
            ? [{ type: 'thinking', thinking: result.message.reasoning_content }]
            : []),
          ...calls,
        ];
        if (result.usage)
          partial.usage = {
            ...zeroUsage(),
            input: result.usage.prompt_tokens || 0,
            output: result.usage.completion_tokens || 0,
            totalTokens: result.usage.total_tokens || 0,
          };
        partial.stopReason = calls.length ? 'toolUse' : 'stop';
        stream.push({ type: 'done', reason: partial.stopReason, message: partial });
        stream.end(partial);
      } catch (error) {
        lastError = error;
        partial.stopReason = options.signal?.aborted ? 'aborted' : 'error';
        partial.errorMessage =
          error?.name === 'AgentCanvasError' || error?.name === 'DramaPlanError'
            ? error.message
            : '模型连接中断或响应不完整，本次未自动重试。';
        // Incomplete tool calls are never present on an error message.
        partial.content = partial.content.filter((x) => x.type !== 'toolCall');
        stream.push({ type: 'error', reason: partial.stopReason, error: partial });
        stream.end(partial);
      }
    })();
    return stream;
  }
  return {
    model,
    streamFn,
    get error() {
      return lastError;
    },
  };
}

export function imageBlocks(images) {
  return images.map((image) => {
    const match = /^data:(image\/[^;]+);base64,(.+)$/s.exec(
      image.image_url?.url || image.dataUrl || '',
    );
    if (!match)
      throw Object.assign(new Error('图片须经当前项目媒体服务读取'), {
        name: 'AgentRequestError',
        code: 'AGENT_MEDIA_INVALID',
        status: 400,
      });
    return { type: 'image', mimeType: match[1], data: match[2] };
  });
}

import { AssistantMessageEventStream } from '@earendil-works/pi-ai';
import { ERRORS } from '../../../contracts/index.js';
import { AgentTextGenerationError } from '../../../contracts/agentTextGeneration.js';

export const textContent = (content) => typeof content === 'string'
  ? content
  : (content || []).filter((part) => part.type === 'text').map((part) => part.text).join('\n');
const zeroUsage = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } });
export function assistantMessage(model, content = [], usage = zeroUsage(), stopReason = 'stop') {
  return { role: 'assistant', content, api: 'openai-completions', provider: model.provider,
    model: model.id, usage, stopReason, timestamp: Date.now() };
}
function neutralPart(part) {
  if (part.type === 'text') return { type: 'text', text: part.text };
  if (part.type === 'image') return { type: 'image', mimeType: part.mimeType, data: part.data };
  if (part.type === 'thinking') return { type: 'thinking', thinking: part.thinking };
  if (part.type === 'toolCall') return { type: 'toolCall', id: part.id, name: part.name, arguments: part.arguments };
  throw new AgentTextGenerationError(ERRORS.invalidModel, '对话内容格式无效', { status: 400 });
}
function neutralMessages(context) {
  return [
    { role: 'system', content: context.systemPrompt || '' },
    ...context.messages.map((message) => ({
      role: message.role,
      ...(message.role === 'toolResult' ? { toolCallId: message.toolCallId } : {}),
      content: typeof message.content === 'string'
        ? message.content
        : message.content.map(neutralPart),
    })),
  ];
}
export function createModelAdapter({ modelConfig: model, modelParams = {}, textGeneration }) {
  const piModel = {
    id: model.id, name: model.name, provider: model.provider, api: 'openai-completions',
    reasoning: true, input: ['text', 'image'], cost: zeroUsage().cost,
    contextWindow: model.contextWindow || 65536, maxTokens: 8192,
  };
  let lastError;
  function streamFn(_model, context, options = {}) {
    const stream = new AssistantMessageEventStream();
    const partial = assistantMessage(piModel, [{ type: 'text', text: '' }]);
    void (async () => {
      try {
        options.signal?.throwIfAborted();
        stream.push({ type: 'start', partial });
        stream.push({ type: 'text_start', contentIndex: 0, partial });
        const result = await textGeneration.generate({
          model: model.reference,
          messages: neutralMessages(context),
          params: modelParams,
          maxTokens: options.maxTokens,
          tools: (context.tools || []).map(({ name, description, parameters }) => ({
            name, description, parameters,
          })),
        }, {
          signal: options.signal,
          onEvent: (event) => {
            if (event.type !== 'textDelta') return;
            partial.content[0].text += event.text;
            stream.push({ type: 'text_delta', contentIndex: 0, delta: event.text, partial });
          },
        });
        options.signal?.throwIfAborted();
        partial.content = result.content;
        partial.usage = { ...zeroUsage(), ...result.usage, cost: zeroUsage().cost };
        partial.stopReason = result.stopReason;
        stream.push({ type: 'done', reason: partial.stopReason, message: partial });
        stream.end(partial);
      } catch (error) {
        lastError = error;
        partial.stopReason = options.signal?.aborted ? 'aborted' : 'error';
        partial.errorMessage = error?.name === 'AgentTextGenerationError'
          ? error.message : '模型连接中断或响应不完整，本次未自动重试。';
        partial.content = partial.content.filter((part) => part.type !== 'toolCall');
        stream.push({ type: 'error', reason: partial.stopReason, error: partial });
        stream.end(partial);
      }
    })();
    return stream;
  }
  return { model: piModel, streamFn, get error() { return lastError; } };
}
export function imageBlocks(images) {
  return images.map((image) => {
    const match = /^data:(image\/[^;]+);base64,(.+)$/s.exec(
      image.image_url?.url || image.dataUrl || '',
    );
    if (!match)
      throw new AgentTextGenerationError(ERRORS.invalidMedia, '图片须经当前项目媒体服务读取', {
        status: 400, context: { moduleId: 'module.agent' },
      });
    return { type: 'image', mimeType: match[1], data: match[2] };
  });
}

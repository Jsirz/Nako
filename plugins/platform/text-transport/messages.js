import { ERRORS } from '../../../modules/contracts/index.js';
import { AgentTextGenerationError } from '../../../modules/contracts/agentTextGeneration.js';

const invalid = () => new AgentTextGenerationError(ERRORS.invalidModel, '对话消息或工具格式无效', { status: 400 });
const textContent = (content) => typeof content === 'string' ? content : content
  .filter((part) => part.type === 'text').map((part) => part.text).join('\n');
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
function validateContent(content) {
  if (typeof content === 'string') return;
  if (!Array.isArray(content)) throw invalid();
  for (const part of content) {
    if (!object(part)) throw invalid();
    if (part.type === 'text' && typeof part.text === 'string') continue;
    if (part.type === 'thinking' && typeof part.thinking === 'string') continue;
    if (part.type === 'image' && /^image\/(png|jpeg|webp|gif)$/.test(part.mimeType) &&
        typeof part.data === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(part.data)) continue;
    if (part.type === 'toolCall' && typeof part.id === 'string' && part.id &&
        /^[A-Za-z0-9_-]{1,128}$/.test(part.name) && object(part.arguments)) continue;
    throw invalid();
  }
}
function wireContent(content) {
  return typeof content === 'string' ? content : content.map((part) =>
    part.type === 'image'
      ? { type: 'image_url', image_url: { url: `data:${part.mimeType};base64,${part.data}` } }
      : { type: 'text', text: part.text || '' },
  );
}
export function wireMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) throw invalid();
  const result = [], pendingImages = [];
  for (const message of messages) {
    if (!object(message) || !['system', 'user', 'assistant', 'toolResult'].includes(message.role)) throw invalid();
    validateContent(message.content);
    if (message.role !== 'toolResult' && pendingImages.length)
      result.push({ role: 'user', content: wireContent(pendingImages.splice(0)) });
    if (message.role === 'toolResult') {
      if (!Array.isArray(message.content) || typeof message.toolCallId !== 'string' || !message.toolCallId) throw invalid();
      result.push({ role: 'tool', tool_call_id: message.toolCallId, content: textContent(message.content) });
      pendingImages.push(...message.content.filter((part) => part.type === 'image'));
    } else if (message.role === 'assistant') {
      if (!Array.isArray(message.content)) throw invalid();
      const tools = message.content.filter((part) => part.type === 'toolCall');
      const reasoning = message.content.filter((part) => part.type === 'thinking').map((part) => part.thinking).join('');
      result.push({
        role: 'assistant', content: textContent(message.content) || null,
        ...(reasoning ? { reasoning_content: reasoning } : {}),
        ...(tools.length ? { tool_calls: tools.map((part) => ({
          id: part.id, type: 'function', function: { name: part.name, arguments: JSON.stringify(part.arguments) },
        })) } : {}),
      });
    } else result.push({ role: message.role, content: wireContent(message.content) });
  }
  if (pendingImages.length) result.push({ role: 'user', content: wireContent(pendingImages) });
  return result;
}
export function wireTools(tools = []) {
  if (!Array.isArray(tools)) throw invalid();
  return tools.map((tool) => {
    if (!object(tool) || !/^[A-Za-z0-9_-]{1,128}$/.test(tool.name) ||
        !object(tool.parameters) || (tool.description !== undefined && typeof tool.description !== 'string')) throw invalid();
    return { type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } };
  });
}
export function neutralResult({ message, usage }) {
  const calls = (message.tool_calls || []).map((call) => {
    let args;
    try { args = JSON.parse(call.function.arguments); } catch { /* Fail closed below. */ }
    if (!object(args)) throw new AgentTextGenerationError(ERRORS.providerRequest, '模型工具参数不完整，本次未执行工具', {
      context: { reason: 'AGENT_CANVAS_INCOMPLETE' },
    });
    return { type: 'toolCall', id: call.id, name: call.function.name, arguments: args };
  });
  return {
    content: [
      ...(message.content ? [{ type: 'text', text: message.content }] : []),
      ...(message.reasoning_content ? [{ type: 'thinking', thinking: message.reasoning_content }] : []),
      ...calls,
    ],
    usage: {
      input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0,
      cacheRead: 0, cacheWrite: 0, totalTokens: usage?.total_tokens || 0,
    },
    stopReason: calls.length ? 'toolUse' : 'stop',
  };
}

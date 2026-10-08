import { agentActivity } from '../../../contracts/agentActivity.js';
import type { AgentEvent } from '../../../contracts/agentProtocol.js';
import type { ChatMessage } from './canvasAgentChat';
import type { AgentCardReference } from '../../../contracts/agentActivity.js';

type ToolState = {
  messages: ChatMessage[];
  tools?: Array<{ id: string; name: string; status: string }>;
  knownCards?: AgentCardReference[];
};
export function applyChatToolEvent(event: AgentEvent, assistantId: string, state: ToolState,
  update: (patch: Partial<ToolState>) => void) {
  if (event.type === 'tool_start') {
    const tool = agentActivity({
      id: String(event.payload.toolCallId), name: String(event.payload.toolName),
      action: typeof event.payload.action === 'string' ? event.payload.action : undefined,
      status: 'running',
    });
    update({
      messages: state.messages.map((message) => message.id === assistantId
        ? { ...message, tools: [...(message.tools || []), tool] } : message),
      tools: [...(state.tools || []), {
        id: String(event.payload.toolCallId), name: String(event.payload.toolName), status: 'running',
      }],
    });
  }
  if (event.type === 'tool_end') {
    const previous = state.messages.find((message) => message.id === assistantId)
      ?.tools?.find((tool) => tool.id === event.payload.toolCallId);
    const tool = agentActivity({
      id: String(event.payload.toolCallId), name: String(event.payload.toolName), action: previous?.action,
      status: event.payload.isError || (event.payload.receipt as { ok?: boolean })?.ok === false
        ? 'failed' : 'settled',
      result: event.payload.receipt,
    });
    update({
      messages: state.messages.map((message) => message.id === assistantId ? {
        ...message, tools: (message.tools || []).map((item) => item.id === tool.id ? tool : item),
      } : message),
      knownCards: [...(state.knownCards || []), ...tool.cards],
      tools: (state.tools || []).map((tool) => tool.id === event.payload.toolCallId
        ? { ...tool, status: event.payload.isError ? 'failed' : 'settled' } : tool),
    });
  }
}

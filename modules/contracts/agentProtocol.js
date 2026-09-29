/** Stable Agent wire protocol. Business modules depend on these JSON values only. */
export const AGENT_PROTOCOL_VERSION = 2;
export const AGENT_EVENT_TYPES = Object.freeze([
  'run_start',
  'run_end',
  'turn_start',
  'turn_end',
  'message_start',
  'message_update',
  'message_end',
  'tool_start',
  'tool_update',
  'tool_end',
  'authorization_required',
  'compaction_start',
  'compaction_end',
  'branch_created',
  'operation_requested',
  'operation_receipt',
  'request_error',
]);
export function agentEvent(type, data = {}) {
  if (!AGENT_EVENT_TYPES.includes(type)) throw new TypeError(`Unknown Agent event: ${type}`);
  return Object.freeze({ ...data, protocol: AGENT_PROTOCOL_VERSION, type });
}
export function isAgentEvent(value) {
  if (
    !value ||
    value.protocol !== AGENT_PROTOCOL_VERSION ||
    !AGENT_EVENT_TYPES.includes(value.type) ||
    !/^[\w-]{1,128}$/.test(value.sessionId || '') ||
    !/^[\w-]{1,128}$/.test(value.runId || '') ||
    !Number.isSafeInteger(value.sequence) ||
    value.sequence < 1 ||
    !value.payload ||
    typeof value.payload !== 'object' ||
    Array.isArray(value.payload)
  )
    return false;
  const p = value.payload;
  if (value.type === 'message_update') return typeof p.delta === 'string';
  if (value.type === 'message_start') return ['user', 'assistant', 'toolResult'].includes(p.role);
  if (value.type === 'message_end')
    return (
      typeof p.entryId === 'string' &&
      typeof p.content === 'string' &&
      ['user', 'assistant', 'toolResult'].includes(p.role)
    );
  if (value.type === 'run_end')
    return (
      ['completed', 'aborted', 'failed', 'interrupted'].includes(p.status) &&
      typeof p.response === 'string'
    );
  if (value.type.startsWith('tool_'))
    return typeof p.toolCallId === 'string' && typeof p.toolName === 'string';
  return true;
}

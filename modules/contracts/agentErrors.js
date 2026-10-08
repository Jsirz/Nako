import { PluginError } from './errors.js';

export const AGENT_ERROR_CODES = Object.freeze({
  operation: 'AGENT_OPERATION_FAILED',
  invalidRequest: 'INVALID_AGENT_REQUEST',
  unavailable: 'AGENT_SERVICE_UNAVAILABLE',
  invalidResponse: 'AGENT_RESPONSE_INVALID',
  conflict: 'AGENT_STATE_CONFLICT',
});

/** Public Agent failures carry a stable code and a safe operation context. */
export class AgentOperationError extends PluginError {
  constructor(message, context, code = AGENT_ERROR_CODES.operation, status = 400) {
    super(code, message, { status, context: { moduleId: 'module.agent', ...context } });
    this.name = 'AgentOperationError';
  }
}

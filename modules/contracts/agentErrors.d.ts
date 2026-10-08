import { PluginError } from './errors.js';

export declare const AGENT_ERROR_CODES: Readonly<{
  operation: 'AGENT_OPERATION_FAILED';
  invalidRequest: 'INVALID_AGENT_REQUEST';
  unavailable: 'AGENT_SERVICE_UNAVAILABLE';
  invalidResponse: 'AGENT_RESPONSE_INVALID';
  conflict: 'AGENT_STATE_CONFLICT';
}>;
export declare class AgentOperationError extends PluginError {
  constructor(message: string, context: { operation: string; [key: string]: unknown }, code?: string, status?: number);
}

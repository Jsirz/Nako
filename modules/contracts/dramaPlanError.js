import { AgentOperationError } from './agentErrors.js';

export class DramaPlanError extends AgentOperationError {
  constructor(message, code = 'INVALID_DRAMA_PLAN', status = 400) {
    super(message, { operation: 'drama-plan' }, code, status);
    this.name = 'DramaPlanError';
  }
}

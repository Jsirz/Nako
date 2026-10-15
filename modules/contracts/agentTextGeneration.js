import { PluginError } from './errors.js';

// Retain the service ID; the service no longer exposes HTTP or credentials.
export const AGENT_TEXT_GENERATION_SERVICE = 'generation.textTransport';

export class AgentTextGenerationError extends PluginError {
  constructor(code, message, { status = 502, context = {} } = {}) {
    super(code, message, { status, context: { moduleId: 'platform.text-transport', operation: 'text.generate', ...context } });
    this.name = 'AgentTextGenerationError';
  }
}

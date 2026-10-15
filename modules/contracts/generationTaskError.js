import { PluginError } from './errors.js';
import { GENERATION_ERROR_CODES } from './generationErrors.js';

export class GenerationTaskError extends PluginError {
  constructor(details) {
    super(details.code || GENERATION_ERROR_CODES.failed, details.message, {
      status: details.status, context: { moduleId: 'generation-core', operation: 'executeGenerationTask', ...details.context },
    });
    this.name = 'GenerationTaskError';
    const { context: _context, ...fields } = details;
    Object.assign(this, fields);
  }
}


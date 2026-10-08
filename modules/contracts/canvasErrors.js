import { ERRORS, PluginError } from './errors.js';

export function canvasError(message, operation, cause) {
  return new PluginError(ERRORS.invalidCanvas, message, {
    context: { moduleId: 'canvas-ui', operation },
    ...(cause === undefined ? {} : { cause }),
  });
}

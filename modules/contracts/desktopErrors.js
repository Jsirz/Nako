import { ERRORS, PluginError } from './errors.js';
import { NODE_ERROR } from './nodeExecution.js';

export const DESKTOP_ERRORS = Object.freeze({
  update: ERRORS.desktopUpdate, unavailable: 'DESKTOP_SHELL_UNAVAILABLE',
  canvasOpen: 'DESKTOP_CANVAS_OPEN_FAILED', canvasLeave: 'DESKTOP_CANVAS_LEAVE_FAILED',
  configuration: ERRORS.invalidConfiguration, runtimeStart: 'BACKEND_START_FAILED', runtimeStop: 'BACKEND_STOP_FAILED',
});

export function desktopError(code, message, operation, status = 500, cause) {
  return new PluginError(code, message, { status,
    context: { moduleId: 'desktop-shell-observability', operation },
    ...(cause === undefined ? {} : { cause }) });
}

export function desktopFailure(error, code, message, operation, status = 500) {
  if (error instanceof AggregateError && error.code === DESKTOP_ERRORS.runtimeStop) return error;
  return error instanceof PluginError && error.status !== undefined && error.context?.moduleId
    ? error : desktopError(code, error instanceof Error ? error.message : message, operation, status, error);
}

export function desktopNodeError(code, message, details) {
  const status = code === NODE_ERROR.DENIED ? 403 : code === NODE_ERROR.NOT_FOUND ? 404
    : code === NODE_ERROR.CANCELLED ? 499 : code === NODE_ERROR.TIMEOUT ? 504
      : code === NODE_ERROR.FAILED ? 500 : 400;
  return Object.assign(desktopError(code, message, 'node.execute', status), { details });
}

export class DesktopShutdownError extends AggregateError {
  constructor(errors) {
    super(errors, 'Backend shutdown failed.');
    this.code = DESKTOP_ERRORS.runtimeStop;
    this.status = 500;
    this.context = Object.freeze({ moduleId: 'desktop-shell-observability', operation: 'runtime.stop', failureCount: errors.length });
  }
}

import type { ErrorCode } from './errors.js';
import { NODE_ERROR } from './nodeExecution.js';
export const DESKTOP_ERRORS: Readonly<{
  update: 'DESKTOP_UPDATE_FAILED'; unavailable: 'DESKTOP_SHELL_UNAVAILABLE';
  canvasOpen: 'DESKTOP_CANVAS_OPEN_FAILED'; canvasLeave: 'DESKTOP_CANVAS_LEAVE_FAILED';
  configuration: 'INVALID_CONFIGURATION'; runtimeStart: 'BACKEND_START_FAILED'; runtimeStop: 'BACKEND_STOP_FAILED';
  untrustedSender: 'UNTRUSTED_SENDER'; invalidTheme: 'INVALID_THEME';
  runtimeFailed: 'BACKEND_FAILED'; runtimeStopped: 'BACKEND_STOPPED';
}>;
export type DesktopErrorCode = (typeof DESKTOP_ERRORS)[keyof typeof DESKTOP_ERRORS] | ErrorCode | (typeof NODE_ERROR)[keyof typeof NODE_ERROR];
export interface DesktopError extends Error {
  code: DesktopErrorCode;
  status: number;
  context: Readonly<Record<string, unknown>>;
}
export function desktopError(code: DesktopErrorCode, message: string, operation: string, status?: number, cause?: unknown): DesktopError;
export function desktopFailure(error: unknown, code: DesktopErrorCode, message: string, operation: string, status?: number): DesktopError;
export function desktopNodeError(code: DesktopErrorCode, message: string, details?: unknown): DesktopError & { details?: unknown };
export class DesktopShutdownError extends AggregateError {
  code: 'BACKEND_STOP_FAILED';
  status: number;
  context: Readonly<Record<string, unknown>>;
  constructor(errors: unknown[]);
}

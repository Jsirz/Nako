import type { PluginError } from './errors.js';

export const LOCAL_RUNTIME_ERRORS: Readonly<{
  libTvCli: 'LIBTV_CLI_FAILED';
}>;
export function workflowRuntimeError(
  message: string,
  operation: string,
  code?: string,
  status?: number,
  cause?: unknown,
): PluginError;

/** Shared construction adapter with module and operation context. */
export function localRuntimeError(
  message: string,
  operation: string,
  code?: string,
  status?: number,
  cause?: unknown,
): PluginError;

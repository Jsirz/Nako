import { ERRORS, PluginError } from './errors.js';
export const LOCAL_RUNTIME_ERRORS = Object.freeze({
  libTvCli: 'LIBTV_CLI_FAILED',
});

export function workflowRuntimeError(message, operation, code = ERRORS.invalidConfiguration, status, cause) {
  return new PluginError(code, message, {
    ...(status === undefined ? {} : { status }),
    ...(cause === undefined ? {} : { cause }),
    context: { moduleId: 'workflow-runtime', operation },
  });
}

export function localRuntimeError(message, operation, code = ERRORS.providerRequest, status, cause) {
  return new PluginError(code, message, {
    ...(status === undefined ? {} : { status }),
    ...(cause === undefined ? {} : { cause }),
    context: { moduleId: 'local-runtime', operation },
  });
}

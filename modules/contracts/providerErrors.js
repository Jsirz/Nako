import { ERRORS, PluginError } from './errors.js';

// Provider-specific codes retain the existing recovery and HTTP diagnostics.
export const PROVIDER_ERRORS = Object.freeze({
  input: 'PROVIDER_INVALID_INPUT', response: 'PROVIDER_INVALID_RESPONSE',
  submit: 'PROVIDER_SUBMISSION_FAILED', task: 'PROVIDER_TASK_FAILED',
  unknown: 'PROVIDER_TASK_UNKNOWN', timeout: 'PROVIDER_TIMEOUT',
  download: 'PROVIDER_DOWNLOAD_FAILED', cancelled: 'PROVIDER_CANCELLED',
  empty: 'EMPTY_RESPONSE', invalidJson: 'INVALID_JSON_RESPONSE',
  networkAborted: 'ECONNABORTED', networkRefused: 'ECONNREFUSED', networkReset: 'ECONNRESET',
  networkUnreachable: 'ENETUNREACH', networkTimeout: 'ETIMEDOUT',
  connectTimeout: 'UND_ERR_CONNECT_TIMEOUT', socket: 'UND_ERR_SOCKET',
  libTvCli: 'LIBTV_CLI_FAILED',
  auth: 'PROVIDER_AUTH_FAILED',
  ecloudInput: 'ECLOUD_INVALID_INPUT', ecloudPayment: 'ECLOUD_PAYMENT_REQUIRED',
  ecloudAuth: 'ECLOUD_AUTH_FAILED', ecloudRateLimit: 'ECLOUD_RATE_LIMIT',
  ecloudApi: 'ECLOUD_API_ERROR', ecloudTask: 'ECLOUD_TASK_FAILED',
  dreaminaInputUnsupported: 'DREAMINA_INPUT_UNSUPPORTED', dreaminaInputInvalid: 'DREAMINA_INPUT_INVALID',
  dreaminaInputNotLocal: 'DREAMINA_INPUT_NOT_LOCAL', dreaminaUnavailable: 'DREAMINA_CLI_UNAVAILABLE',
  dreaminaCommand: 'DREAMINA_CLI_COMMAND_FAILED', dreaminaTask: 'DREAMINA_TASK_FAILED',
  dreaminaTimeout: 'DREAMINA_TASK_TIMEOUT', dreaminaResolution: 'DREAMINA_VIDEO_RESOLUTION_UNSUPPORTED',
  dreaminaDuration: 'DREAMINA_DURATION_INVALID', dreaminaImage: 'DREAMINA_IMAGE_REQUIRED',
  dreaminaFrames: 'DREAMINA_FRAMES_REQUIRED', dreaminaVisualReference: 'DREAMINA_VISUAL_REFERENCE_REQUIRED',
  dreaminaReference: 'DREAMINA_REFERENCE_REQUIRED',
  dreaminaArguments: 'DREAMINA_RUNTIME_ARGUMENT_INVALID', dreaminaNotInstalled: 'DREAMINA_CLI_NOT_INSTALLED',
  libTvCount: 'LIBTV_COUNT_INVALID', libTvRatio: 'LIBTV_RATIO_INVALID',
  workFisherTimeout: 'WORK_FISHER_TIMEOUT',
  libTvResolution: 'LIBTV_RESOLUTION_INVALID', libTvInput: 'LIBTV_INPUT_INVALID',
  libTvInputRequired: 'LIBTV_INPUT_REQUIRED', libTvDuration: 'LIBTV_DURATION_INVALID',
  libTvUnavailable: 'LIBTV_CLI_UNAVAILABLE', libTvReference: 'LIBTV_REFERENCE_NOT_CONNECTED',
  libTvReferenceOrder: 'LIBTV_REFERENCE_ORDER_INVALID',
  seedVr2Input: 'SEEDVR2_INVALID_INPUT', seedVr2Output: 'SEEDVR2_OUTPUT_UNCONFIRMED',
  seedVr2Rejected: 'SEEDVR2_SUBMISSION_REJECTED',
  submissionUnknown: 'GENERATION_SUBMISSION_UNKNOWN', observationInterrupted: 'GENERATION_OBSERVATION_INTERRUPTED',
});
const knownCodes = new Set([...Object.values(ERRORS), ...Object.values(PROVIDER_ERRORS)]);

export class ProviderError extends PluginError {
  constructor(message, { providerId, operation = 'request', code = ERRORS.providerRequest, status, cause, ...details } = {}) {
    const { context = {}, ...properties } = details;
    super(code, message, {
      ...(status === undefined ? {} : { status }),
      ...(cause === undefined ? {} : { cause }),
      context: { moduleId: 'generation-providers', providerId: providerId || 'generation-provider', operation, ...context },
    });
    this.name = 'ProviderError';
    Object.assign(this, properties);
    if (status !== undefined) this.status = status;
  }
}

export function providerError(message, options = {}) {
  return new ProviderError(message, options);
}

/** Preserve wire/recovery evidence while attaching the provider boundary context. */
export function wrapProviderError(error, options = {}) {
  if (error instanceof PluginError) {
    error.context = Object.freeze({ ...error.context, ...options.context, moduleId: 'generation-providers',
      providerId: options.providerId || error.context?.providerId || 'generation-provider',
      operation: error.context?.operation || options.operation || 'request' });
    return error;
  }
  const properties = error && typeof error === 'object' ? { ...error } : {};
  const transportCode = error?.transportCode || error?.cause?.code || error?.code;
  const code = knownCodes.has(error?.code) ? error.code
    : knownCodes.has(transportCode) ? transportCode : options.code || ERRORS.providerRequest;
  const wrapped = providerError(String(error?.message || error || 'Provider request failed.'), {
    ...properties, ...options, code, cause: error,
    transportCode,
    context: { ...error?.context, ...options.context, moduleId: 'generation-providers',
      providerId: options.providerId || error?.context?.providerId || 'generation-provider',
      operation: error?.context?.operation || options.operation || 'request' },
  });
  if (error?.name) wrapped.name = error.name;
  if (error?.code && !knownCodes.has(error.code)) wrapped.upstreamCode ??= error.code;
  return wrapped;
}

/** Small factories keep validation, submission, observation and download distinct. */
export function providerErrorsFor(providerId) {
  const create = (code, operation) => (message, options = {}) =>
    providerError(message, { providerId, code, operation, ...options });
  return {
    credentialError: create(ERRORS.credentialMissing, 'configure'),
    configError: create(ERRORS.invalidModel, 'configure'),
    inputError: create(PROVIDER_ERRORS.input, 'validate-input'),
    responseError: create(PROVIDER_ERRORS.response, 'read-response'),
    submitError: create(PROVIDER_ERRORS.submit, 'submit'),
    taskError: create(PROVIDER_ERRORS.task, 'poll'),
    unknownError: create(PROVIDER_ERRORS.unknown, 'poll'),
    timeoutError: create(PROVIDER_ERRORS.timeout, 'poll'),
    downloadError: create(PROVIDER_ERRORS.download, 'download'),
    cancelledError: create(PROVIDER_ERRORS.cancelled, 'cancel'),
    wrapError: (error, operation = 'request') => wrapProviderError(error, { providerId, operation }),
  };
}

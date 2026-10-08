import { PluginError, type ErrorCode } from './errors.js';

export const PROVIDER_ERRORS: Readonly<{
  input: 'PROVIDER_INVALID_INPUT'; response: 'PROVIDER_INVALID_RESPONSE';
  submit: 'PROVIDER_SUBMISSION_FAILED'; task: 'PROVIDER_TASK_FAILED';
  unknown: 'PROVIDER_TASK_UNKNOWN'; timeout: 'PROVIDER_TIMEOUT';
  download: 'PROVIDER_DOWNLOAD_FAILED'; cancelled: 'PROVIDER_CANCELLED';
  empty: 'EMPTY_RESPONSE'; invalidJson: 'INVALID_JSON_RESPONSE';
  auth: 'PROVIDER_AUTH_FAILED';
  networkAborted: 'ECONNABORTED'; networkRefused: 'ECONNREFUSED'; networkReset: 'ECONNRESET';
  networkUnreachable: 'ENETUNREACH'; networkTimeout: 'ETIMEDOUT';
  connectTimeout: 'UND_ERR_CONNECT_TIMEOUT'; socket: 'UND_ERR_SOCKET';
  libTvCli: 'LIBTV_CLI_FAILED';
  ecloudInput: 'ECLOUD_INVALID_INPUT'; ecloudPayment: 'ECLOUD_PAYMENT_REQUIRED';
  ecloudAuth: 'ECLOUD_AUTH_FAILED'; ecloudRateLimit: 'ECLOUD_RATE_LIMIT';
  ecloudApi: 'ECLOUD_API_ERROR'; ecloudTask: 'ECLOUD_TASK_FAILED';
  dreaminaInputUnsupported: 'DREAMINA_INPUT_UNSUPPORTED'; dreaminaInputInvalid: 'DREAMINA_INPUT_INVALID';
  dreaminaInputNotLocal: 'DREAMINA_INPUT_NOT_LOCAL'; dreaminaUnavailable: 'DREAMINA_CLI_UNAVAILABLE';
  dreaminaCommand: 'DREAMINA_CLI_COMMAND_FAILED'; dreaminaTask: 'DREAMINA_TASK_FAILED';
  dreaminaTimeout: 'DREAMINA_TASK_TIMEOUT'; dreaminaResolution: 'DREAMINA_VIDEO_RESOLUTION_UNSUPPORTED';
  dreaminaDuration: 'DREAMINA_DURATION_INVALID'; dreaminaImage: 'DREAMINA_IMAGE_REQUIRED';
  dreaminaFrames: 'DREAMINA_FRAMES_REQUIRED'; dreaminaVisualReference: 'DREAMINA_VISUAL_REFERENCE_REQUIRED';
  dreaminaReference: 'DREAMINA_REFERENCE_REQUIRED';
  dreaminaArguments: 'DREAMINA_RUNTIME_ARGUMENT_INVALID'; dreaminaNotInstalled: 'DREAMINA_CLI_NOT_INSTALLED';
  libTvCount: 'LIBTV_COUNT_INVALID'; libTvRatio: 'LIBTV_RATIO_INVALID';
  workFisherTimeout: 'WORK_FISHER_TIMEOUT';
  libTvResolution: 'LIBTV_RESOLUTION_INVALID'; libTvInput: 'LIBTV_INPUT_INVALID';
  libTvInputRequired: 'LIBTV_INPUT_REQUIRED'; libTvDuration: 'LIBTV_DURATION_INVALID';
  libTvUnavailable: 'LIBTV_CLI_UNAVAILABLE'; libTvReference: 'LIBTV_REFERENCE_NOT_CONNECTED';
  libTvReferenceOrder: 'LIBTV_REFERENCE_ORDER_INVALID';
  seedVr2Input: 'SEEDVR2_INVALID_INPUT'; seedVr2Output: 'SEEDVR2_OUTPUT_UNCONFIRMED';
  seedVr2Rejected: 'SEEDVR2_SUBMISSION_REJECTED';
  submissionUnknown: 'GENERATION_SUBMISSION_UNKNOWN'; observationInterrupted: 'GENERATION_OBSERVATION_INTERRUPTED';
}>;
export type ProviderErrorCode = ErrorCode | (typeof PROVIDER_ERRORS)[keyof typeof PROVIDER_ERRORS];
export interface ProviderErrorOptions {
  providerId?: string;
  operation?: string;
  code?: ProviderErrorCode;
  status?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
  [detail: string]: unknown;
}

export class ProviderError extends PluginError {
  code: ProviderErrorCode;
  context: Readonly<Record<string, unknown>>;
  status?: number;
  constructor(message: string, options?: ProviderErrorOptions);
}
export function providerError(message: string, options?: ProviderErrorOptions): ProviderError;
export function wrapProviderError(error: unknown, options?: ProviderErrorOptions): ProviderError;
type ErrorFactory = (message: string, options?: ProviderErrorOptions) => ProviderError;
export interface ProviderErrorFactories {
  credentialError: ErrorFactory;
  configError: ErrorFactory;
  inputError: ErrorFactory;
  responseError: ErrorFactory;
  submitError: ErrorFactory;
  taskError: ErrorFactory;
  unknownError: ErrorFactory;
  timeoutError: ErrorFactory;
  downloadError: ErrorFactory;
  cancelledError: ErrorFactory;
  wrapError(error: unknown, operation?: string): ProviderError;
}
export function providerErrorsFor(providerId: string): ProviderErrorFactories;

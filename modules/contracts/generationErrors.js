export const GENERATION_ERROR_CODES = Object.freeze({
  failed: 'GENERATION_FAILED',
  cancelled: 'GENERATION_CANCELLED',
  timeout: 'GENERATION_TIMEOUT',
  observationInterrupted: 'GENERATION_OBSERVATION_INTERRUPTED',
  submissionUnknown: 'GENERATION_SUBMISSION_UNKNOWN',
  budgetUnavailable: 'BUDGET_UNAVAILABLE',
  unsupportedProvider: 'UNSUPPORTED_GENERATION_PROVIDER',
  defaultModelUnavailable: 'DEFAULT_MODEL_UNAVAILABLE',
  defaultModelRequired: 'DEFAULT_MODEL_REQUIRED',
  invalidDefaultModels: 'INVALID_DEFAULT_MODELS',
  invalidModelKind: 'INVALID_MODEL_KIND',
});

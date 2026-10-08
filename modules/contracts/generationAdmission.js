/** Admission rejection is not a generation failure and must not start another attempt. */
export const GENERATION_ADMISSION_CODES = Object.freeze({
  duplicateAttempt: 'GENERATION_ATTEMPT_ALREADY_ADMITTED',
  nodeActive: 'NODE_GENERATION_ACTIVE',
  modelConcurrency: 'MODEL_CONCURRENCY_LIMIT',
});

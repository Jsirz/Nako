export const GENERATION_ADMISSION_CODES: Readonly<{
  duplicateAttempt: 'GENERATION_ATTEMPT_ALREADY_ADMITTED';
  nodeActive: 'NODE_GENERATION_ACTIVE';
  modelConcurrency: 'MODEL_CONCURRENCY_LIMIT';
}>;
export type GenerationAdmissionCode = (typeof GENERATION_ADMISSION_CODES)[keyof typeof GENERATION_ADMISSION_CODES];
/** Retained in the latest task record so a newer retry does not erase older admission identities. */
export interface GenerationAdmissionHistory {
  attemptId: string;
  admittedAttemptIds: string[];
}
export interface DuplicateGenerationAdmission {
  ok: false;
  code: typeof GENERATION_ADMISSION_CODES.duplicateAttempt;
  status: 409;
  retryable: false;
  message: string;
  nodeId: string;
  attemptId: string;
  inFlight: number;
  maxConcurrent: number;
}

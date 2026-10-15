export interface GenerationFailure {
  code: string;
  status: number;
  retryable: boolean;
  message: string;
}
export function getUpstreamStatus(error: unknown): number | null;
export function classifyGenerationError(error: unknown): GenerationFailure;
export function confirmedGenerationFailure(error: unknown): GenerationFailure;

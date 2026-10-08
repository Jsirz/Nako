export type GenerationTaskStatus =
  | 'idle' | 'queued' | 'loading' | 'success' | 'error' | 'cancelled' | 'timed-out';

export interface GenerationTaskState {
  nodeId: string;
  status: GenerationTaskStatus;
  queuedAt?: number;
  startedAt?: number;
  finishedAt?: number;
  resultUrl?: string;
  error?: string;
  generationDiagnosticCode?: string;
  generationDurationMs?: number;
  generationEstimatedCost?: number;
  generationProviderName?: string;
}
export type GenerationTaskEvent =
  | { type: 'enqueue'; at: number }
  | { type: 'start'; at: number }
  | { type: 'succeed'; at: number; resultUrl?: string }
  | { type: 'fail'; at: number; error: string }
  | { type: 'cancel'; at: number }
  | { type: 'timeout'; at: number };

export interface GenerationPromptNode {
  id: string;
  type: string;
  x?: number;
  y?: number;
  parentIds?: string[];
  prompt?: unknown;
  textContent?: unknown;
  [key: string]: unknown;
}
export interface GenerationSchedulerAdapter {
  acquire(nodeId: string): boolean;
  release(nodeId: string, attemptId?: string): void;
  isInFlight(nodeId: string): boolean;
  currentAttempt(nodeId: string): string | null;
  decorateRequest<T extends Record<string, unknown>>(request: T): T & { generationAttemptId?: string };
  subscribe(listener: () => void): () => void;
  version(): number;
  buildPrompt(nodes: readonly GenerationPromptNode[], node: GenerationPromptNode): string;
  transition(task: GenerationTaskState, event: GenerationTaskEvent): GenerationTaskState;
  getDiagnostics(): { acquired: number; rejected: number; active: number; promptBuilds: number };
}

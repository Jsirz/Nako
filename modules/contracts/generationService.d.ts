import type { GenerationKind, GenerationRequest, GenerationResult } from './index.js';

/** Persisted task snapshot. Provider/workflow extensions remain data, never runtime objects. */
export interface GenerationTaskRecord {
  nodeId: string;
  attemptId?: string;
  admittedAttemptIds?: string[];
  status: 'loading' | 'queued' | 'success' | 'failed' | 'cancelled' | 'unknown';
  kind?: string;
  projectId?: string;
  code?: string;
  phase?: string;
  retryable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [field: string]: unknown;
}
export interface GenerationAdmissionRequest {
  nodeId?: string;
  attemptId?: string;
  kind: string;
  modelName?: string;
  modelIdKey: string;
  maxConcurrent?: number;
  timeEstimate?: string;
  generateCount?: number;
  metadata?: Record<string, unknown>;
  leaseHeartbeatMs?: number;
  absoluteTimeoutMs?: number;
}
export interface GenerationLeaseResult {
  ok: boolean;
  code?: string;
  message?: string;
  status?: number;
  retryable?: boolean;
  nodeId?: string;
  attemptId?: string;
  leaseId?: string;
  signal?: AbortSignal;
  inFlight?: number;
  maxConcurrent?: number;
  ttlMs?: number;
  absoluteTtlMs?: number;
  absoluteDeadlineMs?: number;
  recovered?: boolean;
  task?: GenerationTaskRecord | null | false;
}
export interface GenerationTaskRecords {
  get(nodeId: string): GenerationTaskRecord | null;
  list(): GenerationTaskRecord[];
}
export interface GenerationTaskCoordination {
  begin(input: GenerationAdmissionRequest): GenerationLeaseResult;
  getTask(nodeId: string): GenerationTaskRecord | null;
  isActive(nodeId: string): boolean;
  getConcurrency(modelIdKey: string, maxConcurrent?: number): { blocked: boolean; inFlight: number; maxConcurrent: number; available: number | null };
  adopt(task: GenerationTaskRecord, options?: { leaseHeartbeatMs?: number; absoluteDeadlineMs?: number }): GenerationLeaseResult;
  reacquireObservation(nodeId: string, options?: { leaseHeartbeatMs?: number; absoluteTimeoutMs?: number }): GenerationLeaseResult;
  update(nodeId: string, patch: Record<string, unknown>, attemptId?: string): GenerationTaskRecord | false;
  heartbeat(nodeId: string): GenerationTaskRecord | false;
  complete(nodeId: string, result?: Record<string, unknown>, attemptId?: string): GenerationTaskRecord | false;
  completeIfActive(nodeId: string, receiptPayloadHash: string, pendingReceiptId: string): GenerationTaskRecord | false;
  fail(nodeId: string, details?: Record<string, unknown>, attemptId?: string): GenerationTaskRecord | false;
  cancel(nodeId: string): GenerationLeaseResult;
  requestCancel(nodeId: string, details?: Record<string, unknown>): GenerationLeaseResult;
  finalizeCancel(nodeId: string, details?: Record<string, unknown>): GenerationLeaseResult;
  finalizeUnknown(nodeId: string, details?: Record<string, unknown>, attemptId?: string): GenerationTaskRecord | false;
  reconcileRemoteTask(nodeId: string, attemptId: string, status: 'success' | 'failed' | 'partial', details?: Record<string, unknown>): GenerationTaskRecord | false;
  recordRemoteTask(nodeId: string, attemptId: string, reference: Record<string, unknown>, slot?: number): GenerationTaskRecord | false;
  pauseObservation(nodeId: string, details?: Record<string, unknown>): GenerationTaskRecord | false;
}
export interface GenerationService {
  readonly coordinator: Readonly<GenerationTaskCoordination>;
  readonly journal: Readonly<GenerationTaskRecords>;
  generate(kind: GenerationKind, request: GenerationRequest): Promise<GenerationResult>;
  generateImage(request: GenerationRequest): Promise<GenerationResult>;
  generateNode(request: Record<string, unknown>, context: Record<string, unknown>): Promise<GenerationResult>;
  observeNode(context: Record<string, unknown>): Promise<GenerationResult | null>;
}
export const GENERATION_COORDINATION_METHODS: readonly (keyof GenerationTaskCoordination)[];

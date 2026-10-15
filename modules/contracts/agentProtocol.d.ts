import type { AgentActivity, AgentCardReference } from './agentActivity.js';
export const AGENT_PROTOCOL_VERSION: 2;
export type AgentEventType =
  | 'run_start'
  | 'run_end'
  | 'turn_start'
  | 'turn_end'
  | 'message_start'
  | 'message_update'
  | 'message_end'
  | 'tool_start'
  | 'tool_update'
  | 'tool_end'
  | 'authorization_required'
  | 'compaction_start'
  | 'compaction_end'
  | 'branch_created'
  | 'operation_requested'
  | 'operation_receipt'
  | 'request_error';
export interface AgentEvent {
  protocol: 2;
  type: AgentEventType;
  sessionId: string;
  runId: string;
  sequence: number;
  payload: Record<string, unknown>;
}
export const AGENT_EVENT_TYPES: readonly AgentEventType[];
export function isAgentEvent(value: unknown): value is AgentEvent;
export function agentEvent(type: AgentEventType, data?: Record<string, unknown>): AgentEvent;
export interface AgentOperation {
  protocol: 2;
  operationId: string;
  sessionId: string;
  projectId: string;
  expectedRevision?: number;
}
export type AgentRunStatus = 'running' | 'completed' | 'aborted' | 'failed' | 'interrupted';
export interface AgentMediaReference { type: 'image' | 'video' | 'audio'; url: string }
/** Leaving a project stops all of its active runs; closing its panel only detaches. */
export interface AgentProjectStopResult { success: true }
export type AgentPendingOperations = import('./canvasControlProtocol.js').CanvasActionRequest[];
export interface AgentRunRequest extends AgentOperation {
  message: string;
  model: string;
  modelParams?: Record<string, unknown>;
  canvasControl?: boolean;
  media?: AgentMediaReference[];
  nodes?: Array<{ id: string; type: string; [key: string]: unknown }>;
}
export interface AgentBranchRequest {
  projectId: string;
  expectedRevision: number;
  entryId?: string | null;
  branchId?: string;
}
export interface AgentSessionSnapshot {
  version: 2;
  id: string;
  projectId: string;
  revision: number;
  activeBranch: string;
  branches: Array<{ id: string; tipId: string | null }>;
  transcript: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    branchable: boolean;
    stopped: boolean;
    tools?: AgentActivity[];
  }>;
  knownCards?: AgentCardReference[];
  run: {
    id: string;
    status: AgentRunStatus;
    kind?: 'compaction';
    /** Safe terminal diagnostics; no provider bodies or credentials. */
    code?: string;
    error?: string;
    httpStatus?: number;
    reason?: string;
  } | null;
  receipts: Array<{
    id: string;
    runId: string;
    toolCallId: string;
    tool: string;
    state: 'pending' | 'settled' | 'unknown';
    result?: unknown;
  }>;
}
export interface AgentSessionRepository {
  get(id: string): Promise<unknown>;
  commit(record: unknown, expectedRevision: number): Promise<unknown>;
  list(projectId?: string): Promise<unknown[]>;
  remove(id: string): Promise<boolean>;
}

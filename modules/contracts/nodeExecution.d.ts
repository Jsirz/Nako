export declare const NODE_CAPABILITIES: readonly string[];
export declare const NODE_ERROR: Readonly<Record<string, string>>;
export declare function nodeError(code: string, message: string, details?: unknown): Error & { code: string; details?: unknown };
export declare function jsonClone<T>(value: T): T;
export declare function isNodeRecord(value: unknown): value is Record<string, unknown>;
export declare function validateNodeSchema(schema: unknown, depth?: number): Record<string, unknown>;
export declare function validateNodeValue(schema: Record<string, unknown> | undefined, value: unknown, path?: string): unknown;
export declare function validatePortValue(port: import('./nodeSdk').NodePort, value: unknown): unknown;
export interface NodeRunRequest { requestId: string; authorizationId?: string; planId?: string; projectId: string; revision?: number; nodes: Record<string, unknown>[]; edges?: import('./nodeSdk').NodeEdge[]; initialInputs?: Record<string, { targetPortId: string; value: unknown }[]>; maxModelCalls?: number; maxParallel?: number; }
export interface NodeRunReceipt { createdAt?: string; recoveryPending?: boolean; id: string; requestId?: string; projectId: string; status: 'awaiting_approval' | 'running' | 'success' | 'error' | 'cancelled' | 'interrupted'; capabilities: string[]; maxModelCalls: number; modelCalls: number; results?: Record<string, Record<string, unknown>>; states?: Record<string, string>; nodes?: Array<{ id: string; type: string; pluginId: string; title: string; parameters?: Record<string, unknown> }>; error?: string; code?: string; events: Record<string, unknown>[]; }
export interface NodeBusinessContext { runId: string; nodeId: string; call(capability: string, input: Record<string, unknown>, stepId: string): Promise<unknown>; progress(message: string): void; }
export interface NodeGenerationClient {
  generate(kind: 'text' | 'image' | 'video' | 'audio', request: Record<string, unknown>): Promise<Record<string, unknown>>;
  observe(projectId: string, nodeId: string, requestId: string, signal: AbortSignal): Promise<NodeGenerationObservation | null>;
}
export interface NodeGenerationObservation { recoveryPending?: boolean; status: string; attemptId: string; type?: string; text?: string; resultUrls?: string[]; resultUrl?: string; error?: string; code?: string; }
export interface NodeRunRuntime {
  prepare(request: NodeRunRequest, caller: { scope: string; agent?: boolean }): Promise<NodeRunReceipt>;
  approve(id: string, scope: string, grants: string[]): Promise<NodeRunReceipt>;
  cancel(id: string, scope: string): Promise<NodeRunReceipt>;
  get(id: string, scope: string): NodeRunReceipt;
  observe(id: string, scope: string): Promise<NodeRunReceipt>;
  find(projectId: string, requestId: string, scope: string): NodeRunReceipt | null;
  list(projectId: string, scope: string): NodeRunReceipt[];
  wait(id: string, scope: string): Promise<NodeRunReceipt>;
  stopProject(projectId: string, scope: string): Promise<void>;
  close(): Promise<void>;
  project(projectId: string): Promise<{ id: string; revision: number }>;
}
export interface NodeRunStore {
  createId(): string;
  list(): Promise<Array<Record<string, unknown>>>;
  save(record: Record<string, unknown>): Promise<void>;
  value(scope: string, pluginId: string, key: string, value?: unknown): Promise<unknown>;
}
export interface NodeCapabilityContext { projectId: string; scope: string; pluginId: string; nodeId: string; runId: string; stepId: string; signal: AbortSignal; childSignal?: AbortSignal; authorizationId?: string; planId?: string; }
export type NodeCapabilityHandlers = Record<string, (input: Record<string, unknown>, context: NodeCapabilityContext) => Promise<unknown> | unknown>;

/** Host-injected observation cannot submit work or invoke package executors. */
export interface NodeRunRecoveryRequest { run: NodeRunReceipt; steps: { key: string; capability: string; status: string }[]; }
export interface NodeRunRecoveryResult { status: "pending" | "success" | "error"; results?: Record<string, Record<string, unknown>>; steps?: Record<string, unknown>; code?: string; error?: string; }
export type NodeRunRecovery = (request: NodeRunRecoveryRequest) => Promise<NodeRunRecoveryResult | null>;
export interface NodeModelObservation { status: string; type: string; recoveryPending?: boolean; resultUrl?: string; resultUrls?: string[]; text?: string; code?: string; error?: string; }
export interface NodeModelObserver { observeNode(context: { runId: string; stepId: string; projectId: string }): Promise<NodeModelObservation | null>; }

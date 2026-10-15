import type { CanvasNode, CanvasGroup } from './canvasDocument';
import type { CanvasActionRequest, CanvasActionHandler, CanvasResult } from './canvasControlProtocol.js';
import type { GenerationAuthorization } from './generationUi';

export type CanvasSnapshot = { nodes: CanvasNode[]; groups: CanvasGroup[] };
export interface CanvasControlRuntime {
  projectId: string;
  snapshot(): CanvasSnapshot;
  create(type: string, point: { x: number; y: number }, projectId: string): CanvasNode;
  commit(before: CanvasSnapshot, after: CanvasSnapshot): void;
  configure?(nodes: CanvasNode[], id: string, patch: Partial<CanvasNode>): CanvasNode[];
  connect?(nodes: CanvasNode[], sourceId: string, targetId: string, sourcePort?: number): CanvasNode[];
  measure?(node: CanvasNode): { width: number; height: number };
  selection?(): string[];
  focus?(nodeIds: string[]): void;
}
export interface CanvasCreationRuntime {
  projectId: string;
  nodes(): CanvasNode[];
  generate(id: string, authorization: GenerationAuthorization): Promise<void> | undefined;
}
export interface CanvasProjectRuntime {
  projectId: string;
  folderId?: string | null;
  save(): Promise<boolean>;
  rename(title: string): Promise<boolean>;
  move(folderId: string | null): void;
  open(id: string): Promise<void>;
  exit(): Promise<void>;
  importFile(): void;
  download(id: string): void;
}
export type ProductOperation = 'upload' | 'replace' | 'download' | 'saveAsset' | 'resize' | 'workflowManager' | 'runWorkflow';
export interface ProductRequest {
  id: string; sessionId: string; label: string; state: 'pending' | 'opened' | 'cancelled' | 'unconfirmed';
}
export interface CanvasProductRuntime {
  projectId: string;
  invoke(operation: ProductOperation, nodeId?: string): Promise<void> | void;
}
export interface CanvasWorkspaceBindings {
  control(): CanvasControlRuntime | null;
  creation(): CanvasCreationRuntime | null;
  project(): CanvasProjectRuntime | null;
  product(): CanvasProductRuntime | null;
}
export type CanvasAssetExecutor = (request: CanvasActionRequest, asset?: CanvasNode | CanvasNode[]) => CanvasResult;
export interface PendingControl<T> {
  control: CanvasActionHandler;
  getSnapshot(): T[];
  subscribe(listener: () => void): () => void;
  approve(id: string): Promise<void>;
  cancel(id: string): void;
  cancelSession(sessionId: string): void;
}
export interface GenerationBatch {
  id: string; projectId: string; sessionId: string; expiresAt: number;
  state: 'pending' | 'running' | 'finished' | 'cancelled';
  recovered?: boolean; authorizationId?: string; approvalMode?: 'confirm' | 'direct';
  items: Array<{ nodeId: string; title: string; model: string; parameters: string; count: number;
    references: string[]; dependsOn?: string[];
    state: 'pending' | 'submitted' | 'success' | 'failed' | 'unconfirmed' | 'stopped' }>;
}
export interface GenerationBudget {
  id: string; projectId: string; sessionId: string; state: 'pending' | 'approved' | 'revoked'; expiresAt: number;
  maxRequests: number; maxOutputs: number; budgetMicros: number | null; profiles: string[];
  usedRequests: number; usedOutputs: number; reservedMicros: number;
}
export interface ProjectRequest {
  id: string; sessionId: string; label: string; kind: 'delete' | 'deleteFolder' | 'export' | 'import';
  state: 'pending' | 'running' | 'completed' | 'unconfirmed' | 'cancelled';
}
export interface CanvasCreationControl extends Omit<PendingControl<GenerationBatch>, 'approve' | 'cancel'> {
  approve(id: string, authorizationId?: string, approvalMode?: 'confirm' | 'direct'): Promise<void>;
  cancel(id: string): Promise<void>;
  restore(projectId: string): Promise<void>;
  getError(): string;
}
export interface CanvasBudgetControl {
  control: CanvasActionHandler;
  getSnapshot(): GenerationBudget[];
  getError(): string;
  refresh(projectId: string): Promise<void>;
  subscribe(listener: () => void): () => void;
  approve(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
}
export interface AgentCanvasWorkspace {
  executor: CanvasAssetExecutor;
  creation: CanvasCreationControl;
  projects: PendingControl<ProjectRequest>;
  tasks: CanvasActionHandler;
  budgets: CanvasBudgetControl;
  products: PendingControl<ProductRequest>;
}
export interface AgentCanvasService {
  createWorkspace(bindings: CanvasWorkspaceBindings): AgentCanvasWorkspace;
}

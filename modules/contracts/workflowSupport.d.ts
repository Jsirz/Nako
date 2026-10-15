export type WorkflowPlan = Record<string, { class_type: string; inputs: Record<string, unknown>; _meta?: Record<string, unknown> }>;
export interface WorkflowAssetReference { projectId: string; type: string; assetId: string }
export interface WorkflowResolvedAsset extends WorkflowAssetReference {
  value: unknown;
  filePath: string;
  filename: string;
  bytes: number;
  disposeSnapshot?(): Promise<void>;
  [key: string]: unknown;
}
export interface WorkflowBindingRecord {
  definitionId: string;
  definitionRevision: number;
  executionPlanHash: string;
  bindings: Array<{
    id: string; key: string; label: string;
    target: { nodeId: string; fieldName: string; expectedClassType: string };
    control: { kind: string; options?: unknown[]; defaultValue?: unknown; [key: string]: unknown };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}
export interface WorkflowDeploymentRecord {
  definitionId: string; definitionRevision: number; executionPlanHash: string;
  runner: string;
  connection: { baseUrl?: string; remoteWebAppId?: string; [key: string]: unknown };
  relevantCapabilities: Record<string, unknown>;
  [key: string]: unknown;
}
export interface WorkflowOutputCandidate {
  nodeId: string; classType: string; outputKey: string; outputIndex: number;
  mediaKind: string; kind: 'file' | 'inline';
  handle?: { url?: string; filename: string; subfolder?: string; type?: string };
  value?: unknown;
}
export type WorkflowOutputSummary = Pick<WorkflowOutputCandidate, 'nodeId' | 'classType' | 'outputKey' | 'outputIndex' | 'mediaKind' | 'kind'>;
export interface WorkflowReceiptOutput extends WorkflowOutputSummary {
  assetId?: string; url?: string; value?: unknown; sha256?: string; bytes?: number;
}
export interface WorkflowReceipt {
  outputs: WorkflowReceiptOutput[];
  [key: string]: unknown;
}
export interface WorkflowCompilation {
  apiJson: WorkflowPlan;
  compiledPromptHash: string;
  resolvedValues: Record<string, unknown>;
  resolvedSeeds: Array<Record<string, unknown>>;
  seedAdvancements: Array<Record<string, unknown>>;
  assets: WorkflowResolvedAsset[];
  analysis: Record<string, unknown>;
}
export interface RunningHubWebAppInfo {
  nodeInfoList: Array<{ nodeId: string; fieldName: string; required?: boolean; fieldValue?: unknown; defaultValue?: unknown; value?: unknown; [key: string]: unknown }>;
  [key: string]: unknown;
}
export interface RunningHubOutput { fileUrl: string; fileType?: string; nodeId?: string; [key: string]: unknown }
export interface RunningHubWebAppClient {
  getWebAppInfo(id: string, options?: { signal?: AbortSignal }): Promise<RunningHubWebAppInfo>;
  uploadBuffer(data: Uint8Array, filename: string, options?: { signal?: AbortSignal }): Promise<{ fileName: string }>;
  createWebAppTask(input: { webAppId: string; nodeInfoList: Array<{ nodeId: string; fieldName: string; fieldValue: string }>; instanceType: string; signal?: AbortSignal }): Promise<{ taskId: string }>;
  getWebAppTaskOutputs(id: string, options?: { signal?: AbortSignal }): Promise<{ state: string; outputs?: RunningHubOutput[] }>;
  openOutput(handle: NonNullable<WorkflowOutputCandidate['handle']>, options?: { signal?: AbortSignal }): Promise<Response>;
}
/** Workflow algorithms and output transactions; exposes no plugin client or store instances. */
export interface WorkflowSupportService {
  compileBindings(input: {
    executionPlan: WorkflowPlan; bindingSet: WorkflowBindingRecord; deployment: WorkflowDeploymentRecord;
    projectId: string; values?: Record<string, unknown>;
    resolveAsset?(reference: WorkflowAssetReference, options: { binding: unknown; projectId: string }): Promise<WorkflowResolvedAsset>;
    generateRandomInteger?(minimum: number, maximum: number): number;
    seedResolutionCache?: Map<string, unknown>;
  }): Promise<WorkflowCompilation>;
  resolveBindingValues(bindingSet: WorkflowBindingRecord, values: Record<string, unknown>): Record<string, unknown>;
  classifyHistory(history: Record<string, unknown>, promptId: string): { state: string; entry: unknown; statusString?: string };
  historyOutputs(input: { history: Record<string, unknown>; promptId: string; executionPlan: WorkflowPlan }): WorkflowOutputCandidate[];
  availableHistoryOutputs(input: { history: Record<string, unknown>; promptId: string; executionPlan: WorkflowPlan }): WorkflowOutputCandidate[];
  outputCandidate(candidate: WorkflowOutputCandidate): WorkflowOutputSummary;
  comfyOutputPlan(plan: WorkflowPlan): WorkflowPlan;
  localizeOutputs(input: {
    candidates: WorkflowOutputCandidate[]; executionPlan: WorkflowPlan;
    client: { openOutput(handle: NonNullable<WorkflowOutputCandidate['handle']>, options?: { signal?: AbortSignal }): Promise<Response> };
    libraryDirectory: string; projectId: string; runId: string; signal?: AbortSignal;
    source?: string; model?: string; stagingDirectory?: string;
  }): Promise<{ outputs: WorkflowReceiptOutput[]; rollback(): Promise<void>; commit(): Promise<void> }>;
  validateReceipt(input: {
    coordinator: { getTask(runId: string): { kind?: string; outputBindingSetId?: string; outputBindingSetHash?: string } | null };
    configurationStore: { requireOutputBindingSet(id: string): Promise<{ outputBindingSetHash: string; outputs: Array<{ key: string; label?: string; primary?: boolean; mediaKind: string; selector: { nodeId: string; outputKey: string; outputIndex: number } }> }> };
    runId: string; receipt: WorkflowReceipt;
  }): Promise<void>;
  prepareWebAppCompatibility(deployment: WorkflowDeploymentRecord, client: { getWorkflowApiFormat(id: string): Promise<WorkflowPlan> }): Promise<{ workflowId: string; workflow: string } | null>;
  prepareUpload(asset: WorkflowResolvedAsset, options?: { maximumBytes?: number; targetBytes?: number; signal?: AbortSignal }): Promise<WorkflowResolvedAsset>;
  webAppProjection(id: string, info: RunningHubWebAppInfo): {
    snapshot: { fields: Array<{ nodeId: string; fieldName: string; kind: string; [key: string]: unknown }>; [key: string]: unknown };
    schemaHash: string; executionPlan: WorkflowPlan; executionPlanHash: string; nodeDefinitions: Record<string, unknown>;
  };
  readPageCover(baseUrl: string, id: string): Promise<string | null>;
  runningHubOutputs(outputs: RunningHubOutput[], plan: WorkflowPlan, options?: { defaultNodeId?: string; forceDefaultNodeId?: boolean }): WorkflowOutputCandidate[];
}
export const RUNNINGHUB_WEBAPP_OUTPUT_NODE_ID: 'nako_webapp_output';
export function workflowAssetKey(reference: Partial<WorkflowAssetReference>): string;

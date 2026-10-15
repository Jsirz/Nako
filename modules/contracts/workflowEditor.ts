export type OfficialWorkflow = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  inputs: string[];
  output: string;
  skillSlug: string;
  version: string;
  configured: boolean;
  definitionId?: string;
  sourceUrl?: string;
  coverUrl?: string;
};

export interface WorkflowDefinition {
  id: string;
  name: string;
  revision: number;
  sourceArtifacts: Array<{
    id: string;
    format: string;
    role: 'ui' | 'api';
    originalFilename: string;
    origin?: string;
  }>;
  executionPlan: null | { executionPlanHash: string };
  presentation?: {
    customCoverUrl?: string;
    categoryId?: string;
    updatedAt?: string;
  };
  description?: string;
  analysis?: { warnings?: Array<{ code: string; nodeId?: string }> };
}

export interface BindingCandidate {
  id: string;
  nodeId: string;
  classType: string;
  nodeTitle: string;
  fieldName: string;
  valueType: string;
  required: boolean;
  control: string;
  mediaKind?: string;
  hasDefault: boolean;
  optionCount: number;
  minimum?: number;
  maximum?: number;
  step?: number;
  minimumItems?: number;
  maximumItems?: number;
  capacity?: number;
}

export interface BindingSet {
  id: string;
  previousBindingSetId?: string | null;
  name: string;
  revision: number;
  bindings: Array<{
    id: string;
    key: string;
    label: string;
    description?: string;
    control: {
      kind: string;
      mediaKind?: string;
      required: boolean;
      minimum?: number;
      maximum?: number;
      step?: number;
      multiple?: boolean;
      minimumItems?: number;
      maximumItems?: number;
      capacity?: number;
      options: Array<{ id: string; label: string }>;
      hasDefault: boolean;
      defaultValue?: unknown;
    };
  }>;
}

export interface WorkflowRun {
  runId: string;
  runner?: 'local-comfyui' | 'runninghub-workflow' | 'runninghub-webapp';
  status: 'loading' | 'success' | 'failed' | 'cancelled' | 'unknown';
  phase: string;
  promptId?: string;
  code?: string;
  error?: string;
  remoteMayContinue?: boolean;
  createdAt?: string;
  updatedAt?: string;
  observationPausedAt?: string;
  observationWindowMs?: number;
  observationElapsedMs?: number;
  availableOutputs?: Array<{
    nodeId: string;
    classType: string;
    outputKey: string;
    outputIndex: number;
    mediaKind: string;
    kind: string;
  }>;
  currentNodeId?: string;
  progress?: {
    value: number;
    maximum: number;
    currentNodeId?: string;
  };
  realtimeChannel?: 'websocket' | 'history-fallback';
  cachedNodeIds?: string[];
  nodeErrors?: Array<{
    nodeId: string;
    errorType: string;
    message: string;
  }>;
  resolvedSeeds?: Array<{
    bindingKey: string;
    seedPolicy: 'fixed' | 'random' | 'increment' | 'decrement';
    resolvedSeed: number;
  }>;
  seedAdvancements?: WorkflowSeedAdvancement[];
  definitionId?: string;
  deploymentId?: string;
  bindingSetId?: string;
  projectId?: string;
  inputCleanup?: {
    state: string;
    totalBytes: number;
    retryable: boolean;
    updatedAt?: string;
  };
  receipt?: {
    receiptHash: string;
    succeededAt: string;
    seeds?: Array<{
      bindingKey: string;
      seedPolicy: 'fixed' | 'random' | 'increment' | 'decrement';
      resolvedSeed: number;
    }>;
    outputs: Array<Record<string, unknown>>;
  };
}

export interface WorkflowSeedAdvancement {
  bindingKey: string;
  mode: 'increment' | 'decrement';
  previousValue: number;
  nextValue: number;
  step: number;
}

export interface WorkflowDeploymentDto {
  id: string;
  runner?: 'local-comfyui' | 'runninghub-workflow' | 'runninghub-webapp';
  serverUrl?: string;
  comfyuiVersion?: string;
  baseUrl?: string;
  credentialRef?: 'runninghub-cn' | 'runninghub-global';
  remoteWorkflowId?: string;
  remoteWebAppId?: string;
  instanceType?: string;
  includeWorkflowJson?: boolean;
  apiRevision?: string;
  supportsCancellation?: boolean;
  timeoutMs?: number;
  nodeTypeCount: number;
  createdAt: string;
}

export interface OutputCandidate {
  id: string;
  nodeId: string;
  classType: string;
  outputKey: string;
  outputIndex: number;
  mediaKind: string;
  kind?: 'file' | 'inline';
  category?: 'result' | 'metadata';
  selectable?: boolean;
  displayName?: string;
  description?: string;
  valuePreview?: string;
  assetId?: string;
}

export interface WorkflowOutputBindingSet {
  id: string;
  sourceRunId: string;
  outputs: Array<{
    key: string;
    label: string;
    primary: boolean;
    mediaKind: string;
    selector: { nodeId: string; outputKey: string; outputIndex: number };
  }>;
}

export interface WorkflowAttestation {
  id: string;
  definitionId: string;
  definitionRevision: number;
  executionPlanHash: string;
  bindingSetId: string;
  outputBindingSetId: string;
  deploymentId: string;
  runId: string;
  attestationHash: string;
  succeededAt: string;
  createdAt: string;
}

export interface WorkflowEditorSnapshot {
  definition: WorkflowDefinition;
  deployment: WorkflowDeploymentDto | null;
  candidates: BindingCandidate[];
  bindingSet: BindingSet | null;
  attestation: WorkflowAttestation | null;
  verifiedRun: WorkflowRun | null;
  verifiedOutputCandidates: OutputCandidate[];
  outputBindingSet: WorkflowOutputBindingSet | null;
}

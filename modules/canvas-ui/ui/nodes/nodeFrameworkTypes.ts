import type { NodeRegistry } from '../../../kernel/nodeRegistry';
import type { NodePackage } from '../../../contracts/nodeSdk.js';
export type NodeMediaType = 'text' | 'image' | 'video' | 'audio' | 'json' | 'any';
export type NodeCategory = 'generation' | 'asset' | 'tool' | 'workflow' | 'utility';
export type NodeLifecycleStatus =
  'idle' | 'queued' | 'loading' | 'success' | 'error' | 'cancelled' | 'timed-out' | 'stale';

export interface PortDefinition {
  id: string;
  media: NodeMediaType[];
  required?: boolean;
  multiple?: boolean;
  maximum?: number;
}

export interface NodeDefinition {
  capabilities?: string[];
  type: string;
  category: NodeCategory;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  initialStatus: NodeLifecycleStatus;
  version?: string;
  title?: string;
  description?: string;
  pluginId?: string;
  parameters?: Record<string, unknown>;
  render?: { kind: 'native' | 'generic' | 'iframe' | 'missing'; component?: string; entry?: string };
  executor?: { method: string; transport?: 'rpc'; timeoutMs?: number };
}

export interface NodeResult {
  mediaType?: Exclude<NodeMediaType, 'any'>;
  url?: string;
  urls?: string[];
  text?: string;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface NodeResultRecord extends NodeResult {
  id: string;
  generationId: string;
}

export interface NodeParameterOption {
  label: string;
  value: string | number | boolean;
}

export interface ModelAdvancedParameter {
  key: string;
  label: string;
  type: 'select' | 'toggle' | 'number' | 'text';
  default?: unknown;
  options?: NodeParameterOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface NodeModelCapability {
  name: string;
  maxInputs?: number;
  supportedReferenceTypes?: NodeMediaType[];
  resolutions?: string[];
  aspectRatios?: string[];
  advancedParams?: ModelAdvancedParameter[];
}

export interface NodeInputReference {
  id: string;
  slotId: string;
  media: Exclude<NodeMediaType, 'any'>;
}

export interface NodeInputIssue {
  code:
    | 'REQUIRED_INPUT_MISSING'
    | 'SLOT_CAPACITY_EXCEEDED'
    | 'SLOT_MEDIA_UNSUPPORTED'
    | 'MODEL_INPUT_LIMIT_EXCEEDED'
    | 'MODEL_MEDIA_UNSUPPORTED'
    | 'UNKNOWN_INPUT_SLOT';
  message: string;
  slotId?: string;
  inputId?: string;
}

export interface NodeInputValidation {
  valid: boolean;
  counts: Partial<Record<Exclude<NodeMediaType, 'any'>, number>>;
  issues: NodeInputIssue[];
}

export interface NodeParameterField {
  key: string;
  label: string;
  kind: 'model' | 'select' | 'ratio' | 'toggle' | 'number' | 'text';
  value: unknown;
  options?: NodeParameterOption[];
  min?: number;
  max?: number;
  step?: number;
  advanced?: boolean;
}

export interface StableNodeRecord {
  id: string;
  type: string;
  x: number;
  y: number;
  parentIds?: string[];
  pluginId?: string;
  nodeVersion?: string;
  missingNode?: boolean;
  inputLinks?: Array<{ sourceNodeId: string; sourcePortId: string; targetPortId: string }>;
  [key: string]: unknown;
}

export interface NodeState extends StableNodeRecord {
  status?: NodeLifecycleStatus | (string & {});
  result?: NodeResult;
  errorMessage?: string;
  errorDetails?: { code: string; message: string; retryable: boolean };
  generationId?: string;
  generationQueuedAt?: number;
  generationStartedAt?: number;
  generationCompletedAt?: number;
  resultHistory?: NodeResultRecord[];
  activeResultId?: string;
  collapsed?: boolean;
}

export interface NodePresentation {
  width: number;
  height: number;
  expandedHeight: number;
  collapsed: boolean;
  preview: {
    kind: Exclude<NodeMediaType, 'any'> | 'none';
    source?: string;
    available: boolean;
  };
  error: {
    visible: boolean;
    code?: string;
    message?: string;
    retryable: boolean;
  };
}

export interface NodeGenerationUpdate {
  generationId: string;
  status: Exclude<NodeLifecycleStatus, 'idle' | 'queued'>;
  startedAt?: number;
  completedAt?: number;
  result?: NodeResult;
  error?: { code: string; message: string; retryable: boolean };
}

export interface NodeFrameworkAdapter {
  getDefinition(type: string, owner?: string): NodeDefinition | undefined;
  listDefinitions(): NodeDefinition[];
  register(definition: NodeDefinition): void;
  registerPackage(nodePackage: NodePackage, owner?: string): () => boolean;
  getRegistry(): NodeRegistry;
  create(candidate: Record<string, unknown>): StableNodeRecord;
  createFresh(candidate: Record<string, unknown>): StableNodeRecord;
  validate(node: Record<string, unknown>): string[];
  buildParameterForm(options: {
    models: NodeModelCapability[];
    selectedModel?: string;
    values?: Record<string, unknown>;
  }): NodeParameterField[];
  validateInputs(options: {
    ports: PortDefinition[];
    inputs: NodeInputReference[];
    model?: NodeModelCapability;
  }): NodeInputValidation;
  beginGeneration(
    node: NodeState,
    options: {
      generationId: string;
      queuedAt?: number;
    },
  ): NodeState;
  updateGeneration(
    node: NodeState,
    update: NodeGenerationUpdate,
  ): {
    node: NodeState;
    applied: boolean;
  };
  selectResult(node: NodeState, resultId: string): NodeState;
  setCollapsed(node: NodeState, collapsed: boolean): NodeState;
  getPresentation(node: NodeState): NodePresentation;
  getDiagnostics(): { createCalls: number; validationFailures: number; definitionCount: number };
}

declare global {
  interface Window {
    __NAKO_NODE_FRAMEWORK__?: NodeFrameworkAdapter;
    __NAKO_NODE_REGISTRY__?: NodeRegistry;
  }
}

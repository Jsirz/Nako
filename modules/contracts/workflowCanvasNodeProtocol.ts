import type {
  RunningHubInstanceType,
  WorkflowCanvasBlueprint,
  WorkflowCanvasMediaKind,
} from './workflowCanvas';
import type { WorkflowRun, WorkflowSeedAdvancement } from './workflowEditor';
export type WorkflowSourceCanvasNode = Record<string, unknown> & { id: string; type: string };
export type WorkflowCanvasNodePatch = Partial<WorkflowCanvasNodeRecord>;
export interface WorkflowRunScope {
  isCurrent(): boolean;
  getNode?(): WorkflowCanvasNodeRecord;
}
export interface WorkflowCanvasOutputValue {
  portId: string;
  label: string;
  mediaKind: WorkflowCanvasMediaKind;
  primary: boolean;
  assetId?: string;
  url?: string;
  value?: unknown;
  sha256?: string;
  bytes?: number;
}

export interface WorkflowCanvasNodeRecord {
  coverUrl?: string | null;
  id: string;
  type: 'ComfyUI';
  kind: 'workflow';
  comfyMode: 'nako-workflow';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  executionTarget: 'local' | 'cloud';
  canvasNodeHash: string;
  workflowRef: WorkflowCanvasBlueprint['workflowRef'];
  inputPorts: WorkflowCanvasBlueprint['inputPorts'];
  outputPorts: WorkflowCanvasBlueprint['outputPorts'];
  parameterSchema: WorkflowCanvasBlueprint['parameterSchema'];
  parameterValues: Record<string, unknown>;
  parentIds: string[];
  sourcePortIndices: number[];
  status: string;
  executionState: Record<string, unknown>;
  workflowOutputs: WorkflowCanvasOutputValue[];
  resultUrl?: string;
  resultUrls?: string[];
  resultText?: string;
  resultHistory?: Array<Record<string, unknown>>;
  errorMessage?: string;
  errorSummary?: string;
  isWorkflowErrorDetailsOpen?: boolean;
  runningHubInstanceType?: RunningHubInstanceType;
  [key: string]: unknown;
}

export interface WorkflowCanvasInputSlot {
  id: string;
  bindingKey: string;
  label: string;
  mediaKind: WorkflowCanvasMediaKind;
  required: boolean;
  slotIndex: number;
  itemIndex: number;
  multiple: boolean;
  source: 'input-port' | 'parameter';
  placeholder?: boolean;
}

export interface WorkflowCanvasExampleInsertion {
  nodes: WorkflowSourceCanvasNode[];
  selectedNodeIds: string[];
  restoredExample: boolean;
}

export interface WorkflowVerifiedCanvasInsertion {
  run: WorkflowRun;
  projectId: string;
  values: Record<string, unknown>;
}

export interface WorkflowCanvasInsertionResult {
  requestId: string;
  nodeIds: string[];
  workflowNodeId: string;
}

export interface WorkflowCanvasUploadedInputNode {
  id: string;
  type: 'Upload Image' | 'Upload Video' | 'Upload Audio';
  x: number;
  y: number;
  title: string;
  prompt: string;
  status: 'success';
  progress: 100;
  resultUrl: string;
  assetId: string;
  projectId: string;
  model: 'Upload';
  aspectRatio: string;
  resolution: string;
}

export interface WorkflowCanvasNodesAdapter {
  applySeedAdvancements(
    values: Record<string, unknown>,
    advancements: readonly WorkflowSeedAdvancement[] | undefined,
  ): Record<string, unknown>;
  createNode(
    blueprint: WorkflowCanvasBlueprint,
    position?: { x?: number; y?: number },
  ): WorkflowCanvasNodeRecord;
  updateNode(
    node: WorkflowCanvasNodeRecord,
    blueprint: WorkflowCanvasBlueprint,
  ): WorkflowCanvasNodeRecord;
  reconcileNode(node: WorkflowCanvasNodeRecord): Promise<WorkflowCanvasNodeRecord | null>;
  addToCanvas(
    blueprint: WorkflowCanvasBlueprint,
    verified?: WorkflowVerifiedCanvasInsertion,
  ): Promise<WorkflowCanvasInsertionResult>;
  captureExample(nodes: readonly WorkflowSourceCanvasNode[], workflowNodeId: string): boolean;
  hasExample(definitionId: string): boolean;
  instantiateExample(
    blueprint: WorkflowCanvasBlueprint,
    position?: { x?: number; y?: number },
    sourceNodes?: readonly WorkflowSourceCanvasNode[],
  ): WorkflowCanvasExampleInsertion;
  instantiateVerifiedRun(
    blueprint: WorkflowCanvasBlueprint,
    verified: WorkflowVerifiedCanvasInsertion,
    position?: { x?: number; y?: number },
  ): WorkflowCanvasExampleInsertion;
  uploadInputAsset(
    node: WorkflowCanvasNodeRecord,
    slotIndex: number,
    file: File,
    projectId: string,
  ): Promise<WorkflowCanvasUploadedInputNode>;
  getInputSlots(node: WorkflowSourceCanvasNode): WorkflowCanvasInputSlot[];
  getInputCapacity(node: WorkflowSourceCanvasNode): number;
  getInputLimitNotice(node: WorkflowSourceCanvasNode): string | undefined;
  getErrorSummary(node: WorkflowSourceCanvasNode): string;
  getInputPortY(node: WorkflowSourceCanvasNode, portIndex: number): number;
  getOutputPortY(node: WorkflowSourceCanvasNode, portIndex: number): number;
  getMediaKindLabel(mediaKind: WorkflowCanvasMediaKind): string;
  resolveAvailableInputSlot(
    target: WorkflowSourceCanvasNode,
    source: WorkflowSourceCanvasNode,
    sourcePortIndex?: number,
  ): number;
  getConnectionLimitNotice(
    target: WorkflowSourceCanvasNode,
    source: WorkflowSourceCanvasNode,
    sourcePortIndex?: number,
  ): string | undefined;
  resolvePortIndex(node: WorkflowSourceCanvasNode, side: 'left' | 'right', localY: number): number;
  getNodeSize(node: WorkflowSourceCanvasNode): { width: number; height: number };
  getOutputMediaKind(
    node: WorkflowSourceCanvasNode,
    portIndex?: number,
  ): WorkflowCanvasMediaKind | undefined;
  getPrimaryMediaKind(node: WorkflowSourceCanvasNode): WorkflowCanvasMediaKind | undefined;
  canConnect(
    target: WorkflowSourceCanvasNode,
    source: WorkflowSourceCanvasNode,
    targetPortIndex: number,
    sourcePortIndex?: number,
  ): boolean;
  run(
    node: WorkflowCanvasNodeRecord,
    connectedNodes: readonly WorkflowSourceCanvasNode[],
    projectId: string,
    onPatch: (patch: WorkflowCanvasNodePatch) => void,
    scope?: WorkflowRunScope,
  ): Promise<WorkflowRun>;
  resume(
    node: WorkflowCanvasNodeRecord,
    onPatch: (patch: WorkflowCanvasNodePatch) => void,
    scope?: WorkflowRunScope,
    continuePaused?: boolean,
  ): Promise<WorkflowRun | null>;
  cancel(
    node: WorkflowCanvasNodeRecord,
    onPatch: (patch: WorkflowCanvasNodePatch) => void,
    scope?: WorkflowRunScope,
  ): Promise<WorkflowRun | null>;
}

export type WorkflowCanvasMediaKind = 'image' | 'mask' | 'video' | 'audio' | 'text' | 'json';
export type RunningHubInstanceType = 'default' | 'plus';

export interface WorkflowCanvasBlueprint {
  coverUrl?: string | null;
  schemaVersion: 1;
  kind: 'workflow';
  type: 'Workflow';
  title: string;
  subtitle: string;
  executionTarget?: 'local' | 'cloud';
  runningHubInstanceType?: RunningHubInstanceType;
  canvasNodeHash: string;
  workflowRef: {
    verificationStatus?: 'draft' | 'verified';
    definitionId: string;
    definitionRevision: number;
    executionPlanHash: string;
    bindingSetId: string;
    bindingSetHash: string;
    outputBindingSetId?: string;
    outputBindingSetHash?: string;
    deploymentId: string;
    deploymentSnapshotHash: string;
    relevantCapabilityHash: string;
    attestationId?: string;
    attestationHash?: string;
  };
  inputPorts: Array<{
    id: string;
    bindingId: string;
    label: string;
    mediaKind: WorkflowCanvasMediaKind;
    required: boolean;
    multiple: boolean;
    maximumItems: number;
    portIndex: number;
  }>;
  outputPorts: Array<{
    id: string;
    label: string;
    mediaKind: WorkflowCanvasMediaKind;
    primary: boolean;
    portIndex: number;
    selector: { nodeId: string; outputKey: string; outputIndex: number };
  }>;
  parameterSchema: Array<{
    key: string;
    bindingId: string;
    label: string;
    description?: string;
    control: {
      kind: string;
      required: boolean;
      minimum?: number;
      maximum?: number;
      step?: number;
      options: Array<{ id: string; label: string }>;
      hasDefault: boolean;
      defaultValue?: unknown;
    };
    presentation?: { section?: string; order?: number; advanced?: boolean };
  }>;
  parameterValues: Record<string, unknown>;
  executionState: { status: 'idle' };
  ui: { width: number; height: number; collapsed: boolean };
}

import type {
  BindingCandidate,
  BindingSet,
  OfficialWorkflow,
  OutputCandidate,
  WorkflowAttestation,
  WorkflowDefinition,
  WorkflowDeploymentDto,
  WorkflowRun,
} from './workflowManagerClient';
export type StageIndex = 0 | 1 | 2 | 3 | 4;

export interface WorkflowManagerOptions {
  definitionId?: string;
  nodeId?: string;
  initialNodeTitle?: string;
  initialStage?: StageIndex;
  initialView?: 'library' | 'manager';
  mode?: 'settings' | 'dialog';
  scope?: 'local' | 'cloud' | 'all';
  compactCloud?: boolean;
}

export interface DeployedWorkflowRecord {
  definition: WorkflowDefinition;
  attestation?: WorkflowAttestation;
  deployment?: WorkflowDeploymentDto;
  bindingSet?: BindingSet;
  automaticCover?: {
    url: string;
    mediaKind: 'image' | 'video';
  };
  verifiedRun?: WorkflowRun;
  verifiedProjectId?: string;
  verifiedValues?: Record<string, unknown>;
}

export interface ManagerState {
  definitions: WorkflowDefinition[];
  deployedRecords: DeployedWorkflowRecord[];
  selected?: WorkflowDefinition;
  deployment?: WorkflowDeploymentDto;
  candidates: BindingCandidate[];
  bindingSet?: BindingSet;
  projects: Array<{ id: string; title: string; updatedAt: string }>;
  projectId?: string;
  nodeTitle: string;
  values: Record<string, unknown>;
  run?: WorkflowRun;
  outputCandidates: OutputCandidate[];
  outputBindingSetId?: string;
  attestation?: WorkflowAttestation;
  verifiedRun?: WorkflowRun;
  verifiedOutputCandidates: OutputCandidate[];
  activeStage: StageIndex;
  cleanupGrantId?: string;
  deploymentRunner: 'local-comfyui' | 'runninghub-workflow' | 'runninghub-webapp';
  pollingPaused?: boolean;
  discovered?: {
    label: string;
    candidates: Array<{ relativePath: string; byteLength: number; file: File }>;
  };
}

export type WorkflowManagerSession = {
  uploadMode: 'quick' | 'new' | 'append';
  pollToken: number;
  managerView: 'library' | 'manager';
  libraryRunnerScope: 'local' | 'cloud';
  librarySection: 'official' | 'mine';
  officialWorkflows: OfficialWorkflow[];
  officialError: string;
  officialLoaded: boolean;
  libraryCloudImport: boolean;
  officialConnection: OfficialWorkflow | null;
  projectsLoaded: boolean;
  libraryReadFailures: WorkflowDefinition[];
  requestedDefinitionState: 'loading' | 'ready' | 'error';
  requestedDefinitionError: string;
};

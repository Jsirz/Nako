import type { RunningHubInstanceType, WorkflowCanvasBlueprint } from './workflowCanvas';
import type {
  BindingCandidate,
  BindingSet,
  OfficialWorkflow,
  OutputCandidate,
  WorkflowAttestation,
  WorkflowDefinition,
  WorkflowDeploymentDto,
  WorkflowEditorSnapshot,
  WorkflowOutputBindingSet,
  WorkflowRun,
} from './workflowEditor';
export interface WorkflowManagerClient {
  listDefinitions(): Promise<WorkflowDefinition[]>;
  getDefinition(definitionId: string): Promise<WorkflowDefinition>;
  getEditorSnapshot(definitionId: string): Promise<WorkflowEditorSnapshot>;
  deleteDefinition(definitionId: string): Promise<{
    id: string;
    deletedAt: string;
    alreadyDeleted: boolean;
  }>;
  updateDefinitionPresentation(
    definitionId: string,
    input: { name?: string; customCoverUrl?: string | null },
  ): Promise<WorkflowDefinition>;
  importArtifact(input: { file: File; definitionId?: string }): Promise<WorkflowDefinition>;
  chooseDirectory(purpose?: 'comfy-input-cleanup'): Promise<{
    id: string;
    label: string;
    purpose: string;
  }>;
  pairArtifacts(
    definitionId: string,
    uiArtifactId: string,
    apiArtifactId: string,
  ): Promise<{
    definition: WorkflowDefinition;
  }>;
  createDeployment(
    definitionId: string,
    input: {
      runner?: 'local-comfyui' | 'runninghub-workflow' | 'runninghub-webapp';
      serverUrl?: string;
      baseUrl?: string;
      credentialRef?: 'runninghub-cn' | 'runninghub-global';
      remoteWorkflowId?: string;
      remoteWebAppId?: string;
      includeWorkflowJson?: boolean;
      instanceType?: string;
      timeoutMs: number;
      inputCleanupGrantId?: string;
    },
  ): Promise<{
    deployment: WorkflowDeploymentDto;
    candidates: BindingCandidate[];
    outputs: unknown[];
  }>;
  listDeployments(definitionId: string): Promise<WorkflowDeploymentDto[]>;
  listBindingCandidates(definitionId: string, deploymentId: string): Promise<BindingCandidate[]>;
  createBindingSet(
    definitionId: string,
    input: {
      deploymentId: string;
      previousBindingSetId?: string;
      name: string;
      bindings: Array<{ candidateId: string; key: string; label: string }>;
    },
  ): Promise<BindingSet>;
  listBindingSets(definitionId: string): Promise<BindingSet[]>;
  preflight(
    definitionId: string,
    input: Record<string, unknown>,
  ): Promise<{
    ok: boolean;
    checks: Array<{ code: string; status: string; message: string }>;
    compiledPromptHash: string;
  }>;
  startRun(definitionId: string, input: Record<string, unknown>): Promise<WorkflowRun>;
  getRun(runId: string): Promise<WorkflowRun>;
  cancelRun(runId: string): Promise<WorkflowRun>;
  continueObservation(runId: string): Promise<WorkflowRun>;
  retryInputCleanup(
    runId: string,
    input?: { confirmRemoteStopped?: boolean },
  ): Promise<{
    runId: string;
    state: string;
    totalBytes: number;
    updatedAt?: string;
  }>;
  listOutputCandidates(definitionId: string, runId: string): Promise<OutputCandidate[]>;
  listOutputBindingSets(definitionId: string): Promise<WorkflowOutputBindingSet[]>;
  createOutputBindingSet(
    definitionId: string,
    input: Record<string, unknown>,
  ): Promise<{
    id: string;
    outputBindingSetHash: string;
  }>;
  createAttestation(
    definitionId: string,
    input: Record<string, unknown>,
  ): Promise<WorkflowAttestation>;
  listAttestations(definitionId: string): Promise<WorkflowAttestation[]>;
  createCanvasNode(
    definitionId: string,
    input: {
      attestationId?: string;
      deploymentId?: string;
      bindingSetId?: string;
      title?: string;
    },
  ): Promise<WorkflowCanvasBlueprint>;
  startCanvasRun(
    definitionId: string,
    input: {
      attestationId?: string;
      deploymentId?: string;
      bindingSetId?: string;
      canvasNodeHash: string;
      projectId: string;
      values: Record<string, unknown>;
      confirmExecution: true;
      confirmPaidExecution?: true;
      instanceType?: RunningHubInstanceType;
    },
  ): Promise<WorkflowRun>;
  listProjects(): Promise<Array<{ id: string; title: string; updatedAt: string }>>;
  listAssets(
    projectId: string,
    mediaKind: string,
  ): Promise<
    Array<{
      id: string;
      filename?: string;
      url?: string;
      type: string;
    }>
  >;
  uploadAsset(
    projectId: string,
    mediaKind: string,
    file: File,
  ): Promise<{
    id: string;
    filename?: string;
    url?: string;
    type: string;
  }>;
  trashAsset(
    projectId: string,
    mediaKind: string,
    assetId: string,
  ): Promise<{
    success: true;
    deletedCount: number;
    batchId: string;
    recoverable: true;
  }>;
  getRunningHubCredentialStatus(): Promise<{
    cnConfigured: boolean;
    globalConfigured: boolean;
  }>;
  saveRunningHubCredentials(input: { cnApiKey?: string; globalApiKey?: string }): Promise<void>;
  validateRunningHubCredential(credentialRef: 'runninghub-cn' | 'runninghub-global'): Promise<{
    valid: true;
    credentialRef: 'runninghub-cn' | 'runninghub-global';
    site: 'cn' | 'global';
    currency: string;
    apiType: string;
  }>;
  listOfficialWorkflows(): Promise<OfficialWorkflow[]>;
  addOfficialWorkflow(id: string): Promise<RunningHubWebAppCard>;
  listRunningHubWebApps(): Promise<RunningHubWebAppLibrary>;
  createRunningHubWebApp(input: {
    webAppId: string;
    credentialRef: 'runninghub-cn' | 'runninghub-global';
    categoryId?: string;
    title?: string;
    description?: string;
    instanceType?: string;
  }): Promise<RunningHubWebAppCard>;
  deleteRunningHubWebApp(definitionId: string): Promise<unknown>;
  createRunningHubWebAppCategory(name: string): Promise<RunningHubWebAppCategory>;
  deleteRunningHubWebAppCategory(categoryId: string): Promise<unknown>;
}

export type WorkflowCanvasClient = Pick<
  WorkflowManagerClient,
  | 'createCanvasNode'
  | 'startCanvasRun'
  | 'getRun'
  | 'cancelRun'
  | 'continueObservation'
  | 'listBindingSets'
>;

export type RunningHubWebAppClient = Pick<
  WorkflowManagerClient,
  | 'getRunningHubCredentialStatus'
  | 'saveRunningHubCredentials'
  | 'validateRunningHubCredential'
  | 'listRunningHubWebApps'
  | 'createRunningHubWebApp'
  | 'deleteRunningHubWebApp'
  | 'createRunningHubWebAppCategory'
  | 'deleteRunningHubWebAppCategory'
>;

export interface RunningHubWebAppCategory {
  id: string;
  name: string;
  order: number;
}

export interface RunningHubWebAppCard {
  coverUrl?: string;
  id: string;
  definitionId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  webAppId: string;
  credentialRef: 'runninghub-cn' | 'runninghub-global';
  site: 'cn' | 'global';
  fieldCount: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RunningHubWebAppLibrary {
  categories: RunningHubWebAppCategory[];
  apps: RunningHubWebAppCard[];
}

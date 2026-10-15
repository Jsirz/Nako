import { desktopBrowser } from '../../../kernel/browser';

import type { WorkflowManagerClient } from '../../../contracts/workflowClient';
import type {
  OfficialWorkflow,
  WorkflowDefinition,
  WorkflowRun,
} from '../../../contracts/workflowEditor';
import { fileToBase64, mediaAssetType, mediaContentType, request } from './workflowClientTransport';
export type {
  RunningHubInstanceType,
  WorkflowCanvasBlueprint,
  WorkflowCanvasMediaKind,
} from '../../../contracts/workflowCanvas';
export type {
  RunningHubWebAppCard,
  RunningHubWebAppCategory,
  RunningHubWebAppClient,
  RunningHubWebAppLibrary,
  WorkflowCanvasClient,
  WorkflowManagerClient,
} from '../../../contracts/workflowClient';
export type {
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
  WorkflowSeedAdvancement,
} from '../../../contracts/workflowEditor';
export function createWorkflowManagerClient(fetcher: typeof fetch = fetch): WorkflowManagerClient {
  const api = <T>(path: string, init: RequestInit = {}) => request<T>(path, init, fetcher);
  const libraryPath = (definitionId: string, suffix = '') =>
    `/api/workflow-library/${encodeURIComponent(definitionId)}${suffix}`;
  const pendingRunKeys = new Map<string, string>();
  async function startIdempotentRun(
    path: string,
    logicalNamespace: string,
    definitionId: string,
    input: Record<string, unknown>,
  ): Promise<WorkflowRun> {
    const logicalRequest = `${logicalNamespace}\n${definitionId}\n${JSON.stringify(input)}`;
    const idempotencyKey = pendingRunKeys.get(logicalRequest) || crypto.randomUUID();
    pendingRunKeys.set(logicalRequest, idempotencyKey);
    try {
      const run = await api<WorkflowRun>(path, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(input),
      });
      pendingRunKeys.delete(logicalRequest);
      return run;
    } catch (error) {
      const status = (error as { status?: unknown })?.status;
      // A received 4xx is a definitive server-side rejection. A transport
      // error, invalid 202 body, or 5xx may have happened after admission, so
      // keep the same key for the user's retry and let the server reconcile.
      if (typeof status === 'number' && status >= 400 && status < 500) {
        pendingRunKeys.delete(logicalRequest);
      }
      throw error;
    }
  }
  return {
    listDefinitions: () => api('/api/workflow-library'),
    getDefinition: (definitionId) => api(libraryPath(definitionId)),
    getEditorSnapshot: (definitionId) => api(libraryPath(definitionId, '/editor-snapshot')),
    deleteDefinition: (definitionId) =>
      api(libraryPath(definitionId), {
        method: 'DELETE',
      }),
    updateDefinitionPresentation: (definitionId, input) =>
      api(libraryPath(definitionId, '/presentation'), {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    async importArtifact({ file, definitionId }) {
      const result = await api<WorkflowDefinition | { definition: WorkflowDefinition }>(
        '/api/workflow-library/import',
        {
          method: 'POST',
          body: JSON.stringify({
            contentBase64: await fileToBase64(file),
            originalFilename: file.name,
            ...(definitionId ? { definitionId } : {}),
          }),
        },
      );
      return 'definition' in result ? result.definition : result;
    },
    chooseDirectory: (purpose = 'comfy-input-cleanup') =>
      api('/api/workflow-library/directory-grants', {
        method: 'POST',
        body: JSON.stringify({ purpose }),
      }),
    pairArtifacts: (definitionId, uiArtifactId, apiArtifactId) =>
      api(libraryPath(definitionId, '/pair'), {
        method: 'POST',
        body: JSON.stringify({ uiArtifactId, apiArtifactId }),
      }),
    createDeployment: (definitionId, input) =>
      api(libraryPath(definitionId, '/deployments'), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listDeployments: (definitionId) => api(libraryPath(definitionId, '/deployments')),
    listBindingCandidates: (definitionId, deploymentId) =>
      api(
        `${libraryPath(definitionId, '/binding-candidates')}?deploymentId=${encodeURIComponent(deploymentId)}`,
      ),
    createBindingSet: (definitionId, input) =>
      api(libraryPath(definitionId, '/binding-sets'), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listBindingSets: (definitionId) => api(libraryPath(definitionId, '/binding-sets')),
    preflight: (definitionId, input) =>
      api(libraryPath(definitionId, '/preflight'), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    startRun: (definitionId, input) =>
      startIdempotentRun(
        libraryPath(definitionId, '/test-runs'),
        'workflow-test',
        definitionId,
        input,
      ),
    getRun: (runId) => api(`/api/workflow-runs/${encodeURIComponent(runId)}`),
    cancelRun: (runId) =>
      api(`/api/workflow-runs/${encodeURIComponent(runId)}/cancel`, {
        method: 'POST',
        body: '{}',
      }),
    continueObservation: (runId) =>
      api(`/api/workflow-runs/${encodeURIComponent(runId)}/continue-observation`, {
        method: 'POST',
        body: '{}',
      }),
    retryInputCleanup: (runId, input = {}) =>
      api(`/api/workflow-runs/${encodeURIComponent(runId)}/retry-input-cleanup`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listOutputCandidates: (definitionId, runId) =>
      api(
        libraryPath(definitionId, `/workflow-runs/${encodeURIComponent(runId)}/output-candidates`),
      ),
    listOutputBindingSets: (definitionId) => api(libraryPath(definitionId, '/output-binding-sets')),
    createOutputBindingSet: (definitionId, input) =>
      api(libraryPath(definitionId, '/output-binding-sets'), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    createAttestation: (definitionId, input) =>
      api(libraryPath(definitionId, '/attestations'), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listAttestations: (definitionId) => api(libraryPath(definitionId, '/attestations')),
    createCanvasNode: (definitionId, input) =>
      api(libraryPath(definitionId, '/canvas-nodes'), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    startCanvasRun: (definitionId, input) =>
      startIdempotentRun(
        libraryPath(definitionId, '/canvas-runs'),
        'workflow-node',
        definitionId,
        input,
      ),
    ...createWorkflowLibraryClient(api),
  };
}

function createWorkflowLibraryClient(
  api: <T>(path: string, init?: RequestInit) => Promise<T>,
): Pick<WorkflowManagerClient,
  'listProjects' | 'listAssets' | 'uploadAsset' | 'trashAsset' |
  'getRunningHubCredentialStatus' | 'saveRunningHubCredentials' | 'validateRunningHubCredential' |
  'listRunningHubWebApps' | 'listOfficialWorkflows' | 'addOfficialWorkflow' |
  'createRunningHubWebApp' | 'deleteRunningHubWebApp' |
  'createRunningHubWebAppCategory' | 'deleteRunningHubWebAppCategory'
> {
  return {
    listProjects: () => api('/api/workflows'),
    listAssets: async (projectId, mediaKind) => {
      const type = mediaAssetType(mediaKind);
      const result = await api<
        Array<{ id: string; type: string }> | { assets: Array<{ id: string; type: string }> }
      >(`/api/assets/${type}?projectId=${encodeURIComponent(projectId)}`);
      return Array.isArray(result) ? result : result.assets;
    },
    async uploadAsset(projectId, mediaKind, file) {
      const type = mediaAssetType(mediaKind);
      const path = desktopBrowser().localFilePath(file);
      const result = await api<{
        asset: { id: string; filename?: string; url?: string; type: string };
      }>(
        path ? `/api/assets/import/${type}` : `/api/assets/upload/${type}`,
        path
          ? { method: 'POST', body: JSON.stringify({ path, projectId, filename: file.name }) }
          : {
              method: 'POST',
              headers: {
                'Content-Type': mediaContentType(file, mediaKind),
                'X-Filename': encodeURIComponent(file.name),
                'X-Project-Id': projectId,
              },
              ...desktopBrowser().fileUploadBody(file),
            },
      );
      return result.asset;
    },
    trashAsset: (projectId, mediaKind, assetId) => {
      const type = mediaAssetType(mediaKind);
      return api(
        `/api/assets/${type}/${encodeURIComponent(assetId)}/trash?projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    },
    async getRunningHubCredentialStatus() {
      const keys = await api<Record<string, string>>('/api/config/keys');
      return {
        cnConfigured: keys.RUNNINGHUB_API_KEY === '********',
        globalConfigured: keys.RUNNINGHUB_GLOBAL_API_KEY === '********',
      };
    },
    async saveRunningHubCredentials(input) {
      const keys: Record<string, string> = {};
      if (input.cnApiKey?.trim()) keys.RUNNINGHUB_API_KEY = input.cnApiKey.trim();
      if (input.globalApiKey?.trim()) {
        keys.RUNNINGHUB_GLOBAL_API_KEY = input.globalApiKey.trim();
      }
      if (!Object.keys(keys).length) return;
      await api('/api/config/keys', { method: 'POST', body: JSON.stringify(keys) });
    },
    validateRunningHubCredential: (credentialRef) =>
      api('/api/runninghub-credentials/validate', {
        method: 'POST',
        body: JSON.stringify({ credentialRef }),
      }),
    listRunningHubWebApps: () => api('/api/runninghub-webapps'),
    listOfficialWorkflows: async () =>
      (await api<{ workflows: OfficialWorkflow[] }>('/api/official-workflows')).workflows,
    addOfficialWorkflow: (id) =>
      api(`/api/official-workflows/${encodeURIComponent(id)}/add`, { method: 'POST', body: '{}' }),
    createRunningHubWebApp: (input) =>
      api('/api/runninghub-webapps', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    deleteRunningHubWebApp: (definitionId) =>
      api(`/api/runninghub-webapps/${encodeURIComponent(definitionId)}`, {
        method: 'DELETE',
      }),
    createRunningHubWebAppCategory: (name) =>
      api('/api/runninghub-webapp-categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    deleteRunningHubWebAppCategory: (categoryId) =>
      api(`/api/runninghub-webapp-categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE',
      }),
  };
}

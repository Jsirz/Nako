import {
  deriveBindingCandidates,
  deriveBindingSetBindings,
} from '../../modules/workflow-runtime/server/workflowRuntime/workflowBindingCompiler.js';
import { normalizeApiWorkflow, sha256Json } from '../../modules/workflow-runtime/server/workflowRuntime/workflowFormat.js';

export function workflowFixture({ media = false } = {}) {
  const apiJson = media ? {
    '1': { class_type: 'LoadImage', inputs: { image: 'first.png' } },
    '2': { class_type: 'LoadImage', inputs: { image: 'second.png' } },
  } : { '1': { class_type: 'TestGenerator', inputs: { seed: 7, prompt: 'original' } } };
  const relevantCapabilities = media ? {
    LoadImage: { input: { required: { image: ['STRING', { image_upload: true }] } }, output: ['IMAGE'] },
  } : {
    TestGenerator: { input: { required: {
      seed: ['INT', { min: 0, max: 100, step: 1 }], prompt: ['STRING', {}],
    } }, output: ['IMAGE'], output_node: true },
  };
  const executionPlanHash = sha256Json(normalizeApiWorkflow(apiJson));
  const reference = { definitionId: 'definition', definitionRevision: 1, executionPlanHash };
  const candidates = deriveBindingCandidates({ executionPlan: apiJson, nodeDefinitions: relevantCapabilities });
  const bindings = deriveBindingSetBindings({
    executionPlan: apiJson, nodeDefinitions: relevantCapabilities,
    selections: candidates.map(candidate => ({ candidateId: candidate.id,
      key: media ? `image${candidate.nodeId}` : candidate.fieldName })),
  });
  const bindingSet = { ...reference, id: 'bindings', bindingSetHash: 'b'.repeat(64), bindings };
  const deployment = {
    ...reference, id: 'deployment', connection: { serverUrl: '127.0.0.1:8188' },
    timeoutMs: 1000, runner: 'local-comfyui', relevantCapabilities,
    deploymentSnapshotHash: 'd'.repeat(64), relevantCapabilityHash: 'c'.repeat(64),
    runtimeProtocol: { supportsAtomicJobCancel: false }, inputCleanupGrantId: 'grant',
  };
  return { apiJson, executionPlanHash, bindingSet, deployment, relevantCapabilities,
    definition: { id: 'definition', revision: 1 },
    compile: { executionPlan: apiJson, bindingSet, deployment, projectId: 'project' } };
}

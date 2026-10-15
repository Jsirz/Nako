import { WorkflowExecutorRegistry } from './index.js';
import { compileWorkflowBindings, resolvePublicBindingValues } from './server/workflowRuntime/workflowBindingCompiler.js';
import { classifyHistoryState, normalizeHistoryOutputs, normalizeAvailableHistoryOutputs, toOutputCandidateDto } from './server/workflowRuntime/workflowOutputs.js';
import { createComfyOutputPlan } from './server/workflowRuntime/comfySavedOutputs.js';
import { localizeWorkflowOutputs } from './server/workflowRuntime/workflowOutputLocalizer.js';
import { validateWorkflowRunReceipt } from './server/workflowRuntime/workflowRunResult.js';
import { prepareRunningHubWebAppCompatibility } from './server/workflowRuntime/runningHubWebAppCompatibility.js';
import { prepareRunningHubUploadAsset } from './server/workflowRuntime/runningHubUploadAdapter.js';
import { createRunningHubWebAppProjection } from './server/workflowRuntime/runningHubWebApp.js';
import { readRunningHubPageCover } from './server/workflowRuntime/runningHubCover.js';
import { normalizeRunningHubOutputs } from './server/workflowRuntime/runningHubOutputs.js';
export default {
  manifest: {
    id: 'workflow-runtime',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    dependencies: { 'module.media-capabilities': '^1.0.0', 'module.identity-account': '^1.0.0' },
    services: { requires: ['media.runtime', 'identity.externalUrlFetch', 'platform.paths'], provides: ['workflow.executors', 'workflow.support'] },
  },
  activate(context) {
    context.services.register('workflow.executors', new WorkflowExecutorRegistry());
    /** @type {import('../contracts/workflowSupport').WorkflowSupportService} */
    const support = Object.freeze({
      compileBindings: compileWorkflowBindings, resolveBindingValues: resolvePublicBindingValues,
      classifyHistory: classifyHistoryState, historyOutputs: normalizeHistoryOutputs,
      availableHistoryOutputs: normalizeAvailableHistoryOutputs, outputCandidate: toOutputCandidateDto,
      comfyOutputPlan: createComfyOutputPlan, localizeOutputs: localizeWorkflowOutputs,
      validateReceipt: validateWorkflowRunReceipt,
      prepareWebAppCompatibility: prepareRunningHubWebAppCompatibility,
      prepareUpload: prepareRunningHubUploadAsset, webAppProjection: createRunningHubWebAppProjection,
      readPageCover: readRunningHubPageCover, runningHubOutputs: normalizeRunningHubOutputs,
    });
    context.services.register('workflow.support', support);
  },
};

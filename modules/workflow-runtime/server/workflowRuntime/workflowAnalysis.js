import { analyzeApiWorkflow } from './workflowApiAnalysis.js';
import { hasApiClassType, normalizeApiWorkflow } from './workflowArtifactParser.js';
import { analyzeUiWorkflow } from './workflowUiCompiler.js';

export function analyzeWorkflow(workflow, format, { objectInfo } = {}) {
  if (format === 'comfy-api') {
    const analysis = analyzeApiWorkflow(normalizeApiWorkflow(workflow), objectInfo);
    const omitted = Object.entries(workflow).filter(([, node]) => !hasApiClassType(node));
    analysis.warnings.push(
      ...omitted.map(([nodeId]) => ({ code: 'UNREFERENCED_INCOMPLETE_API_NODE', nodeId })),
    );
    return analysis;
  }
  return analyzeUiWorkflow(workflow, format, objectInfo);
}

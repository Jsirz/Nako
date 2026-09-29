import {
  detectWorkflowFormat,
  hasApiClassType,
  normalizeApiWorkflow,
} from './workflowArtifactParser.js';
import {
  connectionTarget,
  linkEndpoints,
  linkId,
  UI_ONLY_NODE_TYPES,
} from './workflowGraphShape.js';
import { canonicalJson } from './workflowJson.js';
import { validateUiLinkSemantics } from './workflowUiLinks.js';
import { projectUiExecutionGraph } from './workflowUiProjection.js';

export function compareUiAndApiWorkflows(uiWorkflow, apiWorkflow) {
  const format = detectWorkflowFormat(uiWorkflow);
  if (!['comfy-ui-0.4', 'comfy-ui-1.0'].includes(format)) {
    return {
      status: 'conflict',
      reason: 'UNSUPPORTED_UI_VERSION',
      apiNodeCount: Object.keys(apiWorkflow).length,
      uiNodeCount: Array.isArray(uiWorkflow?.nodes) ? uiWorkflow.nodes.length : 0,
    };
  }
  const omittedIds = new Set(
    Object.entries(apiWorkflow)
      .filter(([, node]) => !hasApiClassType(node))
      .map(([id]) => id),
  );
  apiWorkflow = normalizeApiWorkflow(apiWorkflow);
  if (omittedIds.size) {
    const links = uiWorkflow.links || [];
    const hasSurvivingDependency = links.some((link) => {
      const edge = linkEndpoints(link, format);
      return omittedIds.has(String(edge.originId)) && !omittedIds.has(String(edge.targetId));
    });
    if (hasSurvivingDependency)
      return { status: 'conflict', reason: 'INCOMPLETE_API_NODE_UI_DEPENDENCY' };
    const removedLinkIds = new Set(
      links
        .filter((link) => omittedIds.has(String(linkEndpoints(link, format).targetId)))
        .map((link) => String(linkId(link, format))),
    );
    uiWorkflow = {
      ...uiWorkflow,
      nodes: uiWorkflow.nodes
        .filter((node) => !omittedIds.has(String(node.id)))
        .map((node) => ({
          ...node,
          ...(Array.isArray(node.outputs)
            ? {
                outputs: node.outputs.map((output) => ({
                  ...output,
                  ...(Array.isArray(output.links)
                    ? { links: output.links.filter((id) => !removedLinkIds.has(String(id))) }
                    : {}),
                })),
              }
            : {}),
        })),
      links: links.filter((link) => !omittedIds.has(String(linkEndpoints(link, format).targetId))),
    };
  }
  const uiNodes = uiWorkflow.nodes.filter((node) => !UI_ONLY_NODE_TYPES.test(node.type));
  const uiById = new Map(uiNodes.map((node) => [String(node.id), node]));
  const apiEntries = Object.entries(apiWorkflow);
  const { nodeConflicts, titleConflicts } = compareNodeIdentity(apiEntries, uiById);
  const apiNodeIds = new Set(apiEntries.map(([nodeId]) => nodeId));
  const extraUiNodeIds = [...uiById.keys()].filter((nodeId) => !apiNodeIds.has(nodeId));
  const linkValidation = validateUiLinkSemantics(uiWorkflow, format);

  const graphProjection = projectUiExecutionGraph(
    uiWorkflow,
    format,
    uiById,
    apiWorkflow,
    linkValidation.validLinkIds,
  );
  const uiEdges = graphProjection.uiEdges;

  const apiEdges = collectApiEdges(apiEntries);
  uiEdges.sort();
  apiEdges.sort();
  const topologyMatches = canonicalJson(uiEdges) === canonicalJson(apiEdges);
  const exact =
    apiEntries.length > 0 &&
    uiById.size === apiEntries.length &&
    nodeConflicts.length === 0 &&
    extraUiNodeIds.length === 0 &&
    titleConflicts.length === 0 &&
    linkValidation.warnings.length === 0 &&
    graphProjection.projectionConflicts.length === 0 &&
    topologyMatches;
  return {
    status: exact ? 'exact' : 'conflict',
    exactMatchCount: apiEntries.length - nodeConflicts.length,
    apiNodeCount: apiEntries.length,
    uiNodeCount: uiById.size,
    extraUiNodeIds,
    nodeConflicts,
    titleConflicts,
    linkConflicts: linkValidation.warnings,
    projectionConflicts: graphProjection.projectionConflicts,
    topologyMatches,
    uiEdges,
    apiEdges,
  };
}

function collectApiEdges(apiEntries) {
  const apiEdges = [];
  for (const [targetId, apiNode] of apiEntries) {
    for (const [fieldName, value] of Object.entries(apiNode.inputs)) {
      const originId = connectionTarget(value);
      if (!originId) continue;
      apiEdges.push(`${targetId}:${fieldName}<-${originId}:${String(value[1])}`);
    }
  }
  return apiEdges;
}

function compareNodeIdentity(apiEntries, uiById) {
  const nodeConflicts = [];
  const titleConflicts = [];
  for (const [nodeId, apiNode] of apiEntries) {
    const uiNode = uiById.get(nodeId);
    if (!uiNode || uiNode.type !== apiNode.class_type) {
      nodeConflicts.push({ nodeId, uiType: uiNode?.type || null, apiType: apiNode.class_type });
      continue;
    }
    const uiTitle = typeof uiNode.title === 'string' ? uiNode.title.trim() : '';
    const apiTitle = typeof apiNode?._meta?.title === 'string' ? apiNode._meta.title.trim() : '';
    if (uiTitle && apiTitle && uiTitle !== apiTitle) {
      titleConflicts.push({ nodeId, uiTitle, apiTitle });
    }
  }
  return { nodeConflicts, titleConflicts };
}

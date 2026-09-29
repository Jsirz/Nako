import {
  connectionTarget,
  linkEndpoints,
  linkId,
  primitiveWidgetValue,
  slotAt,
  UI_ONLY_NODE_TYPES,
  UI_PRIMITIVE_NODE_TYPES,
  UI_REROUTE_NODE_TYPES,
} from './workflowGraphShape.js';
import { canonicalJson } from './workflowJson.js';

export function projectUiExecutionGraph(
  uiWorkflow,
  format,
  executableNodes,
  apiWorkflow,
  validLinkIds,
) {
  const allNodes = new Map(uiWorkflow.nodes.map((node) => [String(node.id), node]));
  const linksByOrigin = new Map();
  const linksByTarget = new Map();
  for (const link of uiWorkflow.links || []) {
    const id = String(linkId(link, format));
    if (!validLinkIds.has(id)) continue;
    const endpoints = linkEndpoints(link, format);
    const originId = String(endpoints.originId);
    const existing = linksByOrigin.get(originId) || [];
    existing.push(link);
    linksByOrigin.set(originId, existing);
    const targetId = String(endpoints.targetId);
    const targetLinks = linksByTarget.get(targetId) || [];
    targetLinks.push(link);
    linksByTarget.set(targetId, targetLinks);
  }

  const uiEdges = [];
  const projectionConflicts = [];
  const projectedTargets = [];

  validateRerouteGraph(
    executableNodes,
    allNodes,
    uiWorkflow,
    validLinkIds,
    format,
    linksByOrigin,
    linksByTarget,
    projectionConflicts,
  );

  const trace = createUiLinkTracer(
    format,
    allNodes,
    projectionConflicts,
    linksByOrigin,
    executableNodes,
    projectedTargets,
  );

  for (const [sourceId, sourceNode] of allNodes) {
    if (!executableNodes.has(sourceId) && !UI_PRIMITIVE_NODE_TYPES.test(sourceNode.type)) continue;
    for (const link of linksByOrigin.get(sourceId) || []) {
      const endpoints = linkEndpoints(link, format);
      trace(link, {
        kind: executableNodes.has(sourceId) ? 'edge' : 'primitive',
        nodeId: sourceId,
        outputSlot: endpoints.originSlot,
        node: sourceNode,
      });
    }
  }

  for (const target of projectedTargets) {
    if (target.source.kind === 'edge') {
      uiEdges.push(
        `${target.targetId}:${target.fieldName}` +
          `<-${target.source.nodeId}:${String(target.source.outputSlot)}`,
      );
      continue;
    }
    const primitive = primitiveWidgetValue(target.source.node);
    const apiValue = apiWorkflow?.[target.targetId]?.inputs?.[target.fieldName];
    if (
      !primitive.found ||
      connectionTarget(apiValue) ||
      canonicalJson(primitive.value) !== canonicalJson(apiValue)
    ) {
      projectionConflicts.push({
        code: 'PRIMITIVE_VALUE_MISMATCH',
        primitiveNodeId: target.source.nodeId,
        targetNodeId: target.targetId,
        fieldName: target.fieldName,
      });
    }
  }
  return { uiEdges, projectionConflicts };
}

function createUiLinkTracer(
  format,
  allNodes,
  projectionConflicts,
  linksByOrigin,
  executableNodes,
  projectedTargets,
) {
  return function trace(link, source, reroutePath = new Set()) {
    const endpoints = linkEndpoints(link, format);
    const targetId = String(endpoints.targetId);
    const target = allNodes.get(targetId);
    if (UI_REROUTE_NODE_TYPES.test(target?.type)) {
      if (reroutePath.has(targetId)) {
        projectionConflicts.push({ code: 'REROUTE_CYCLE', nodeId: targetId });
        return;
      }
      const nextPath = new Set(reroutePath);
      nextPath.add(targetId);
      for (const outgoing of linksByOrigin.get(targetId) || []) trace(outgoing, source, nextPath);
      return;
    }
    if (!executableNodes.has(targetId)) {
      if (!UI_ONLY_NODE_TYPES.test(target?.type)) {
        projectionConflicts.push({ code: 'UNRESOLVED_UI_TARGET', nodeId: targetId });
      }
      return;
    }
    const targetInput = slotAt(target.inputs, endpoints.targetSlot);
    if (!targetInput?.name) {
      projectionConflicts.push({ code: 'UNRESOLVED_UI_TARGET_SLOT', nodeId: targetId });
      return;
    }
    projectedTargets.push({
      targetId,
      fieldName: targetInput.name,
      source,
    });
  };
}

function validateRerouteGraph(
  executableNodes,
  allNodes,
  uiWorkflow,
  validLinkIds,
  format,
  linksByOrigin,
  linksByTarget,
  projectionConflicts,
) {
  const reachableReroutes = new Set([
    ...executableNodes.keys(),
    ...[...allNodes]
      .filter(([, node]) => UI_PRIMITIVE_NODE_TYPES.test(node.type))
      .map(([nodeId]) => nodeId),
  ]);
  let reachabilityChanged = true;
  while (reachabilityChanged) {
    reachabilityChanged = false;
    for (const link of uiWorkflow.links || []) {
      if (!validLinkIds.has(String(linkId(link, format)))) continue;
      const endpoints = linkEndpoints(link, format);
      const originId = String(endpoints.originId);
      const targetId = String(endpoints.targetId);
      if (
        reachableReroutes.has(originId) &&
        UI_REROUTE_NODE_TYPES.test(allNodes.get(targetId)?.type) &&
        !reachableReroutes.has(targetId)
      ) {
        reachableReroutes.add(targetId);
        reachabilityChanged = true;
      }
    }
  }
  for (const [nodeId, node] of allNodes) {
    if (!UI_REROUTE_NODE_TYPES.test(node.type) || !linksByOrigin.get(nodeId)?.length) continue;
    if ((linksByTarget.get(nodeId)?.length || 0) !== 1 || !reachableReroutes.has(nodeId)) {
      projectionConflicts.push({ code: 'REROUTE_SOURCE_MISSING_OR_AMBIGUOUS', nodeId });
    }
  }

  const rerouteStates = new Map();
  const visitReroute = (nodeId) => {
    const state = rerouteStates.get(nodeId);
    if (state === 'visiting') {
      projectionConflicts.push({ code: 'REROUTE_CYCLE', nodeId });
      return;
    }
    if (state === 'visited') return;
    rerouteStates.set(nodeId, 'visiting');
    for (const link of linksByOrigin.get(nodeId) || []) {
      const targetId = String(linkEndpoints(link, format).targetId);
      if (UI_REROUTE_NODE_TYPES.test(allNodes.get(targetId)?.type)) visitReroute(targetId);
    }
    rerouteStates.set(nodeId, 'visited');
  };
  for (const [nodeId, node] of allNodes) {
    if (UI_REROUTE_NODE_TYPES.test(node.type)) visitReroute(nodeId);
  }
}

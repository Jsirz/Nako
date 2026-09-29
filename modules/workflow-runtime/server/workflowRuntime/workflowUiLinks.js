import {
  concreteConnectionTypesMatch,
  linkEndpoints,
  linkId,
  linkType,
  normalizedConnectionType,
  slotAt,
} from './workflowGraphShape.js';
import { schemaInput } from './workflowNodeSchema.js';

export function validateUiLinkSemantics(workflow, format) {
  const nodes = new Map(workflow.nodes.map((node) => [String(node.id), node]));
  const links = new Map((workflow.links || []).map((link) => [String(linkId(link, format)), link]));
  const originOwners = new Map();
  const targetOwners = new Map();
  const validLinkIds = new Set();
  const warnings = [];

  const recordOwner = (owners, id, owner) => {
    const existing = owners.get(id) || [];
    existing.push(owner);
    owners.set(id, existing);
  };

  for (const [nodeId, node] of nodes) {
    for (const [index, input] of (Array.isArray(node.inputs) ? node.inputs : []).entries()) {
      if (input?.link == null) continue;
      const id = String(input.link);
      const slot = input.slot_index ?? index;
      recordOwner(targetOwners, id, { nodeId, slot });
      const link = links.get(id);
      const endpoints = link ? linkEndpoints(link, format) : null;
      if (
        !endpoints ||
        String(endpoints.targetId) !== nodeId ||
        String(endpoints.targetSlot) !== String(slot)
      ) {
        warnings.push({ code: 'INCONSISTENT_UI_LINK_SLOT', linkId: id, nodeId, side: 'target' });
      }
    }
    for (const [index, output] of (Array.isArray(node.outputs) ? node.outputs : []).entries()) {
      const slot = output?.slot_index ?? index;
      for (const candidate of Array.isArray(output?.links) ? output.links : []) {
        const id = String(candidate);
        recordOwner(originOwners, id, { nodeId, slot });
        const link = links.get(id);
        const endpoints = link ? linkEndpoints(link, format) : null;
        if (
          !endpoints ||
          String(endpoints.originId) !== nodeId ||
          String(endpoints.originSlot) !== String(slot)
        ) {
          warnings.push({ code: 'INCONSISTENT_UI_LINK_SLOT', linkId: id, nodeId, side: 'origin' });
        }
      }
    }
  }

  for (const link of workflow.links || []) {
    const id = String(linkId(link, format));
    const endpoints = linkEndpoints(link, format);
    const origin = nodes.get(String(endpoints.originId));
    const target = nodes.get(String(endpoints.targetId));
    const originOutput = slotAt(origin?.outputs, endpoints.originSlot);
    const targetInput = slotAt(target?.inputs, endpoints.targetSlot);
    const originReferences = originOwners.get(id) || [];
    const targetReferences = targetOwners.get(id) || [];
    if (
      !originOutput ||
      !targetInput ||
      originReferences.length !== 1 ||
      targetReferences.length !== 1
    ) {
      warnings.push({
        code: 'INCONSISTENT_UI_LINK_SLOT',
        linkId: id,
        originNodeId: String(endpoints.originId),
        targetNodeId: String(endpoints.targetId),
      });
      continue;
    }
    validLinkIds.add(id);
  }
  return { validLinkIds, warnings };
}

export function validateUiLinkRuntimeSemantics(workflow, format, objectInfo, structurallyValidIds) {
  const nodes = new Map(workflow.nodes.map((node) => [String(node.id), node]));
  const validLinkIds = new Set();
  const warnings = [];
  for (const link of workflow.links || []) {
    const id = String(linkId(link, format));
    if (!structurallyValidIds.has(id)) continue;
    const endpoints = linkEndpoints(link, format);
    const origin = nodes.get(String(endpoints.originId));
    const target = nodes.get(String(endpoints.targetId));
    const originDefinition = objectInfo?.[origin?.type];
    const targetDefinition = objectInfo?.[target?.type];
    const originSlot = Number(endpoints.originSlot);
    const originOutput = slotAt(origin?.outputs, endpoints.originSlot);
    const targetInput = slotAt(target?.inputs, endpoints.targetSlot);
    const targetSpecification = schemaInput(targetDefinition, targetInput?.name);
    const runtimeOutputType =
      Number.isInteger(originSlot) && Array.isArray(originDefinition?.output)
        ? originDefinition.output[originSlot]
        : undefined;
    const runtimeInputType =
      typeof targetSpecification?.[0] === 'string' ? targetSpecification[0] : undefined;
    const typeEvidence = [
      linkType(link, format),
      originOutput?.type,
      targetInput?.type,
      runtimeOutputType,
      runtimeInputType,
    ];
    const typeMatches = concreteConnectionTypesMatch(typeEvidence);
    if (
      !Number.isInteger(originSlot) ||
      originSlot < 0 ||
      !Array.isArray(originDefinition?.output) ||
      originSlot >= originDefinition.output.length ||
      !normalizedConnectionType(runtimeOutputType) ||
      !targetSpecification ||
      !runtimeInputType ||
      !typeMatches
    ) {
      warnings.push({
        code: 'RUNTIME_SLOT_MISMATCH',
        linkId: id,
        originNodeId: String(endpoints.originId),
        targetNodeId: String(endpoints.targetId),
      });
      continue;
    }
    validLinkIds.add(id);
  }
  return { validLinkIds, warnings };
}

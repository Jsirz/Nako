import {
  concreteConnectionTypesMatch,
  connectionTarget,
  normalizedConnectionType,
  OUTPUT_NODE_TYPES,
} from './workflowGraphShape.js';
import { sha256Json } from './workflowJson.js';
import { MODEL_FIELDS, acceptsWidgetValue, candidateBinding, schemaInput } from './workflowNodeSchema.js';



export function apiRequirements(workflow) {
  const nodeTypes = new Set();
  const models = new Map();
  for (const node of Object.values(workflow)) {
    nodeTypes.add(node.class_type);
    for (const [fieldName, modelKind] of Object.entries(MODEL_FIELDS)) {
      const value = node.inputs[fieldName];
      if (typeof value !== 'string' || !value.trim()) continue;
      models.set(`${modelKind}:${value}`, { type: modelKind, name: value });
    }
  }
  return {
    nodeTypes: [...nodeTypes].sort(),
    models: [...models.values()].sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export function createCapabilityProjection(apiWorkflow, objectInfo = {}) {
  const projection = {};
  for (const classType of apiRequirements(apiWorkflow).nodeTypes) {
    const definition = objectInfo[classType];
    if (!definition) continue;
    projection[classType] = {
      input: definition.input || {},
      input_order: definition.input_order || null,
      output: definition.output || [],
      output_name: definition.output_name || [],
      output_node: Boolean(definition.output_node),
    };
  }
  return {
    nodeDefinitions: projection,
    relevantCapabilityHash: sha256Json(projection),
  };
}

export function analyzeApiWorkflow(workflow, objectInfo) {
  const nodes = [];
  const candidateBindings = [];
  const candidateOutputs = [];
  const warnings = [];

  for (const [nodeId, node] of Object.entries(workflow)) {
    const definition = objectInfo?.[node.class_type];
    nodes.push({
      id: nodeId,
      classType: node.class_type,
      title: node?._meta?.title || definition?.display_name || node.class_type,
      inputCount: Object.keys(node.inputs).length,
      capabilityAvailable: objectInfo ? Boolean(definition) : null,
    });
    if (objectInfo && !definition)
      warnings.push({
        code: 'MISSING_NODE_TYPE',
        nodeId,
        classType: node.class_type,
      });
    for (const [fieldName, value] of Object.entries(node.inputs)) {
      const sourceId = connectionTarget(value);
      if (sourceId) {
        if (objectInfo) {
          validateRuntimeConnection(
            workflow,
            sourceId,
            objectInfo,
            definition,
            fieldName,
            node,
            value,
            warnings,
            nodeId,
          );
        }
        continue;
      }
      if (objectInfo && definition) {
        const specification = schemaInput(definition, fieldName, node.inputs);
        if (!specification) {
          warnings.push({ code: 'UNKNOWN_NODE_INPUT', nodeId, fieldName });
        } else if (!acceptsWidgetValue(specification, value)) {
          warnings.push({ code: 'INVALID_INPUT_VALUE', nodeId, fieldName });
        }
      }
      candidateBindings.push(candidateBinding(nodeId, node, fieldName, value, objectInfo));
    }
    if (definition) {
      for (const fieldName of Object.keys(definition.input?.required || {})) {
        const specification = definition.input.required[fieldName];
        const dynamicPresent =
          /^COMFY_AUTOGROW/i.test(String(specification?.[0] || '')) &&
          Object.keys(node.inputs).some((candidate) => candidate.startsWith(`${fieldName}.`));
        if (!Object.hasOwn(node.inputs, fieldName) && !dynamicPresent) {
          warnings.push({ code: 'MISSING_REQUIRED_INPUT', nodeId, fieldName });
        }
      }
    }
    if (definition?.output_node || OUTPUT_NODE_TYPES.test(node.class_type)) {
      candidateOutputs.push({
        nodeId,
        classType: node.class_type,
        title: node?._meta?.title || definition?.display_name || node.class_type,
        outputTypes: definition?.output || [],
      });
    }
  }

  const capability = objectInfo ? createCapabilityProjection(workflow, objectInfo) : null;
  return {
    format: 'comfy-api',
    nodeCount: nodes.length,
    linkCount: Object.values(workflow).reduce(
      (total, node) => total + Object.values(node.inputs).filter(connectionTarget).length,
      0,
    ),
    nodes,
    groups: [],
    candidateBindings,
    candidateOutputs,
    requirements: apiRequirements(workflow),
    warnings,
    // API Format is already the executable contract. object_info can enrich
    // controls and diagnostics, but ComfyUI remains the execution authority.
    compileStatus: 'ready',
    ...(capability || {}),
  };
}

function validateRuntimeConnection(
  workflow,
  sourceId,
  objectInfo,
  definition,
  fieldName,
  node,
  value,
  warnings,
  nodeId,
) {
  const sourceNode = workflow[sourceId];
  const sourceDefinition = objectInfo?.[sourceNode?.class_type];
  const targetSpecification = schemaInput(definition, fieldName, node.inputs);
  const outputSlot = value[1];
  const runtimeOutputType = Array.isArray(sourceDefinition?.output)
    ? sourceDefinition.output[outputSlot]
    : undefined;
  const runtimeInputType =
    typeof targetSpecification?.[0] === 'string' ? targetSpecification[0] : undefined;
  if (
    !definition ||
    !sourceDefinition ||
    !Array.isArray(sourceDefinition.output) ||
    outputSlot >= sourceDefinition.output.length ||
    !normalizedConnectionType(runtimeOutputType) ||
    !targetSpecification ||
    !runtimeInputType ||
    !concreteConnectionTypesMatch([runtimeOutputType, runtimeInputType])
  ) {
    warnings.push({
      code: 'RUNTIME_SLOT_MISMATCH',
      nodeId,
      fieldName,
      sourceNodeId: sourceId,
      outputSlot,
    });
  }
}

import { analyzeApiWorkflow } from './workflowApiAnalysis.js';
import { normalizeApiWorkflow } from './workflowArtifactParser.js';
import { groupForNode, linkEndpoints, linkId, uiGroups } from './workflowGraphShape.js';
import { isPlainObject, sha256Json } from './workflowJson.js';
import {
  acceptsWidgetValue,
  definitionFieldOrder,
  explicitSchemaDefault,
  schemaInput,
} from './workflowNodeSchema.js';
import { validateUiLinkRuntimeSemantics, validateUiLinkSemantics } from './workflowUiLinks.js';

export function compileUiWorkflow(workflow, format, objectInfo) {
  if (format === 'comfy-ui-unknown') {
    return { compileStatus: 'unsupported-version', warnings: [{ code: 'UNKNOWN_UI_VERSION' }] };
  }
  if (!objectInfo) {
    return {
      compileStatus: 'needs-runtime-capabilities',
      warnings: [{ code: 'OBJECT_INFO_REQUIRED' }],
    };
  }

  const links = new Map((workflow.links || []).map((link) => [String(linkId(link, format)), link]));
  const apiWorkflow = {};
  const linkValidation = validateUiLinkSemantics(workflow, format);
  const runtimeLinkValidation = validateUiLinkRuntimeSemantics(
    workflow,
    format,
    objectInfo,
    linkValidation.validLinkIds,
  );
  const warnings = [...linkValidation.warnings, ...runtimeLinkValidation.warnings];
  let missingNodeDefinition = false;

  for (const uiNode of workflow.nodes) {
    const nodeId = String(uiNode.id);
    const definition = objectInfo[uiNode.type];
    if (!definition) {
      missingNodeDefinition = true;
      warnings.push({ code: 'MISSING_NODE_TYPE', nodeId, classType: uiNode.type });
      continue;
    }
    const inputs = {};
    const declaredConnectedFields = new Set(
      (Array.isArray(uiNode.inputs) ? uiNode.inputs : [])
        .filter((input) => input?.link != null)
        .map((input) => input.name),
    );
    for (const input of Array.isArray(uiNode.inputs) ? uiNode.inputs : []) {
      if (input?.link == null) continue;
      const link = links.get(String(input.link));
      if (!link || !runtimeLinkValidation.validLinkIds.has(String(input.link))) continue;
      const endpoints = linkEndpoints(link, format);
      inputs[input.name] = [String(endpoints.originId), Number(endpoints.originSlot)];
    }

    mapUiWidgetValues(definition, declaredConnectedFields, inputs, warnings, nodeId, uiNode);
    apiWorkflow[nodeId] = {
      inputs,
      class_type: uiNode.type,
      _meta: { title: uiNode.title || definition.display_name || uiNode.type },
    };
  }

  if (missingNodeDefinition) return { compileStatus: 'needs-api-export', warnings };
  if (warnings.length) {
    return { compileStatus: 'needs-confirmation', warnings, draftApiJson: apiWorkflow };
  }
  const normalized = normalizeApiWorkflow(apiWorkflow);
  return {
    compileStatus: 'ready',
    warnings: [],
    apiJson: normalized,
    executionPlanHash: sha256Json(normalized),
  };
}

function mapUiWidgetValues(definition, declaredConnectedFields, inputs, warnings, nodeId, uiNode) {
  const fieldOrder = definitionFieldOrder(definition).filter((fieldName) => {
    if (declaredConnectedFields.has(fieldName)) return false;
    if (Object.hasOwn(inputs, fieldName)) return false;
    const specification = schemaInput(definition, fieldName);
    const options = specification?.[1] || {};
    if (options.forceInput && definition?.input?.required?.[fieldName]) {
      warnings.push({ code: 'UNCONNECTED_REQUIRED_INPUT', nodeId, fieldName });
    }
    return !options.forceInput && !options.defaultInput;
  });
  const widgetValues = uiNode.widgets_values;
  if (isPlainObject(widgetValues)) {
    for (const [fieldName, value] of Object.entries(widgetValues)) {
      if (declaredConnectedFields.has(fieldName)) continue;
      const specification = schemaInput(definition, fieldName);
      if (!specification || !acceptsWidgetValue(specification, value)) {
        warnings.push({ code: 'AMBIGUOUS_WIDGET_MAPPING', nodeId, fieldName });
        continue;
      }
      inputs[fieldName] = value;
    }
    for (const [fieldName, specification] of Object.entries(definition.input?.required || {})) {
      if (Object.hasOwn(inputs, fieldName) || declaredConnectedFields.has(fieldName)) continue;
      const options = specification?.[1] || {};
      if (options.forceInput) continue;
      const defaultValue = explicitSchemaDefault(specification);
      if (defaultValue.found && acceptsWidgetValue(specification, defaultValue.value)) {
        inputs[fieldName] = defaultValue.value;
      } else {
        warnings.push({ code: 'MISSING_REQUIRED_INPUT', nodeId, fieldName });
      }
    }
  } else {
    const values = Array.isArray(widgetValues) ? widgetValues : [];
    if (values.length > 0) {
      warnings.push({ code: 'POSITIONAL_WIDGET_MAPPING_REQUIRES_CONFIRMATION', nodeId });
    }
    if (values.length !== fieldOrder.length) {
      warnings.push({
        code: 'AMBIGUOUS_WIDGET_COUNT',
        nodeId,
        expected: fieldOrder.length,
        actual: values.length,
      });
    }
    for (let index = 0; index < Math.min(values.length, fieldOrder.length); index += 1) {
      const fieldName = fieldOrder[index];
      const specification = schemaInput(definition, fieldName);
      if (!acceptsWidgetValue(specification, values[index])) {
        warnings.push({ code: 'AMBIGUOUS_WIDGET_MAPPING', nodeId, fieldName });
        continue;
      }
      inputs[fieldName] = values[index];
    }
  }
}

export function analyzeUiWorkflow(workflow, format, objectInfo) {
  const groups = uiGroups(workflow);
  const nodes = workflow.nodes.map((node) => {
    const group = groupForNode(node, groups);
    return {
      id: String(node.id),
      classType: node.type,
      title: node.title || node.type,
      groupId: group?.id || null,
      groupTitle: group?.title || null,
      capabilityAvailable: objectInfo ? Boolean(objectInfo[node.type]) : null,
    };
  });
  const compilation = compileUiWorkflow(workflow, format, objectInfo);
  return {
    format,
    nodeCount: nodes.length,
    linkCount: Array.isArray(workflow.links) ? workflow.links.length : 0,
    nodes,
    groups,
    candidateBindings: compilation.apiJson
      ? analyzeApiWorkflow(compilation.apiJson, objectInfo).candidateBindings
      : [],
    candidateOutputs: compilation.apiJson
      ? analyzeApiWorkflow(compilation.apiJson, objectInfo).candidateOutputs
      : [],
    requirements: {
      nodeTypes: [...new Set(nodes.map((node) => node.classType))].sort(),
      models: [],
    },
    ...compilation,
  };
}

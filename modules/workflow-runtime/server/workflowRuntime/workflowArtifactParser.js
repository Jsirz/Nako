import { connectionTarget, linkEndpoints, linkId } from './workflowGraphShape.js';
import {
  assertJsonDepth,
  canonicalJson,
  isPlainObject,
  sha256Bytes,
  WORKFLOW_LIMITS,
  WorkflowFormatError,
} from './workflowJson.js';

export function looksLikeApiWorkflow(value) {
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(([, node]) => isPlainObject(node) && isPlainObject(node.inputs)) &&
    entries.some(([, node]) => hasApiClassType(node))
  );
}

export function hasApiClassType(node) {
  return typeof node.class_type === 'string' && Boolean(node.class_type.trim());
}

export function detectWorkflowFormat(workflow) {
  if (looksLikeApiWorkflow(workflow)) return 'comfy-api';
  if (!isPlainObject(workflow) || !Array.isArray(workflow.nodes)) return 'unknown';
  if (Object.hasOwn(workflow, 'version')) {
    if (workflow.version === 1) return 'comfy-ui-1.0';
    if (workflow.version === 0.4) return 'comfy-ui-0.4';
    return 'comfy-ui-unknown';
  }
  if (Object.hasOwn(workflow, 'last_node_id') || Object.hasOwn(workflow, 'last_link_id'))
    return 'comfy-ui-0.4';
  return 'comfy-ui-unknown';
}

export function validateUiWorkflow(workflow, format, limits) {
  if (format === 'comfy-ui-1.0' && !isPlainObject(workflow.state)) {
    throw new WorkflowFormatError('v1.0 工作流缺少 state', 'INVALID_UI_VERSION_STRUCTURE');
  }
  if (workflow.nodes.length > limits.maxNodes) {
    throw new WorkflowFormatError('工作流节点数量超过限制', 'WORKFLOW_NODE_LIMIT');
  }
  if (workflow.links != null && !Array.isArray(workflow.links)) {
    throw new WorkflowFormatError('普通工作流 links 必须是数组', 'INVALID_UI_LINKS');
  }
  const links = workflow.links || [];
  if (links.length > limits.maxLinks) {
    throw new WorkflowFormatError('工作流连线数量超过限制', 'WORKFLOW_LINK_LIMIT');
  }

  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    if (!isPlainObject(node) || node.id == null || typeof node.type !== 'string') {
      throw new WorkflowFormatError('普通工作流包含无效节点', 'INVALID_UI_NODE');
    }
    if (node.inputs != null && !Array.isArray(node.inputs)) {
      throw new WorkflowFormatError('普通工作流节点 inputs 必须是数组', 'INVALID_UI_NODE_INPUTS');
    }
    if (node.outputs != null && !Array.isArray(node.outputs)) {
      throw new WorkflowFormatError('普通工作流节点 outputs 必须是数组', 'INVALID_UI_NODE_OUTPUTS');
    }
    const id = String(node.id);
    if (nodeIds.has(id)) {
      throw new WorkflowFormatError(`普通工作流包含重复节点 ID：${id}`, 'DUPLICATE_NODE_ID');
    }
    nodeIds.add(id);
  }

  const linkIds = new Set();
  for (const link of links) {
    const id = linkId(link, format);
    const endpoints = linkEndpoints(link, format);
    if (id == null || endpoints.originId == null || endpoints.targetId == null) {
      throw new WorkflowFormatError('普通工作流包含无效连线', 'INVALID_UI_LINK');
    }
    if (
      !Number.isInteger(endpoints.originSlot) ||
      endpoints.originSlot < 0 ||
      !Number.isInteger(endpoints.targetSlot) ||
      endpoints.targetSlot < 0
    ) {
      throw new WorkflowFormatError('普通工作流包含无效连线槽', 'INVALID_UI_LINK_SLOT');
    }
    if (linkIds.has(String(id))) {
      throw new WorkflowFormatError(`普通工作流包含重复连线 ID：${id}`, 'DUPLICATE_LINK_ID');
    }
    linkIds.add(String(id));
    if (!nodeIds.has(String(endpoints.originId)) || !nodeIds.has(String(endpoints.targetId))) {
      throw new WorkflowFormatError(`普通工作流连线 ${id} 引用了不存在的节点`, 'BROKEN_LINK');
    }
  }
}

export function validateUnknownUiWorkflow(workflow, limits) {
  if (workflow.nodes.length > limits.maxNodes) {
    throw new WorkflowFormatError('工作流节点数量超过限制', 'WORKFLOW_NODE_LIMIT');
  }
  if (Array.isArray(workflow.links) && workflow.links.length > limits.maxLinks) {
    throw new WorkflowFormatError('工作流连线数量超过限制', 'WORKFLOW_LINK_LIMIT');
  }
  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    if (!isPlainObject(node) || node.id == null || typeof node.type !== 'string') {
      throw new WorkflowFormatError('普通工作流包含无效节点', 'INVALID_UI_NODE');
    }
    const id = String(node.id);
    if (nodeIds.has(id)) {
      throw new WorkflowFormatError(`普通工作流包含重复节点 ID：${id}`, 'DUPLICATE_NODE_ID');
    }
    nodeIds.add(id);
  }
}

export function validateApiWorkflow(workflow, limits) {
  const entries = Object.entries(workflow);
  if (entries.length > limits.maxNodes) {
    throw new WorkflowFormatError('工作流节点数量超过限制', 'WORKFLOW_NODE_LIMIT');
  }
  const nodeIds = new Set(entries.map(([id]) => id));
  const incompleteNodeIds = new Set(
    entries.filter(([, node]) => !hasApiClassType(node)).map(([id]) => id),
  );
  let connectionCount = 0;
  for (const [nodeId, node] of entries) {
    if (!nodeId || !isPlainObject(node.inputs)) {
      throw new WorkflowFormatError(`API 工作流节点 ${nodeId || '<空>'} 无效`, 'INVALID_API_NODE');
    }
    // An unreferenced incomplete export can be kept in the source artifact but
    // omitted from the executable plan. Never remove a dependency of a valid node.
    if (incompleteNodeIds.has(nodeId)) continue;
    for (const [fieldName, value] of Object.entries(node.inputs)) {
      const resemblesConnection =
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        (nodeIds.has(value[0]) || typeof value[1] === 'number');
      if (resemblesConnection && (!Number.isInteger(value[1]) || value[1] < 0)) {
        throw new WorkflowFormatError(
          `API 工作流节点 ${nodeId}.${fieldName} 包含无效输出槽`,
          'INVALID_API_LINK',
        );
      }
      const target = connectionTarget(value);
      if (!target) continue;
      if (incompleteNodeIds.has(target)) {
        throw new WorkflowFormatError(
          `API 工作流节点 ${target} 缺少 class_type，节点 ${nodeId}.${fieldName} 仍依赖它。请在 ComfyUI 中恢复该节点，或断开不需要的分支后重新导出。`,
          'INCOMPLETE_API_NODE_DEPENDENCY',
          { nodeId: target, dependentNodeId: nodeId, fieldName },
        );
      }
      connectionCount += 1;
      if (!nodeIds.has(target)) {
        throw new WorkflowFormatError(
          `API 工作流节点 ${nodeId}.${fieldName} 引用了不存在的节点 ${target}`,
          'BROKEN_LINK',
        );
      }
    }
  }
  if (connectionCount > limits.maxLinks) {
    throw new WorkflowFormatError('工作流连线数量超过限制', 'WORKFLOW_LINK_LIMIT');
  }
}

export function parseWorkflowArtifact(content, { limits = WORKFLOW_LIMITS } = {}) {
  const bytes = Buffer.isBuffer(content)
    ? Buffer.from(content)
    : content instanceof Uint8Array
      ? Buffer.from(content)
      : typeof content === 'string'
        ? Buffer.from(content, 'utf8')
        : null;
  if (!bytes)
    throw new WorkflowFormatError('工作流内容必须是 JSON 字节或文本', 'INVALID_WORKFLOW_CONTENT');
  if (bytes.length === 0 || bytes.length > limits.maxBytes) {
    throw new WorkflowFormatError('工作流文件大小无效或超过限制', 'WORKFLOW_SIZE_LIMIT');
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new WorkflowFormatError('工作流不是有效 UTF-8 文本', 'INVALID_UTF8', {
      cause: cause.message,
    });
  }
  let workflow;
  try {
    const jsonText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    workflow = JSON.parse(jsonText);
  } catch (cause) {
    throw new WorkflowFormatError('工作流不是有效 JSON', 'INVALID_JSON', { cause: cause.message });
  }
  assertJsonDepth(workflow, limits.maxDepth);
  const format = detectWorkflowFormat(workflow);
  if (format === 'unknown') {
    throw new WorkflowFormatError('无法识别工作流格式', 'UNKNOWN_WORKFLOW_FORMAT');
  }
  if (format === 'comfy-api') validateApiWorkflow(workflow, limits);
  else if (format === 'comfy-ui-unknown') validateUnknownUiWorkflow(workflow, limits);
  else validateUiWorkflow(workflow, format, limits);

  return {
    bytes,
    text,
    workflow,
    format,
    byteLength: bytes.length,
    sourceSha256: sha256Bytes(bytes),
  };
}

export function normalizeApiWorkflow(workflow, { limits = WORKFLOW_LIMITS } = {}) {
  if (!looksLikeApiWorkflow(workflow)) {
    throw new WorkflowFormatError('内容不是 ComfyUI API Format', 'INVALID_API_WORKFLOW');
  }
  validateApiWorkflow(workflow, limits);
  return JSON.parse(
    canonicalJson(
      Object.fromEntries(Object.entries(workflow).filter(([, node]) => hasApiClassType(node))),
    ),
  );
}

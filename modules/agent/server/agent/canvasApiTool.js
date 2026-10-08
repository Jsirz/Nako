import { canvasControlTool } from '../../../contracts/canvasControlProtocol.js';

// Expand each operation into its exact fields for the model-facing schema.
const edits = {
  create: ['ref', 'type', 'x', 'y'], update: ['nodeId', 'patch'], configure: ['nodeId', 'model', 'parameters'],
  configureNode: ['nodeId', 'parameters'],
  delete: ['nodeId'], connect: ['sourceId', 'targetId'], disconnect: ['sourceId', 'targetId'],
  group: ['ref', 'nodeIds', 'label'], ungroup: ['groupId'], renameGroup: ['groupId', 'label'],
  arrange: ['nodeIds', 'columns'], duplicate: ['nodes', 'x', 'y'],
};
const optional = { create: ['title', 'prompt', 'pluginId', 'parameters'], connect: ['sourcePort', 'targetPort'], disconnect: ['targetPort'] };
const actions = {
  read: [[], []], nodes: [[], []], nodeStatus: [['operationId'], []], runNode: [['revision', 'nodeType'], ['pluginId', 'parameters', 'inputs']], models: [['type'], ['model']], edit: [['revision', 'operations'], []],
  focus: [['nodeIds'], []], undo: [['revision', 'operationId'], []],
  assets: [[], ['query', 'offset']], importAsset: [['revision', 'assetId', 'x', 'y'], []],
  prepareGeneration: [['revision', 'nodeIds'], []], projects: [[], ['query', 'offset']],
  project: [['revision', 'operation'], ['projectId', 'folderId', 'title']],
  tasks: [[], ['nodeIds']], cancelTask: [['revision', 'nodeId'], []],
  media: [['revision', 'operation', 'nodeId'], ['nodeIds', 'rect', 'rows', 'columns', 'times', 'speech', 'startTime', 'endTime', 'strokes', 'mask']],
  budgets: [[], []], prepareBudget: [['revision', 'nodeIds', 'maxRequests', 'maxOutputs', 'minutes'], ['budgetCny']],
  revokeBudget: [['authorizationId'], []], runGeneration: [['revision', 'generationPlanId', 'authorizationId'], []],
  workflows: [[], ['offset']], workflow: [['revision', 'operation'], ['definitionId', 'nodeId', 'parameters', 'x', 'y']],
  product: [['revision', 'operation'], ['nodeId']],
};
export function canvasApiTool() {
  const parameters = structuredClone(canvasControlTool.inputSchema);
  const fields = parameters.properties.operations.items.properties;
  parameters.properties.operations.items = { ...parameters.properties.operations.items, oneOf: Object.entries(edits).map(([kind, required]) => ({
    type: 'object', additionalProperties: false, required: ['kind', ...required],
    properties: { kind: { const: kind }, ...Object.fromEntries([...required, ...(optional[kind] || [])].map(key => [key, fields[key]])) },
  })) };
  parameters.properties.revision.description = 'Required for mutations. For read, omit revision and all other fields.';
  parameters.oneOf = Object.entries(actions).map(([action, [required, optional]]) => ({
    type: 'object', additionalProperties: false, required: ['action', ...required],
    properties: { action: { const: action }, ...Object.fromEntries([...required, ...optional].map(key => [key, parameters.properties[key]])) },
  }));
  const declareStringEnums = schema => {
    if (!schema || typeof schema !== 'object') return;
    if (Array.isArray(schema.enum) && schema.enum.every(value => typeof value === 'string') || typeof schema.const === 'string') schema.type = 'string';
    Object.values(schema).forEach(value => {
      if (Array.isArray(value)) value.forEach(declareStringEnums);
      else if (value && typeof value === 'object') declareStringEnums(value);
    });
  };
  declareStringEnums(parameters);
  return { type: 'function', function: { name: canvasControlTool.name,
    description: 'Operate the active Nako project by calling canvas_control directly with a JSON object. '
      + 'Start with {"action":"read"}; use the returned revision for edits. '
      + 'Use {"action":"nodes"} to discover nodes and their parameter/port schemas. Use its node: revision for runNode. Runs needing capabilities return nodeState awaiting_approval and a user approval card; never approve or resubmit them yourself. Query nodeStatus with operationId=nodeRunId after approval. Nodes execute on the backend even when the panel closes. '
      + 'To prepare a video node: query {"action":"models","type":"Video"}, then query the chosen exact model name for parameters; '
      + 'Example edit: {"action":"edit","revision":"returned revision","operations":[{"kind":"create","ref":"video","type":"Video","x":0,"y":0,"prompt":"the complete prompt"},{"kind":"configure","nodeId":"video","model":"returned model name","parameters":{}}]}. '
      + 'A create ref is used directly as nodeId within that batch, without a prefix. Creation and configuration do not generate media. '
      + 'Connect reference nodes with edit operations using sourceId and targetId, for example {"kind":"connect","sourceId":"existing reference node ID","targetId":"video"}. Put create, configure and all connect operations in the same edit batch. Never use from/to, source/target or write parentIds in create/update. Use sourcePort/targetPort only as numeric port indices when needed. '
      + 'To generate from existing Image/Video/Audio/Text canvas nodes, call generation_control with {"action":"prepareGeneration","revision":"latest canvas revision","nodeIds":["target node ID"]} after connecting references. runNode creates a separate backend node execution using nodeType and literal input values; it does not run an existing canvas node and does not accept nodeId. '
      + 'prepareGeneration follows the user-selected confirmation mode: awaiting-approval needs the user, running means already submitted for execution; inspect tasks and never submit the batch again. '
      + canvasControlTool.description.slice(canvasControlTool.description.indexOf('media inspect')), parameters } };
}

/** Static correction metadata only: never echo model-supplied values or unknown field names. */
export function invalidCanvasArguments(command) {
  const action = Object.hasOwn(actions, command?.action) ? command.action : null;
  const kinds = new Set((Array.isArray(command?.operations) ? command.operations : [])
    .map(op => op?.kind).filter(kind => Object.hasOwn(edits, kind)));
  const shape = (required, optional = []) => ({ required, allowedFields: [...required, ...optional] });
  return { ok: false, code: 'INVALID', message: command === undefined
    ? 'function.arguments 不是合法 JSON，本次未执行。必须使用双引号包裹键名和字符串，并完整保留首尾大括号。例如：{"action":"read"}。请修正序列化格式。'
    : '工具参数未通过校验，本次未执行。按 expected 修正参数后再调用；省略无关字段。',
    expected: action ? { action, ...shape(['action', ...actions[action][0]], actions[action][1]),
      ...(action === 'models' ? { type: ['Image', 'Video', 'Audio', 'Text'] } : {}),
      ...(action === 'runNode' ? { usage: '运行已有画布节点请调用 generation_control.prepareGeneration(revision,nodeIds)。runNode 按 nodeType 运行新实例，不接受 nodeId；inputs.value 是实际输入值，不是画布节点 ID。' } : {}),
      ...(action === 'edit' ? { operations: Object.entries(edits).filter(([kind]) => !kinds.size || kinds.has(kind)).map(([kind, required]) => ({ kind, ...shape(['kind', ...required], optional[kind]) })),
        revision: '先 read，使用返回的最新 revision。', nodeType: ['Image', 'Video', 'Audio', 'Text'],
        connect: '连接只能用 kind=connect、sourceId、targetId；同批创建的节点直接使用 ref。不得用 from/to、source/target 或修改 parentIds。',
        configure: 'model 使用 models 返回的完整名称；parameters 只填该模型公开的参数，使用默认值时传 {}。prompt 属于 create 或 update.patch。' } : {}) }
      : { actions: Object.keys(actions), firstCall: { action: 'read' } } };
}

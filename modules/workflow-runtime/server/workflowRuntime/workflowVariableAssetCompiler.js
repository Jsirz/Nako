import {
  WorkflowBindingError,
  cloneNullPrototype,
  define,
  isConnection,
} from './workflowBindingValidation.js';

export function nextNumericNodeId(workflow) {
  const maximum = Object.keys(workflow).reduce((current, key) => {
    const value = Number(key);
    return Number.isSafeInteger(value) && value >= 0 ? Math.max(current, value) : current;
  }, 0);
  let next = maximum + 1;
  while (Object.hasOwn(workflow, String(next))) next += 1;
  return String(next);
}

export function assertVariableGroupIntegrity(compiled, binding) {
  const group = binding.variableAssetGroup;
  const target = compiled[group.targetNodeId];
  if (!target || target.class_type !== group.targetClassType) {
    throw new WorkflowBindingError(
      `${binding.label}动态素材目标已经变化`,
      'INVALID_BINDING_TARGET',
      409,
    );
  }
  for (const branch of group.branches) {
    const source = compiled[branch.sourceNodeId];
    if (
      !source ||
      source.class_type !== branch.sourceClassType ||
      !Object.hasOwn(source.inputs || {}, branch.assetFieldName) ||
      isConnection(source.inputs[branch.assetFieldName])
    ) {
      throw new WorkflowBindingError(
        `${binding.label}素材加载分支已经变化`,
        'INVALID_BINDING_TARGET',
        409,
      );
    }
    for (const connection of branch.connections) {
      const current = target.inputs?.[connection.targetFieldName];
      if (
        !isConnection(current) ||
        String(current[0]) !== branch.sourceNodeId ||
        current[1] !== connection.outputIndex
      ) {
        throw new WorkflowBindingError(
          `${binding.label}素材连线已经变化`,
          'INVALID_BINDING_TARGET',
          409,
        );
      }
    }
  }
  return target;
}

export function compileVariableAssetGroup(compiled, binding, resolvedAssets) {
  const group = binding.variableAssetGroup;
  const target = assertVariableGroupIntegrity(compiled, binding);
  const syntheticTemplate = group.syntheticTemplate;
  const template = group.templateSourceNodeId
    ? compiled[group.templateSourceNodeId]
    : syntheticTemplate?.node;
  for (let index = 0; index < group.branches.length; index += 1) {
    const branch = group.branches[index];
    if (index < resolvedAssets.length) {
      define(
        compiled[branch.sourceNodeId].inputs,
        branch.assetFieldName,
        cloneNullPrototype(resolvedAssets[index].value),
      );
      continue;
    }
    for (const connection of branch.connections) {
      delete target.inputs[connection.targetFieldName];
    }
    delete compiled[branch.sourceNodeId];
  }
  if (resolvedAssets.length <= group.branches.length) return;
  if (!group.extendable || !template) {
    throw new WorkflowBindingError(
      `${binding.label}超过当前工作流可安全扩展的容量`,
      'VARIABLE_ASSET_GROUP_CAPACITY_EXCEEDED',
    );
  }
  const connectionTemplates = group.branches[0]?.connections || syntheticTemplate?.connections;
  const assetFieldName = group.branches[0]?.assetFieldName || syntheticTemplate?.assetFieldName;
  if (!Array.isArray(connectionTemplates) || !assetFieldName) {
    throw new WorkflowBindingError(
      `${binding.label}缺少可验证的加载器模板`,
      'VARIABLE_ASSET_GROUP_TEMPLATE_MISSING',
      409,
    );
  }
  let nextId = nextNumericNodeId(compiled);
  for (let index = group.branches.length; index < resolvedAssets.length; index += 1) {
    while (Object.hasOwn(compiled, nextId)) nextId = String(Number(nextId) + 1);
    const source = cloneNullPrototype(template);
    define(source.inputs, assetFieldName, resolvedAssets[index].value);
    define(compiled, nextId, source);
    for (const connection of connectionTemplates) {
      define(target.inputs, `${connection.groupName}.${connection.prefix}${index}`, [
        nextId,
        connection.outputIndex,
      ]);
    }
    nextId = String(Number(nextId) + 1);
  }
}

export function objectInfoWithAssetValues(nodeDefinitions, compiledAssets) {
  const cloned = cloneNullPrototype(nodeDefinitions);
  for (const asset of compiledAssets) {
    const definition = cloned[asset.binding.target.expectedClassType];
    const fieldName = asset.binding.target.fieldName;
    const specification =
      definition?.input?.required?.[fieldName] || definition?.input?.optional?.[fieldName];
    if (!Array.isArray(specification) || !Array.isArray(specification[0])) continue;
    const values = Array.isArray(asset.compiledValue) ? asset.compiledValue : [asset.compiledValue];
    specification[0] = [...new Set([...specification[0], ...values])];
  }
  return cloned;
}

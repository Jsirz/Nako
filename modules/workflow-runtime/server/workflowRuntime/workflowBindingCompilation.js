import { analyzeWorkflow, normalizeApiWorkflow, sha256Json } from './workflowFormat.js';

import { cloudMediaEmptyValue, isAbsentMediaInput, isCloudDeployment } from './cloudMediaInputs.js';
import { deriveBindingCandidates } from './workflowBindingCandidates.js';
import {
  assertReferences,
  assertRequestBudgets,
  assertSafeKey,
  cloneNullPrototype,
  define,
  isBindingRequiredForDeployment,
  isConnection,
  validateAssetReference,
  validateScalarValue,
  WorkflowBindingError,
} from './workflowBindingValidation.js';
import { randomInteger, resolveSeedValue } from './workflowSeedPolicy.js';
import {
  compileVariableAssetGroup,
  objectInfoWithAssetValues,
} from './workflowVariableAssetCompiler.js';

export async function compileWorkflowBindings({
  executionPlan,
  bindingSet,
  deployment,
  projectId,
  values = {},
  resolveAsset,
  generateRandomInteger = randomInteger,
  seedResolutionCache = new Map(),
}) {
  assertRequestBudgets(values);
  const normalizedSource = normalizeApiWorkflow(executionPlan);
  const executionPlanHash = sha256Json(normalizedSource);
  assertReferences({
    executionPlanHash,
    bindingSet,
    deployment,
    projectId: String(projectId || ''),
  });
  const bindingByKey = new Map(bindingSet.bindings.map((binding) => [binding.key, binding]));
  for (const key of Object.keys(values)) {
    if (!bindingByKey.has(key)) {
      throw new WorkflowBindingError(`未授权的参数：${key}`, 'UNKNOWN_BINDING_VALUE');
    }
  }

  const compiled = cloneNullPrototype(normalizedSource);
  const emptyMedia = new Map();
  validateCloudMediaInputs(deployment, bindingSet, normalizedSource, values, emptyMedia);
  const compiledAssets = [];
  const resolvedValues = Object.create(null);
  const resolvedSeeds = [];
  const seedAdvancements = [];
  for (const binding of bindingSet.bindings) {
    assertSafeKey(binding.key);
    const supplied = Object.hasOwn(values, binding.key);
    let value = supplied ? values[binding.key] : binding.control.defaultValue;
    const clearingAsset = emptyMedia.has(binding.key);
    if (clearingAsset) value = emptyMedia.get(binding.key);
    if (value === undefined && binding.variableAssetGroup) value = [];
    if (value === undefined) {
      if (isBindingRequiredForDeployment(binding, deployment)) {
        throw new WorkflowBindingError(`${binding.label}为必填参数`, 'MISSING_BINDING_VALUE');
      }
      continue;
    }

    if (binding.control.kind === 'asset' && !clearingAsset) {
      if (typeof resolveAsset !== 'function') {
        throw new WorkflowBindingError('素材解析器未配置', 'ASSET_RESOLVER_UNAVAILABLE', 500);
      }
      const resolved = await resolveBindingAssets(binding, value, projectId, resolveAsset);
      value = binding.control.multiple ? resolved.map((asset) => asset.value) : resolved[0].value;
      compiledAssets.push({ binding, assets: resolved, compiledValue: value });
      if (binding.variableAssetGroup) {
        compileVariableAssetGroup(compiled, binding, resolved);
        define(resolvedValues, binding.key, cloneNullPrototype(value));
        continue;
      }
    } else if (binding.control.kind === 'seed') {
      const seed = resolveSeedValue(value, binding, generateRandomInteger, seedResolutionCache);
      value = seed.resolvedSeed;
      resolvedSeeds.push(seed.metadata);
      if (seed.advancement) seedAdvancements.push(seed.advancement);
    } else if (!clearingAsset) {
      value = validateScalarValue(value, binding);
    }

    writeBindingValue(compiled, binding, value, resolvedValues);
  }

  const analysisObjectInfo = objectInfoWithAssetValues(
    deployment.relevantCapabilities,
    compiledAssets,
  );
  const apiJson = normalizeApiWorkflow(compiled);
  const analysis = analyzeWorkflow(apiJson, 'comfy-api', { objectInfo: analysisObjectInfo });
  if (sha256Json(normalizedSource) !== executionPlanHash) {
    throw new WorkflowBindingError('源执行计划被意外修改', 'EXECUTION_PLAN_MUTATED', 500);
  }
  return {
    apiJson,
    compiledPromptHash: sha256Json(apiJson),
    resolvedValues,
    resolvedSeeds,
    seedAdvancements,
    assets: compiledAssets.flatMap((item) => item.assets),
    analysis,
  };
}

function writeBindingValue(compiled, binding, value, resolvedValues) {
  const node = compiled[binding.target.nodeId];
  if (!node || node.class_type !== binding.target.expectedClassType) {
    throw new WorkflowBindingError(`${binding.label}目标节点已变化`, 'INVALID_BINDING_TARGET', 409);
  }
  if (
    !Object.hasOwn(node.inputs, binding.target.fieldName) ||
    isConnection(node.inputs[binding.target.fieldName])
  ) {
    throw new WorkflowBindingError(
      `${binding.label}目标字段已变化或已连接`,
      'INVALID_BINDING_TARGET',
      409,
    );
  }
  define(node.inputs, binding.target.fieldName, cloneNullPrototype(value));
  define(resolvedValues, binding.key, cloneNullPrototype(value));
}

async function resolveBindingAssets(binding, value, projectId, resolveAsset) {
  const references = binding.control.multiple ? (Array.isArray(value) ? value : [value]) : [value];
  if (!binding.control.multiple && Array.isArray(value)) {
    throw new WorkflowBindingError(`${binding.label}不支持多素材`, 'INVALID_BINDING_ASSET');
  }
  if (references.length > (binding.control.maximumItems || 1)) {
    throw new WorkflowBindingError(`${binding.label}素材数量超过限制`, 'INVALID_BINDING_ASSET');
  }
  const minimumItems = Math.max(0, Number(binding.control.minimumItems || 0));
  if (references.length < minimumItems) {
    throw new WorkflowBindingError(
      `${binding.label}至少需要 ${minimumItems} 个素材`,
      'MISSING_BINDING_VALUE',
    );
  }
  const resolved = [];
  for (const candidate of references) {
    const reference = validateAssetReference(candidate, binding, String(projectId));
    const asset = await resolveAsset(reference, { binding, projectId: String(projectId) });
    if (!asset || !Object.hasOwn(asset, 'value')) {
      throw new WorkflowBindingError(`${binding.label}素材不存在`, 'ASSET_NOT_FOUND', 404);
    }
    resolved.push(asset);
  }
  return resolved;
}

function validateCloudMediaInputs(deployment, bindingSet, normalizedSource, values, emptyMedia) {
  if (isCloudDeployment(deployment)) {
    const boundTargets = new Set(
      bindingSet.bindings.map((binding) => `${binding.target.nodeId}\n${binding.target.fieldName}`),
    );
    for (const candidate of deriveBindingCandidates({
      executionPlan: normalizedSource,
      nodeDefinitions: deployment.relevantCapabilities,
    })) {
      if (
        candidate.control === 'asset' &&
        !candidate.variableAssetGroup &&
        !boundTargets.has(`${candidate.nodeId}\n${candidate.fieldName}`)
      ) {
        throw new WorkflowBindingError(
          `云端素材输入「${candidate.fieldName}」尚未映射到画布，请重新导入或补齐输入映射。`,
          'BINDING_MEDIA_UNMAPPED',
        );
      }
    }
    // Validate every absent media input before resolving/uploading any asset.
    for (const binding of bindingSet.bindings) {
      if (binding.control.kind !== 'asset' || binding.variableAssetGroup) continue;
      const value = Object.hasOwn(values, binding.key)
        ? values[binding.key]
        : binding.control.defaultValue;
      if (!isAbsentMediaInput(value)) continue;
      if (isBindingRequiredForDeployment(binding, deployment)) {
        throw new WorkflowBindingError(
          `${binding.label}为必填素材，请连接后再运行。`,
          'MISSING_BINDING_VALUE',
        );
      }
      const contract = cloudMediaEmptyValue(deployment, binding, normalizedSource);
      if (!Object.hasOwn(contract, 'emptyValue')) {
        throw new WorkflowBindingError(
          `云端未提供「${binding.label}」的空值规则，无法确认如何清除内置素材。请连接该素材；旧导入可重新导入以更新字段信息。`,
          'BINDING_MEDIA_EMPTY_UNSUPPORTED',
        );
      }
      emptyMedia.set(binding.key, contract.emptyValue);
    }
  }
}

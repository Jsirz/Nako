import crypto from 'node:crypto';

import { analyzeWorkflow, normalizeApiWorkflow, sha256Json } from './workflowFormat.js';

import { deriveVariableAssetGroupCandidates } from './workflowVariableAssetGroups.js';

import {
  assertNoDangerousKeys,
  assertSafeKey,
  assertSafeText,
  cloneNullPrototype,
  DANGEROUS_KEYS,
  isPlainObject,
  WorkflowBindingError,
} from './workflowBindingValidation.js';

export const CONTROL_KINDS = new Set([
  'text',
  'textarea',
  'number',
  'slider',
  'toggle',
  'select',
  'seed',
  'asset',
]);

export function candidateId(candidate) {
  return sha256Json({
    nodeId: String(candidate.nodeId),
    classType: candidate.classType,
    fieldName: candidate.fieldName,
  });
}

export function defaultControl(candidate) {
  if (!CONTROL_KINDS.has(candidate.control)) return 'text';
  return candidate.control;
}

export function compatibleControlKinds(candidate) {
  if (candidate.control === 'asset') return new Set(['asset']);
  if (candidate.control === 'seed') return new Set(['seed', 'number']);
  if (candidate.valueType === 'STRING') return new Set(['text', 'textarea']);
  if (['INT', 'FLOAT', 'NUMBER'].includes(candidate.valueType))
    return new Set(['number', 'slider']);
  if (candidate.valueType === 'BOOLEAN') return new Set(['toggle']);
  if (candidate.valueType === 'COMBO') return new Set(['select']);
  return new Set([defaultControl(candidate)]);
}

export function bindingDefault(candidate, controlKind) {
  if (controlKind === 'asset') return undefined;
  if (controlKind === 'seed') return { mode: 'fixed', value: candidate.value };
  return cloneNullPrototype(candidate.value);
}

export function deriveBindingCandidates({ executionPlan, nodeDefinitions }) {
  const normalized = normalizeApiWorkflow(executionPlan);
  const analysis = analyzeWorkflow(normalized, 'comfy-api', { objectInfo: nodeDefinitions });
  const candidates = analysis.candidateBindings
    .filter(
      (candidate) =>
        ![String(candidate.nodeId), candidate.classType, candidate.fieldName].some((value) =>
          DANGEROUS_KEYS.has(value),
        ),
    )
    .map((candidate) => {
      if (Array.isArray(candidate.options)) {
        const totalBytes = Buffer.byteLength(JSON.stringify(candidate.options), 'utf8');
        if (candidate.options.length > 5_000 || totalBytes > 1024 * 1024) {
          throw new WorkflowBindingError(
            `${candidate.nodeTitle} · ${candidate.fieldName} 的选项超过外置限制`,
            'BINDING_OPTIONS_LIMIT',
          );
        }
      }
      return { ...candidate, id: candidateId(candidate) };
    });
  return deriveVariableAssetGroupCandidates({
    executionPlan: normalized,
    nodeDefinitions,
    candidates,
  });
}

export function deriveBindingSetBindings({ executionPlan, nodeDefinitions, selections }) {
  if (!Array.isArray(selections) || selections.length > 256) {
    throw new WorkflowBindingError('参数选择数量超过限制', 'BINDING_SET_SIZE_LIMIT');
  }
  const candidates = deriveBindingCandidates({ executionPlan, nodeDefinitions });
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selectedCandidateIds = new Set(
    selections.map((selection) => String(selection?.candidateId || '')),
  );
  const automaticGroupSelections = candidates
    .filter((candidate) => candidate.variableAssetGroup && !selectedCandidateIds.has(candidate.id))
    .map((candidate) => {
      const rawKey = `${candidate.fieldName}_${candidate.nodeId}`.replace(/[^A-Za-z0-9._-]/g, '_');
      const label =
        candidate.mediaKind === 'video'
          ? '参考视频'
          : candidate.mediaKind === 'audio'
            ? '参考音频'
            : '参考图片';
      return {
        candidateId: candidate.id,
        key: /^[A-Za-z]/.test(rawKey)
          ? rawKey.slice(0, 64)
          : `asset_group_${candidate.id.slice(0, 12)}`,
        label,
        section: '参考素材',
      };
    });
  const effectiveSelections = [...selections, ...automaticGroupSelections];
  if (effectiveSelections.length > 256) {
    throw new WorkflowBindingError('参数选择数量超过限制', 'BINDING_SET_SIZE_LIMIT');
  }
  const bindings = [];
  const keys = new Set();

  for (let index = 0; index < effectiveSelections.length; index += 1) {
    const selection = effectiveSelections[index];
    if (!isPlainObject(selection)) {
      throw new WorkflowBindingError('参数选择格式无效', 'INVALID_BINDING_SELECTION');
    }
    assertNoDangerousKeys(selection);
    const allowedSelectionKeys = new Set([
      'candidateId',
      'key',
      'label',
      'description',
      'controlKind',
      'section',
      'advanced',
    ]);
    if (Object.keys(selection).some((key) => !allowedSelectionKeys.has(key))) {
      throw new WorkflowBindingError(
        '客户端不能覆盖参数目标或节点能力',
        'INVALID_BINDING_SELECTION',
      );
    }
    const candidate = candidateById.get(String(selection.candidateId || ''));
    if (!candidate) {
      throw new WorkflowBindingError('参数候选不存在或已变化', 'INVALID_BINDING_TARGET', 409);
    }
    const key = assertSafeKey(selection.key || `input_${index + 1}`);
    if (keys.has(key)) {
      throw new WorkflowBindingError('参数 key 重复', 'INVALID_BINDING_KEY');
    }
    keys.add(key);
    const { variableAssetGroup, control } = createBindingControl(selection, candidate);
    bindings.push({
      id: crypto.randomUUID(),
      key,
      label:
        assertSafeText(
          selection.label,
          '参数名称',
          120,
          `${candidate.nodeTitle} · ${candidate.fieldName}`,
        ) || `${candidate.nodeTitle} · ${candidate.fieldName}`,
      description: assertSafeText(selection.description, '参数说明', 1_000),
      target: {
        nodeId: String(candidate.nodeId),
        expectedClassType: candidate.classType,
        fieldName: candidate.fieldName,
        expectedValueType: candidate.valueType,
      },
      ...(variableAssetGroup ? { variableAssetGroup: cloneNullPrototype(variableAssetGroup) } : {}),
      control,
      presentation: {
        section: assertSafeText(selection.section, '参数分组', 120, '基础参数') || '基础参数',
        order: index,
        advanced: Boolean(selection.advanced),
      },
    });
  }
  return bindings;
}

function createBindingControl(selection, candidate) {
  const requestedKind = selection.controlKind || defaultControl(candidate);
  if (!compatibleControlKinds(candidate).has(requestedKind)) {
    throw new WorkflowBindingError('控件类型与节点参数不兼容', 'INVALID_BINDING_CONTROL');
  }
  const defaultValue = bindingDefault(candidate, requestedKind);
  const variableAssetGroup = candidate.variableAssetGroup;
  const control = {
    kind: requestedKind,
    mediaKind: candidate.mediaKind,
    required:
      requestedKind === 'asset'
        ? variableAssetGroup
          ? candidate.required && variableAssetGroup.minimumItems > 0
          : candidate.required
        : candidate.required,
    minimum: candidate.minimum,
    maximum: candidate.maximum,
    step: candidate.step,
    options: candidate.options,
    multiple: Boolean(variableAssetGroup),
    minimumItems: variableAssetGroup?.minimumItems,
    maximumItems: variableAssetGroup?.maximumItems || 1,
    capacity: variableAssetGroup?.capacity,
  };
  if (defaultValue !== undefined) control.defaultValue = defaultValue;
  return { variableAssetGroup, control };
}

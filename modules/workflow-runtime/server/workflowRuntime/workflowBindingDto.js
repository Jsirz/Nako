import { sha256Json } from './workflowFormat.js';

import {
  cloneNullPrototype,
  define,
  isPlainObject,
  WorkflowBindingError,
} from './workflowBindingValidation.js';

export function toBindingCandidateDto(candidate) {
  const opaqueSuffix = String(candidate.id || '').slice(0, 10) || 'unknown';
  return {
    id: candidate.id,
    nodeId: safePublicText(candidate.nodeId, `node-${opaqueSuffix}`, 160),
    classType: safePublicText(candidate.classType, '本机节点', 160),
    nodeTitle: safePublicText(candidate.nodeTitle, '本机节点', 120),
    fieldName: safePublicText(candidate.fieldName, `input-${opaqueSuffix}`, 160),
    valueType: candidate.valueType,
    required: candidate.required,
    control: candidate.control,
    mediaKind: candidate.mediaKind,
    hasDefault: candidate.control !== 'asset',
    optionCount: Array.isArray(candidate.options) ? candidate.options.length : 0,
    minimum: candidate.minimum,
    maximum: candidate.maximum,
    step: candidate.step,
    minimumItems: candidate.variableAssetGroup?.minimumItems,
    maximumItems: candidate.variableAssetGroup?.maximumItems,
    capacity: candidate.variableAssetGroup?.capacity,
  };
}

export function publicOptionId(bindingId, value) {
  return sha256Json({ bindingId, value });
}

export function looksSensitiveString(value) {
  const text = String(value || '');
  return (
    /(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|\\\\|file:\/\/|\/(?!\/)[^\s"'<>]+)/i.test(text) ||
    /https?:\/\/[^\s"'<>]+/i.test(text) ||
    /(?:api[_ -]?key|authorization|bearer|token|secret|password)\s*[:=]/i.test(text)
  );
}

export function safePublicText(value, fallback, maximum) {
  const text = String(value ?? '').trim();
  if (
    !text ||
    // eslint-disable-next-line no-control-regex -- Deliberately reject or strip control characters.
    /[\0\r\n\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(text) ||
    looksSensitiveString(text)
  )
    return fallback;
  return text.slice(0, maximum);
}

export function safeOptionLabel(value, index) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return `选项 ${index + 1}`;
  }
  const text = String(value);
  if (looksSensitiveString(text)) return `本机选项 ${index + 1}`;
  return text.slice(0, 512);
}

export function toBindingSetDto(record) {
  return {
    id: record.id,
    definitionId: record.definitionId,
    definitionRevision: record.definitionRevision,
    executionPlanHash: record.executionPlanHash,
    revision: record.revision,
    previousBindingSetId: record.previousBindingSetId,
    name: safePublicText(record.name, '参数配置', 120),
    bindingSetHash: record.bindingSetHash,
    createdAt: record.createdAt,
    bindings: record.bindings.map((binding) => {
      const options = Array.isArray(binding.control.options)
        ? binding.control.options.map((value, index) => ({
            id: publicOptionId(binding.id, value),
            label: safeOptionLabel(value, index),
          }))
        : [];
      const defaultValue = binding.control.defaultValue;
      const publicDefaultValue =
        binding.control.kind === 'select'
          ? publicOptionId(binding.id, defaultValue)
          : typeof defaultValue === 'string' && looksSensitiveString(defaultValue)
            ? undefined
            : defaultValue;
      return {
        id: binding.id,
        key: binding.key,
        label: safePublicText(binding.label, binding.key, 120),
        description: safePublicText(binding.description, '', 1_000),
        control: {
          kind: binding.control.kind,
          mediaKind: binding.control.mediaKind,
          required: binding.control.required,
          minimum: binding.control.minimum,
          maximum: binding.control.maximum,
          step: binding.control.step,
          multiple: binding.control.multiple,
          minimumItems: binding.control.minimumItems,
          maximumItems: binding.control.maximumItems,
          capacity: binding.control.capacity,
          options,
          hasDefault: defaultValue !== undefined,
          ...(publicDefaultValue !== undefined ? { defaultValue: publicDefaultValue } : {}),
        },
        presentation: {
          section: safePublicText(binding.presentation?.section, '基础参数', 120),
          order: binding.presentation?.order,
          advanced: Boolean(binding.presentation?.advanced),
        },
      };
    }),
  };
}

export function resolvePublicBindingValues(bindingSet, values) {
  if (!isPlainObject(values)) return values;
  const resolved = cloneNullPrototype(values);
  for (const binding of bindingSet.bindings) {
    if (binding.control.kind !== 'select' || !Object.hasOwn(resolved, binding.key)) continue;
    const requestedId = resolved[binding.key];
    const option = binding.control.options?.find(
      (value) => publicOptionId(binding.id, value) === requestedId,
    );
    if (option === undefined) {
      throw new WorkflowBindingError(`${binding.label}选项无效`, 'INVALID_BINDING_VALUE');
    }
    define(resolved, binding.key, option);
  }
  return resolved;
}

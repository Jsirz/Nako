import type { WorkflowCanvasBlueprint, WorkflowSeedAdvancement } from './workflowManagerClient';

export function normalizeSelectParameterValues(
  schema: WorkflowCanvasBlueprint['parameterSchema'],
  values: Record<string, unknown>,
): Record<string, unknown> {
  for (const parameter of schema) {
    if (String(parameter.control?.kind || '').toLowerCase() !== 'select') continue;
    const currentValue = values[parameter.key];
    const options = Array.isArray(parameter.control?.options) ? parameter.control.options : [];
    if (options.some((option) => option.id === currentValue)) continue;
    const legacyMatches = options.filter((option) => option.label === currentValue);
    if (legacyMatches.length === 1) values[parameter.key] = legacyMatches[0].id;
  }
  return values;
}

export function finiteNumericValue(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function applyWorkflowSeedAdvancements(
  values: Record<string, unknown>,
  advancements: readonly WorkflowSeedAdvancement[] | undefined,
): Record<string, unknown> {
  if (!Array.isArray(advancements) || advancements.length === 0) return values;
  let nextValues = values;
  for (const advancement of advancements) {
    if (
      !advancement ||
      !['increment', 'decrement'].includes(advancement.mode) ||
      !Number.isSafeInteger(advancement.previousValue) ||
      !Number.isSafeInteger(advancement.nextValue) ||
      !Number.isSafeInteger(advancement.step) ||
      advancement.step <= 0
    )
      continue;
    const current = values[advancement.bindingKey];
    if (!current || typeof current !== 'object' || Array.isArray(current)) continue;
    const policy = current as { mode?: unknown; value?: unknown; step?: unknown };
    if (
      policy.mode !== advancement.mode ||
      Number(policy.value) !== advancement.previousValue ||
      (policy.step !== undefined && Number(policy.step) !== advancement.step)
    )
      continue;
    if (nextValues === values) nextValues = { ...values };
    nextValues[advancement.bindingKey] = {
      mode: advancement.mode,
      value: advancement.nextValue,
      step: advancement.step,
    };
  }
  return nextValues;
}

export function normalizeNumericParameterValues(
  schema: WorkflowCanvasBlueprint['parameterSchema'],
  values: Record<string, unknown>,
): Record<string, unknown> {
  for (const parameter of schema) {
    const kind = String(parameter.control?.kind || '').toLowerCase();
    if (!['number', 'slider', 'seed'].includes(kind)) continue;
    const currentValue = values[parameter.key];
    const seedPolicy =
      kind === 'seed' && currentValue && typeof currentValue === 'object'
        ? String((currentValue as { mode?: unknown }).mode || 'fixed')
        : 'fixed';
    if (kind === 'seed' && seedPolicy === 'random') {
      values[parameter.key] = { mode: 'random' };
      continue;
    }
    if (kind === 'seed' && !['fixed', 'increment', 'decrement'].includes(seedPolicy)) {
      throw new Error(`${parameter.label}种子策略无效`);
    }
    const currentNumeric =
      kind === 'seed' && currentValue && typeof currentValue === 'object'
        ? (currentValue as { value?: unknown }).value
        : currentValue;
    const defaultValue = parameter.control.defaultValue;
    const defaultNumeric =
      kind === 'seed' && defaultValue && typeof defaultValue === 'object'
        ? (defaultValue as { value?: unknown }).value
        : defaultValue;
    const numericValue = finiteNumericValue(currentNumeric) ?? finiteNumericValue(defaultNumeric);
    if (numericValue === undefined) {
      if (!parameter.control.required) {
        delete values[parameter.key];
        continue;
      }
      throw new Error(`${parameter.label}请输入有效数字`);
    }
    if (
      Number.isFinite(parameter.control.minimum) &&
      numericValue < Number(parameter.control.minimum)
    ) {
      throw new Error(`${parameter.label}不能小于 ${parameter.control.minimum}`);
    }
    if (
      Number.isFinite(parameter.control.maximum) &&
      numericValue > Number(parameter.control.maximum)
    ) {
      throw new Error(`${parameter.label}不能大于 ${parameter.control.maximum}`);
    }
    if (kind !== 'seed') {
      values[parameter.key] = numericValue;
      continue;
    }
    if (seedPolicy === 'fixed') {
      values[parameter.key] = { mode: 'fixed', value: numericValue };
      continue;
    }
    const declaredStep =
      Number.isFinite(parameter.control.step) && Number(parameter.control.step) > 0
        ? Number(parameter.control.step)
        : 1;
    const policyStep =
      currentValue && typeof currentValue === 'object'
        ? (finiteNumericValue((currentValue as { step?: unknown }).step) ?? declaredStep)
        : declaredStep;
    if (!Number.isSafeInteger(policyStep) || policyStep <= 0 || policyStep !== declaredStep) {
      throw new Error(`${parameter.label}种子步长无效`);
    }
    values[parameter.key] = { mode: seedPolicy, value: numericValue, step: policyStep };
  }
  return values;
}

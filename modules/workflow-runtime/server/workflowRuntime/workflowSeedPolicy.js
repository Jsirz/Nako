import crypto from 'node:crypto';

import { sha256Json } from './workflowFormat.js';

import {
  WorkflowBindingError,
  isPlainObject,
  validateNumber,
} from './workflowBindingValidation.js';

export function randomInteger(minimum, maximum) {
  const lower = Math.ceil(minimum);
  const upper = Math.floor(maximum);
  if (!Number.isSafeInteger(lower) || !Number.isSafeInteger(upper) || lower > upper) {
    throw new WorkflowBindingError('随机种子范围无效', 'INVALID_BINDING_VALUE');
  }
  const span = BigInt(upper) - BigInt(lower) + 1n;
  const sampleSpace = 1n << 53n;
  if (span > sampleSpace) {
    throw new WorkflowBindingError('随机种子范围超过安全整数限制', 'INVALID_BINDING_VALUE');
  }
  const acceptedUpperBound = sampleSpace - (sampleSpace % span);
  let sample;
  do {
    const bytes = crypto.randomBytes(7);
    sample = BigInt(`0x${bytes.toString('hex')}`) & (sampleSpace - 1n);
  } while (sample >= acceptedUpperBound);
  return Number(BigInt(lower) + (sample % span));
}

export function resolveSeedValue(value, binding, randomIntegerGenerator, resolutionCache) {
  const policy = typeof value === 'number' ? { mode: 'fixed', value } : value;
  if (
    !isPlainObject(policy) ||
    !['fixed', 'random', 'increment', 'decrement'].includes(policy.mode)
  ) {
    throw new WorkflowBindingError(`${binding.label}随机种子格式无效`, 'INVALID_BINDING_VALUE');
  }
  // ComfyUI may declare uint64 bounds; JS/JSON seed values must remain exact integers.
  const minimum = Math.max(
    Number.MIN_SAFE_INTEGER,
    Math.ceil(Number.isFinite(binding.control.minimum) ? binding.control.minimum : 0),
  );
  const maximum = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.floor(Number.isFinite(binding.control.maximum) ? binding.control.maximum : 2_147_483_647),
  );
  const cacheFingerprint = sha256Json({
    mode: policy.mode,
    value: policy.value,
    step: policy.step,
    minimum,
    maximum,
  });
  const cached = resolutionCache.get(binding.key);
  if (cached?.fingerprint === cacheFingerprint) return cached.resolution;

  let resolvedSeed;
  let advancement;
  if (policy.mode === 'random') {
    resolvedSeed = validateNumber(randomIntegerGenerator(minimum, maximum), binding, true);
    if (!Number.isSafeInteger(resolvedSeed)) {
      throw new WorkflowBindingError(`${binding.label}必须是安全整数`, 'INVALID_BINDING_VALUE');
    }
  } else {
    resolvedSeed = validateNumber(policy.value, binding, true);
    if (!Number.isSafeInteger(resolvedSeed)) {
      throw new WorkflowBindingError(`${binding.label}必须是安全整数`, 'INVALID_BINDING_VALUE');
    }
    if (policy.mode === 'increment' || policy.mode === 'decrement') {
      const declaredStep =
        Number.isFinite(binding.control.step) && binding.control.step > 0
          ? Number(binding.control.step)
          : 1;
      const step = policy.step === undefined ? declaredStep : Number(policy.step);
      if (!Number.isSafeInteger(step) || step <= 0 || step !== declaredStep) {
        throw new WorkflowBindingError(`${binding.label}种子步长无效`, 'INVALID_BINDING_VALUE');
      }
      const candidate = policy.mode === 'increment' ? resolvedSeed + step : resolvedSeed - step;
      const nextValue = Math.min(maximum, Math.max(minimum, candidate));
      validateNumber(nextValue, binding, true);
      advancement = {
        bindingKey: binding.key,
        mode: policy.mode,
        previousValue: resolvedSeed,
        nextValue,
        step,
      };
    }
  }
  const resolution = {
    resolvedSeed,
    metadata: {
      bindingKey: binding.key,
      seedPolicy: policy.mode,
      resolvedSeed,
    },
    ...(advancement ? { advancement } : {}),
  };
  resolutionCache.set(binding.key, { fingerprint: cacheFingerprint, resolution });
  return resolution;
}

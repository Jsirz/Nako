/** Logging boundary: module identity and bounded, redacted context accompany every entry. */
const redact = value => String(value)
  .replace(/(?:Bearer\s+|sk-)[\w.-]+/gi, '[REDACTED]')
  .replace(/\b(secret|password|(?:[\w-]*[_-])?token|authorization|api[ _-]?key|credential)\s*["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;&]+)/gi, '$1=[REDACTED]');
const sensitive = /secret|password|token|authorization|api.?key|credential/i;

function scalar(value) {
  return typeof value === 'string' ? redact(value).slice(0, 1024)
    : value == null || typeof value === 'number' || typeof value === 'boolean' ? value : '[omitted]';
}

function fields(context, includeErrors = true) {
  return Object.fromEntries(Object.entries(context).slice(0, 32).map(([key, value]) => [
    redact(key).slice(0, 64),
    sensitive.test(key) ? '[REDACTED]' : includeErrors && value instanceof Error
      ? { name: scalar(value.name), code: scalar(value.code),
        ...(value.status === undefined ? {} : { status: scalar(value.status) }),
        ...(value.context && typeof value.context === 'object'
          ? { context: fields(value.context, false) } : {}) }
      : scalar(value),
  ]));
}

export function createModuleLogger(moduleId, output = console) {
  return Object.freeze(Object.fromEntries(['info', 'warn', 'error'].map(level => [
    level,
    (message, context = {}) => {
      const details = context instanceof Error ? { error: context }
        : context && typeof context === 'object' ? context : {};
      output[level]?.(`[${redact(moduleId).slice(0, 128)}] ${redact(message).slice(0, 1024)}`, fields(details));
    },
  ])));
}

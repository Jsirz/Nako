/** Logging boundary: module identity and bounded, redacted context accompany every entry. */
const redact = value => String(value).replace(/(?:Bearer\s+|sk-)[\w.-]+/gi, '[REDACTED]');
const sensitive = /secret|password|token|authorization|api.?key|credential/i;

export function createModuleLogger(moduleId, output = console) {
  return Object.freeze(Object.fromEntries(['info', 'warn', 'error'].map(level => [
    level,
    (message, context = {}) => {
      const details = context instanceof Error ? { error: context }
        : context && typeof context === 'object' ? context : {};
      const fields = Object.fromEntries(Object.entries(details).map(([key, value]) => [
        key,
        sensitive.test(key) ? '[REDACTED]' : value instanceof Error
          ? { name: value.name, code: value.code }
          : typeof value === 'string' ? redact(value).slice(0, 1024)
            : typeof value === 'number' || typeof value === 'boolean' ? value : '[omitted]',
      ]));
      output[level]?.(`[${moduleId}] ${redact(message)}`, fields);
    },
  ])));
}

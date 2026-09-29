// Loaded only by the backend smoke test, before any plugin captures fetch.
const fetchImpl = globalThis.fetch;
globalThis.fetch = (input, ...args) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (
    ['http:', 'https:'].includes(url.protocol) &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    console.error('UNEXPECTED_OUTBOUND_REQUEST', url.origin);
    throw new Error('Network access is forbidden in the local-only smoke test');
  }
  return fetchImpl(input, ...args);
};

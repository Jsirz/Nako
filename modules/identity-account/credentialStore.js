/** Only the composition root receives this store. Plugins receive host-scoped get(). */
export function createCredentialStore({ declarations, readSecret }) {
  const allowed = new Map(declarations.map(item => [item.id, Object.freeze([...item.keys])]));
  return Object.freeze({
    get(providerId) {
      const keys = allowed.get(providerId);
      if (!keys) throw Object.assign(new Error('Unknown credential namespace'), { code: 'CREDENTIAL_SCOPE_DENIED' });
      const result = Object.create(null);
      for (const key of keys) Object.defineProperty(result, key, { enumerable: false, get: () => readSecret(key) });
      return Object.freeze(result);
    },
  });
}

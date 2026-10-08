import { IDENTITY_ERRORS, identityError } from '../contracts/identityErrors.js';
/** Only the composition root receives this store. Plugins receive host-scoped get(). */
export function createCredentialStore({ declarations, readSecret }) {
  const allowed = new Map(declarations.map(item => [item.id, Object.freeze([...item.keys])]));
  return Object.freeze({
    get(providerId) {
      const keys = allowed.get(providerId);
      if (!keys) throw identityError(IDENTITY_ERRORS.credentialScope, 'Unknown credential namespace', 'credentials.get', 403);
      const result = Object.create(null);
      for (const key of keys) Object.defineProperty(result, key, { enumerable: false, get: () => readSecret(key) });
      return Object.freeze(result);
    },
  });
}

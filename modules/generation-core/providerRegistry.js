import { PluginError, ERRORS, validateProviderDescriptor } from '../contracts/index.js';

/** Application-owned catalog. Only public contracts and wrapped handlers are exposed. */
export class GenerationProviderRegistry {
  #providers = new Map();
  register(descriptor, handler) {
    validateProviderDescriptor(descriptor);
    if (this.#providers.has(descriptor.name)) throw new PluginError(ERRORS.duplicate, `Duplicate provider: ${descriptor.name}`);
    const entry = { descriptor: Object.freeze({ ...descriptor, kinds: Object.freeze([...descriptor.kinds]), requiredSecrets: Object.freeze([...descriptor.requiredSecrets]) }), handler };
    this.#providers.set(descriptor.name, entry);
    return () => { if (this.#providers.get(descriptor.name) === entry) this.#providers.delete(descriptor.name); };
  }
  get(name) { return this.#providers.get(name)?.handler || null; }
  describe(name) { return this.#providers.get(name)?.descriptor || null; }
  list() { return [...this.#providers.values()].map(entry => entry.descriptor); }
}

// One backend process serves one authenticated workspace; tests can create isolated registries.
export const generationProviders = new GenerationProviderRegistry();
export const getGenerationProvider = name => generationProviders.get(name);
export const listGenerationProviders = () => generationProviders.list();

/** Resolve on each call so disable/enable applies to every feature using a model. */
export function requireProvider(registry, name) {
  const provider = registry.get(name);
  if (!provider) {
    const error = new PluginError(ERRORS.inactive, `Provider unavailable: ${name}`);
    error.status = 503;
    throw error;
  }
  return provider;
}

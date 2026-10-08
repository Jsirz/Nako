import { ERRORS, validateProviderDescriptor, validatePluginManifest } from '../contracts/index.js';
import { providerError, wrapProviderError } from '../contracts/providerErrors.js';

const PRIVATE_KEY = /(?:API_KEY|ACCESS_KEY|SECRET_KEY|TOKEN|PASSWORD)$/;
const REQUEST_CONTEXT = new Set(['LOGS_DIR', 'LIBRARY_DIR', 'LIBRARY_MEDIA_DIR', 'HTTPS_PROXY', 'signal', 'generationSignal',
  'generationTaskSubmitting', 'generationTaskSubmitted', 'generationTaskSubmissionRejected', 'NAKO_SINGLE_SUBMIT_ATTEMPT']);
/** Adapt existing provider wire protocols without changing model IDs or recovery receipts. */
export function defineProviderPlugin(manifest, descriptors, loadHandlers) {
  validatePluginManifest(manifest);
  manifest = structuredClone(manifest);
  const definitions = descriptors.map(value => {
    validateProviderDescriptor(value);
    return Object.freeze({ ...value, kinds: Object.freeze([...value.kinds]), requiredSecrets: Object.freeze([...value.requiredSecrets]) });
  });
  if (!manifest.providers || JSON.stringify(manifest.providers) !== JSON.stringify(descriptors))
    throw providerError(`Provider descriptors must match manifest: ${manifest.id}`, { code: ERRORS.invalidManifest, providerId: manifest.id, operation: 'define-plugin' });
  let active = false;
  let inFlight = 0;
  return {
    manifest: structuredClone(manifest),
    canDeactivate: () => inFlight === 0,
    async activate(context) {
      const handlers = await loadHandlers();
      const registry = context.services.get('generation.providers');
      active = true;
      context.onDispose(() => { active = false; });
      for (const descriptor of definitions) {
        const implementation = handlers[descriptor.name];
        if (!implementation) throw providerError(`Missing provider implementation: ${descriptor.name}`, { code: ERRORS.invalidManifest, providerId: descriptor.name, operation: 'activate' });
        const handler = { id: descriptor.name, capabilities: () => [{ id: descriptor.name, kinds: descriptor.kinds, execution: descriptor.execution }] };
        const methods = descriptor.kinds.flatMap(kind => {
          const suffix = kind[0].toUpperCase() + kind.slice(1);
          if (typeof implementation[`generate${suffix}`] !== 'function')
            throw providerError(`Missing generation method: ${descriptor.name}.${kind}`, { code: ERRORS.invalidManifest, providerId: descriptor.name, operation: 'activate' });
          const canRecover = typeof implementation[`canRecover${suffix}`] === 'function';
          const recover = typeof implementation[`recover${suffix}`] === 'function';
          if (canRecover !== recover) throw providerError(`Incomplete recovery contract: ${descriptor.name}.${kind}`, { code: ERRORS.invalidManifest, providerId: descriptor.name, operation: 'activate' });
          return [`generate${suffix}`, ...(recover ? [`canRecover${suffix}`, `recover${suffix}`] : [])];
        });
        for (const method of methods) {
          const value = implementation[method];
          const invoke = args => {
            if (!active || context.signal.aborted) throw providerError(`Provider disabled: ${descriptor.name}`, { code: ERRORS.inactive, providerId: descriptor.name, operation: method });
            const contextIndex = /^(?:canRecover|recover)/.test(method) ? 2 : 1;
            const supplied = args[contextIndex] || {};
              // Secrets are selected by host grants, never by caller-supplied provider config.
              const credentials = context.credentials.get(manifest.id);
              const runtimeKeys = new Set(manifest.contextKeys || []);
              const getValue = key => {
                if (typeof key !== 'string') return undefined;
                if (PRIVATE_KEY.test(key)) return credentials?.[key];
                if (REQUEST_CONTEXT.has(key) || runtimeKeys.has(key)) return supplied[key];
                if (manifest.configPrefixes?.some(prefix => key.startsWith(prefix))) return context.config.get(key);
                return undefined;
              };
              const scoped = new Proxy(Object.create(null), {
                get: (_target, key) => getValue(key),
                has: (_target, key) => getValue(key) !== undefined,
              });
              args[contextIndex] = scoped;
              return value.apply(implementation, args);
          };
          handler[method] = method.startsWith('canRecover')
            ? (...args) => {
              try { return invoke(args); }
              catch (error) { throw wrapProviderError(error, { providerId: descriptor.name, operation: method }); }
            }
            : async (...args) => {
            inFlight++;
            try { return await invoke(args); }
            catch (error) { throw wrapProviderError(error, { providerId: descriptor.name, operation: method }); }
            finally { inFlight--; }
          };
        }
        const wrapped = Object.freeze(handler);
        context.services.register(`provider.${descriptor.name}`, wrapped);
        context.onDispose(registry.register({ ...descriptor, pluginId: manifest.id }, wrapped));
      }
    },
  };
}

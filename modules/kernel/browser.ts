import { PluginHost } from './index.js';
import type { PluginContext } from '../contracts/index.js';

export const browserHost = new PluginHost();
/** Existing adapter declarations remain type-only until each UI surface gets its own API file. */
type AdapterKeys = Extract<keyof Window, `__NAKO_${string}`>;
type BrowserServices = Pick<Window, AdapterKeys>;
const disposers = new Map<PropertyKey, () => void>();
let activatingContext: PluginContext | undefined;
const tracked = new WeakMap<object, Set<object>>();
export function trackBrowserResource<T>(context: PluginContext, value: T): T {
  if (value && typeof value === 'object') {
    const resource = value as { destroy?: () => void; dispose?: () => void };
    const method = resource.destroy || resource.dispose;
    let resources = tracked.get(context);
    if (!resources) {
      resources = new Set();
      tracked.set(context, resources);
    }
    if (typeof method === 'function' && !resources.has(value)) {
      resources.add(value);
      context.onDispose(() => method.call(value));
    }
  }
  return value;
}
export async function activateBrowserModule(context: PluginContext, activate: () => Promise<void>) {
  const previous = activatingContext;
  activatingContext = context;
  try {
    await activate();
  } finally {
    activatingContext = previous;
  }
}
export const browserServices = new Proxy({} as BrowserServices, {
  get: (_target, name) => browserHost.services.optional(`canvas.${String(name)}`),
  set: (_target, name, value) => {
    disposers.get(name)?.();
    if (value !== undefined) {
      const dispose = browserHost.services.register(
        `canvas.${String(name)}`,
        value,
        activatingContext?.pluginId || 'browser-session',
      );
      disposers.set(name, dispose);
      activatingContext?.onDispose(dispose);
      if (activatingContext) trackBrowserResource(activatingContext, value);
    } else disposers.delete(name);
    return true;
  },
  deleteProperty: (_target, name) => {
    disposers.get(name)?.();
    disposers.delete(name);
    return true;
  },
});
const isolatedServices = new WeakMap<Window, BrowserServices>();
/** Preserve injectable-window tests without storing any services on the Window object. */
export function getBrowserServices(target: Window): BrowserServices {
  if (typeof window !== 'undefined' && target === window) return browserServices;
  let services = isolatedServices.get(target);
  if (!services) {
    const host = new PluginHost();
    const release = new Map<PropertyKey, () => void>();
    services = new Proxy({} as BrowserServices, {
      get: (_object, key) => host.services.optional(String(key)),
      set: (_object, key, value) => {
        release.get(key)?.();
        if (value !== undefined) release.set(key, host.services.register(String(key), value));
        return true;
      },
    });
    isolatedServices.set(target, services);
  }
  return services;
}

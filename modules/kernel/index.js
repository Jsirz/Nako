import { PLUGIN_API_VERSION, ERRORS, PluginError, validatePluginManifest } from '../contracts/index.js';
import { createModuleLogger } from './logger.js';
import { definePlugin } from './plugin.js';

const fail = (code, message, context) => { throw new PluginError(code, message,
  { context: { moduleId: 'kernel', ...context } }); };
const versionParts = value => /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) ? value.split('.').map(Number) : null;
export function satisfiesVersion(version, range) {
  if (typeof version !== 'string' || typeof range !== 'string') return false;
  const actual = versionParts(version);
  const required = versionParts(String(range).replace(/^(\^|>=)/, ''));
  if (!actual || !required) return false;
  const comparison = actual[0] - required[0] || actual[1] - required[1] || actual[2] - required[2];
  if (range.startsWith('>=')) return comparison >= 0;
  if (range.startsWith('^')) return comparison >= 0 && actual[0] === required[0]
    && (required[0] !== 0 || actual[1] === required[1])
    && (required[0] !== 0 || required[1] !== 0 || actual[2] === required[2]);
  return comparison === 0;
}

export class ServiceRegistry {
  #entries = new Map();
  register(id, value, owner = 'host') {
    const context = { operation: 'service.register', serviceId: id, owner };
    if (this.#entries.has(id)) fail(ERRORS.serviceDuplicate, `Service already registered: ${id}`, context);
    if (value === undefined) fail(ERRORS.serviceMissing, `Undefined service: ${id}`, context);
    const entry = { value, owner };
    this.#entries.set(id, entry);
    return () => { if (this.#entries.get(id) === entry) this.#entries.delete(id); };
  }
  get(id) {
    if (!this.#entries.has(id)) fail(ERRORS.serviceMissing, `Service not found: ${id}`,
      { operation: 'service.get', serviceId: id });
    return this.#entries.get(id).value;
  }
  optional(id) { return this.#entries.get(id)?.value; }
  has(id) { return this.#entries.has(id); }
  list() { return [...this.#entries].map(([id, { owner }]) => ({ id, owner })); }
  removeOwner(owner) { for (const [id, entry] of this.#entries) if (entry.owner === owner) this.#entries.delete(id); }
}

export class EventBus {
  #listeners = new Map();
  constructor(onError = () => {}) { this.onError = onError; }
  on(name, listener) {
    const listeners = this.#listeners.get(name) || new Set();
    listeners.add(listener); this.#listeners.set(name, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.#listeners.delete(name); };
  }
  emit(name, value) {
    for (const listener of [...(this.#listeners.get(name) || [])]) {
      try { Promise.resolve(listener(value)).catch(error => this.onError(error)); }
      catch (error) { this.onError(error); }
    }
  }
}

/** In-process, trusted plugins. This is a capability boundary, not a JS security sandbox. */
export class PluginHost {
  #plugins = new Map();
  #queue = Promise.resolve();
  #logger;
  constructor({ config = {}, readConfig, credentialStore, credentialGrants = {}, logger = console, services = new ServiceRegistry() } = {}) {
    this.services = services;
    this.#logger = createModuleLogger('kernel', logger);
    this.events = new EventBus(error => this.#logger.error('Event listener failed', {
      operation: 'event.dispatch', error,
    }));
    this.options = { config, readConfig, credentialStore, credentialGrants, logger };
  }
  register(plugin) {
    const m = validatePluginManifest(plugin?.manifest);
    if (typeof plugin.activate !== 'function' ||
      ['deactivate', 'canDeactivate'].some(key => plugin[key] !== undefined && typeof plugin[key] !== 'function'))
      fail(ERRORS.invalidManifest, 'Invalid plugin lifecycle', { operation: 'plugin.register', pluginId: m.id });
    if (!satisfiesVersion(PLUGIN_API_VERSION, m.apiVersion))
      fail(ERRORS.incompatible, `Incompatible API: ${m.id}`, { operation: 'plugin.register', pluginId: m.id });
    if (this.#plugins.has(m.id)) fail(ERRORS.duplicate, `Duplicate plugin: ${m.id}`,
      { operation: 'plugin.register', pluginId: m.id });
    plugin = definePlugin(plugin);
    const manifest = JSON.parse(JSON.stringify(m));
    this.#plugins.set(m.id, { plugin, manifest, state: 'registered', dispose: [] });
    return this;
  }
  list() { return [...this.#plugins.values()].map(({ manifest, state }) => ({ ...JSON.parse(JSON.stringify(manifest)), state })); }
  discover(capability) { return this.list().filter(p => p.state === 'active' && p.capabilities?.includes(capability)); }
  #serial(operation) {
    const result = this.#queue.then(operation); this.#queue = result.catch(() => {}); return result;
  }
  load(id) { return this.#serial(() => this.#load(id, [])); }
  async #load(id, chain) {
    const errorContext = { operation: 'plugin.activate', pluginId: id };
    const record = this.#plugins.get(id);
    if (!record) fail(ERRORS.missing, `Plugin not found: ${id}`, errorContext);
    if (chain.includes(id)) fail(ERRORS.dependency, `Plugin dependency cycle: ${[...chain, id].join(' -> ')}`, errorContext);
    if (record.state === 'active') return;
    for (const [dependency, range] of Object.entries(record.manifest.dependencies || {})) {
      const target = this.#plugins.get(dependency);
      if (!target || !satisfiesVersion(target.manifest.version, range))
        fail(ERRORS.dependency, `Unsatisfied dependency: ${id} -> ${dependency}`, { ...errorContext, dependency });
      await this.#load(dependency, [...chain, id]);
    }
    record.state = 'activating'; record.abort = new AbortController(); record.dispose = [];
    const { manifest: m } = record;
    const allowedRead = new Set([...(m.services?.requires || []), ...(m.services?.optional || []), ...(m.services?.provides || [])]);
    const assertRead = service => { if (!allowedRead.has(service))
      fail(ERRORS.permission, `Undeclared service: ${id} -> ${service}`, { ...errorContext, operation: 'service.read', serviceId: service }); };
    const activation = record.abort;
    const assertActive = () => { if (activation.signal.aborted) fail(ERRORS.inactive, `Inactive plugin: ${id}`, errorContext); };
    const context = Object.freeze({
      pluginId: id, signal: record.abort.signal,
      services: Object.freeze({
        register: (service, value) => {
          assertActive();
          if (!m.services?.provides?.includes(service)) fail(ERRORS.permission, `Undeclared service export: ${service}`,
            { ...errorContext, operation: 'service.register', serviceId: service });
          const dispose = this.services.register(service, value, id); record.dispose.push(dispose); return dispose;
        },
        get: service => { assertActive(); assertRead(service); return this.services.get(service); },
        optional: service => { assertActive(); assertRead(service); return this.services.optional(service); },
        has: service => { assertActive(); assertRead(service); return this.services.has(service); },
        list: () => { assertActive(); return this.services.list().filter(entry => allowedRead.has(entry.id)); },
      }),
      events: Object.freeze({
        on: (name, listener) => { assertActive(); const dispose = this.events.on(name, listener); record.dispose.push(dispose); return dispose; },
        emit: (name, value) => { assertActive(); this.events.emit(name, value); },
      }),
      config: Object.freeze({ get: (key, fallback) => { assertActive(); return this.options.config[id]?.[key] ?? this.options.readConfig?.(id, key) ?? fallback; } }),
      credentials: Object.freeze({ get: providerId => {
        assertActive();
        if (!m.credentials?.includes(providerId) || !this.options.credentialGrants[id]?.includes(providerId))
          fail(ERRORS.permission, `Credential access denied: ${id} -> ${providerId}`,
            { ...errorContext, operation: 'credential.get', providerId });
        return this.options.credentialStore?.get(providerId);
      } }),
      logger: createModuleLogger(id, this.options.logger),
      onDispose: dispose => { assertActive(); record.dispose.push(dispose); },
    });
    try {
      for (const service of m.services?.requires || []) this.services.get(service);
      await record.plugin.activate(context);
      const nodeRegistry = this.services.optional('node.registry');
      if (nodeRegistry && Array.isArray(m.nodePackages)) {
        for (const nodePackage of m.nodePackages) {
          const dispose = nodeRegistry.register({ manifest: nodePackage }, id);
          record.dispose.push(dispose);
        }
      }
      for (const service of m.services?.provides || []) {
        if (!this.services.list().some(entry => entry.id === service && entry.owner === id))
          fail(ERRORS.serviceMissing, `Plugin did not provide declared service: ${id} -> ${service}`,
            { ...errorContext, serviceId: service });
      }
      record.state = 'active'; this.events.emit('plugin.activated', { id });
    } catch (error) {
      await this.#cleanup(record); record.state = 'failed';
      this.events.emit('plugin.failed', { id, code: error.code || 'PLUGIN_ACTIVATION_FAILED' }); throw error;
    }
  }
  async #cleanup(record) {
    record.abort?.abort();
    for (const dispose of record.dispose.splice(0).reverse()) {
      try { await dispose(); } catch (error) { this.#logger.error('Resource cleanup failed', {
        operation: 'plugin.cleanup', pluginId: record.manifest.id, error,
      }); }
    }
    this.services.removeOwner(record.manifest.id);
  }
  unload(id, { shutdown = false } = {}) { return this.#serial(() => this.#unload(id, shutdown)); }
  async #unload(id, shutdown) {
    const context = { operation: 'plugin.deactivate', pluginId: id };
    const record = this.#plugins.get(id);
    if (!record) fail(ERRORS.missing, `Plugin not found: ${id}`, context);
    if (record.state !== 'active') return;
    const dependents = this.list().filter(p => p.state === 'active' && p.dependencies?.[id]);
    if (dependents.length) fail(ERRORS.dependency, `Active dependents: ${dependents.map(p => p.id).join(', ')}`, context);
    if (!shutdown && (record.manifest.reloadRequired || record.plugin.canDeactivate?.() === false))
      fail(ERRORS.busy, `Plugin is in use or requires restart: ${id}`, context);
    await record.plugin.deactivate?.();
    await this.#cleanup(record); record.state = 'registered';
    this.events.emit('plugin.deactivated', { id });
  }
  async start(ids = this.list().map(p => p.id)) {
    const active = new Set(this.list().filter(p => p.state === 'active').map(p => p.id));
    try { for (const id of ids) await this.load(id); }
    catch (error) { await this.#stopExcept(active); throw error; }
    return this;
  }
  async #stopExcept(keep) {
    while (true) {
      const active = this.list().filter(p => p.state === 'active' && !keep.has(p.id));
      if (!active.length) return;
      const leaf = active.find(p => !active.some(other => other.dependencies?.[p.id]));
      if (!leaf) fail(ERRORS.dependency, 'Cannot order plugin shutdown', { operation: 'plugin.stop' });
      await this.unload(leaf.id, { shutdown: true });
    }
  }
  stop() { return this.#stopExcept(new Set()); }
}

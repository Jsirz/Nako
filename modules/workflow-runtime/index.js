import { PluginError, ERRORS } from '../contracts/index.js';
export class WorkflowExecutorRegistry {
  #factories = new Map();
  #clients = new Map();
  registerClient(id, factory) {
    if (this.#clients.has(id))
      throw new PluginError(ERRORS.duplicate, `Duplicate workflow client: ${id}`);
    this.#clients.set(id, factory);
    return () => {
      if (this.#clients.get(id) === factory) this.#clients.delete(id);
    };
  }
  createClient(id, options) {
    const factory = this.#clients.get(id);
    if (!factory) {
      const error = new PluginError(ERRORS.inactive, `Workflow plugin unavailable: ${id}`);
      error.status = 503;
      throw error;
    }
    return factory(options);
  }
  register(id, factory) {
    if (this.#factories.has(id))
      throw new PluginError(ERRORS.duplicate, `Duplicate executor: ${id}`);
    this.#factories.set(id, factory);
    return () => {
      if (this.#factories.get(id) === factory) this.#factories.delete(id);
    };
  }
  createAll(options) {
    return [...this.#factories].map(([id, factory]) => [id, factory(options)]);
  }
  list() {
    return [...this.#factories.keys()];
  }
}

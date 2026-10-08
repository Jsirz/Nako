/** Declare an application contribution without importing a platform or business implementation. */
import { definePlugin } from './plugin.js';
export function defineApplicationPlugin({
  id,
  dependencies = [],
  requires = [],
  provides = [],
  optional = [],
  activate,
}) {
  return definePlugin({
    manifest: {
      id,
      version: '1.0.0',
      apiVersion: '^1.0.0',
      type: 'module',
      reloadRequired: true,
      dependencies: Object.fromEntries(
        ['host.runtime', ...dependencies].map((name) => [name, '^1.0.0']),
      ),
      services: { requires: ['host.runtime', 'http.routes', ...requires], provides, ...(optional.length ? { optional } : {}) },
      capabilities: [id],
    },
    activate,
  });
}

/** Ordered, revocable contributions; the platform mounts these after its security boundary. */
export class RouteContributions {
  #entries = [];
  contribute(context, router, { phase = 20, order = 0 } = {}) {
    const entry = { owner: context.pluginId, router, phase, order };
    this.#entries.push(entry);
    context.onDispose(() => {
      this.#entries = this.#entries.filter((value) => value !== entry);
    });
  }
  mount(app, phase) {
    for (const entry of this.#entries
      .filter((value) => value.phase === phase)
      .sort((a, b) => a.order - b.order)) {
      // The indirection also removes the route when activation is rolled back.
      app.use((request, response, next) =>
        this.#entries.includes(entry) ? entry.router(request, response, next) : next(),
      );
    }
  }
  list() {
    return this.#entries.map(({ owner, phase, order }) => ({ owner, phase, order }));
  }
}

import { ERRORS, PluginError, WORKFLOW_CLIENT_METHODS, WORKFLOW_EXECUTOR_METHODS } from '../contracts/index.js';

export function defineExecutorPlugin({ id, load, loadClient, exportName, credentialId }) {
  let activeExecutions = 0;
  return {
    manifest: {
      id: `workflow.${id}`,
      version: '1.0.0',
      apiVersion: '^1.0.0',
      type: 'workflow',
      dependencies: { 'workflow-runtime': '^1.0.0' },
      capabilities: [`workflow.${id}`],
      services: { requires: ['workflow.executors'], provides: [`workflow.factory.${id}`] },
      credentials: credentialId ? [credentialId] : [],
      // Runtime recovery services retain executor instances until backend shutdown.
      reloadRequired: true,
    },
    canDeactivate: () => activeExecutions === 0,
    async activate(context) {
      const module = await load();
      if (loadClient) {
        const Client = await loadClient();
        context.onDispose(
          context.services.get('workflow.executors').registerClient(id, (options) => {
            if (context.signal.aborted) throw new PluginError(ERRORS.inactive, `Workflow client unloaded: ${id}`);
            const client = new Client(options);
            const methods = WORKFLOW_CLIENT_METHODS;
            return Object.freeze(
              Object.fromEntries(
                methods
                  .filter((name) => typeof client[name] === 'function')
                  .map((name) => [
                    name,
                    (...args) => {
                      if (context.signal.aborted)
                        throw new PluginError(ERRORS.inactive, `Workflow client unloaded: ${id}`);
                      return client[name](...args);
                    },
                  ]),
              ),
            );
          }),
        );
      }
      const factory = (options) => {
        if (context.signal.aborted) throw new PluginError(ERRORS.inactive, `Executor unloaded: ${id}`);
        const credentialResolver = (reference) => {
          const secrets = context.credentials.get(credentialId);
          return reference === 'runninghub-cn'
            ? secrets.RUNNINGHUB_API_KEY
            : reference === 'runninghub-global'
              ? secrets.RUNNINGHUB_GLOBAL_API_KEY
              : null;
        };
        const implementation = new module[exportName]({
          ...options,
          ...(credentialId ? { credentialResolver } : {}),
        });
        if (typeof implementation.execute !== 'function')
          throw new PluginError(ERRORS.invalidManifest, `Missing execute method: ${id}`);
        // Publish methods, never the implementation's stores, clients or credential resolver.
        const executor = {
          id,
          canExecute: (definition) => {
            if (context.signal.aborted) throw new PluginError(ERRORS.inactive, `Executor unloaded: ${id}`);
            return definition?.runtimeKind === id;
          },
        };
        for (const method of WORKFLOW_EXECUTOR_METHODS) {
          if (typeof implementation[method] !== 'function') continue;
          executor[method] = async (...args) => {
            if (context.signal.aborted) throw new PluginError(ERRORS.inactive, `Executor unloaded: ${id}`);
            activeExecutions++;
            try {
              return await implementation[method](...args);
            } finally {
              activeExecutions--;
            }
          };
        }
        return Object.freeze(executor);
      };
      context.services.register(`workflow.factory.${id}`, factory);
      context.onDispose(context.services.get('workflow.executors').register(id, factory));
    },
  };
}

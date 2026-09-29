import http from 'node:http';

const DEFAULT_PORT = 3001;

export function resolveListenTarget(environment = process.env) {
  const pipe = String(environment.NAKO_BACKEND_PIPE || '').trim();
  if (pipe) return Object.freeze({ path: pipe });

  const configured = Number(environment.SERVER_PORT || DEFAULT_PORT);
  if (!Number.isInteger(configured) || configured < 1 || configured > 65_535) {
    throw new Error('SERVER_PORT must be an integer between 1 and 65535.');
  }
  return Object.freeze({ host: '127.0.0.1', port: configured });
}

export function describeListenTarget(target) {
  return target.path || `${target.host}:${target.port}`;
}

function closeServer(server) {
  if (!server?.listening) return Promise.resolve();
  server.closeAllConnections?.();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export function createLocalRuntimeLifecycle({
  app,
  listen,
  workflowStore,
  writeProjectSnapshot,
  stopOwnedComfy,
  stopPlugins,
}) {
  let server = null;
  let startPromise = null;
  let stopPromise = null;
  let ready = false;

  async function start() {
    if (ready) return true;
    if (startPromise) return startPromise;
    startPromise = (async () => {
      await workflowStore?.init?.();
      if (writeProjectSnapshot?.initialize) await writeProjectSnapshot.initialize();
      server = http.createServer(app);
      server.requestTimeout = 5 * 60_000;
      server.headersTimeout = 65_000;
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server?.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server?.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        if (listen.path) server.listen(listen.path);
        else server.listen({ host: listen.host, port: listen.port, exclusive: true });
      });
      ready = true;
      return true;
    })();
    try {
      return await startPromise;
    } finally {
      startPromise = null;
    }
  }

  async function stop() {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      ready = false;
      const failures = [];
      for (const operation of [
        () => closeServer(server),
        () => Promise.resolve(stopOwnedComfy?.()),
        () => Promise.resolve(stopPlugins?.()),
        () => Promise.resolve(workflowStore?.close?.()),
      ]) {
        try {
          await operation();
        } catch (error) {
          failures.push(error);
        }
      }
      server = null;
      if (failures.length) throw new AggregateError(failures, 'Backend shutdown failed.');
    })();
    try {
      await stopPromise;
    } finally {
      stopPromise = null;
    }
  }

  return {
    start,
    stop,
    get ready() {
      return ready;
    },
  };
}

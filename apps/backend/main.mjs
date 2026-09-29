import dotenv from 'dotenv';
import { RUNTIME_PATHS } from '../../modules/project/api/server/workspace/runtimePaths.js';
import { USER_PROVIDER_SECRET_KEYS } from '../../modules/contracts/providerSecrets.js';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import {
  createLocalRuntimeLifecycle,
  describeListenTarget,
  resolveListenTarget,
} from '../../modules/desktop-shell-observability/api/server/runtime/localRuntimeLifecycle.js';
import { createParentChannel } from '../../modules/desktop-shell-observability/api/server/runtime/parentChannel.js';
import { installBackendLifecycleDiagnostics } from '../../modules/desktop-shell-observability/api/server/runtime/backendLifecycleDiagnostics.js';
import { serveCanvas } from '../../modules/desktop-shell-observability/api/server/runtime/serveCanvas.js';
import { createServerPluginHost } from '../../modules/desktop-shell-observability/api/serverHost.js';
import { createPluginRouter } from '../../modules/desktop-shell-observability/api/pluginRouter.js';
import controllerExitGuard from '../../modules/local-runtime/api/server/local/controllerExitGuard.cjs';
import {
  createRequestContextMiddleware,
  installSecureConsole,
} from '../../modules/identity-account/api/server/security/requestContext.js';
import { inspectLocalAuthenticationConfiguration } from '../../modules/identity-account/api/server/security/localAuthenticationRuntime.js';
import {
  attachActiveUserContext,
  createActiveUserContext,
  createExactLocalBoundary,
  getAuthenticatedRequest,
} from '../../modules/identity-account/api/server/security/localAuthentication.js';
import { RouteContributions } from '../../modules/kernel/application.js';
if (RUNTIME_PATHS.ACTIVE_OPAQUE_USER_ID) {
  const protectedProviderValues = Object.fromEntries(
    USER_PROVIDER_SECRET_KEYS.filter((key) => process.env[key]).map((key) => [
      key,
      process.env[key],
    ]),
  );
  for (const key of USER_PROVIDER_SECRET_KEYS) delete process.env[key];
  dotenv.config({ path: RUNTIME_PATHS.ENV_PATH, override: true });
  Object.assign(process.env, protectedProviderValues);
}

installSecureConsole();

const LISTEN_TARGET = resolveListenTarget();

const PORT = LISTEN_TARGET.path ? null : LISTEN_TARGET.port;

const PRODUCT_VERSION =
  process.env.NAKO_PRODUCT_VERSION || process.env.npm_package_version || '0.0.0-dev';

const RUNTIME_INSTANCE_TOKEN = String(
  process.argv
    .find((value) => value.startsWith('--nako-instance='))
    ?.slice('--nako-instance='.length) || '',
);

const RUNTIME_INSTANCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const parentChannel = createParentChannel();

const authenticationConfiguration = inspectLocalAuthenticationConfiguration({
  runtimePaths: RUNTIME_PATHS,
  port: PORT,
});

function runtimeInstanceMatches(candidate) {
  if (
    !RUNTIME_INSTANCE_PATTERN.test(RUNTIME_INSTANCE_TOKEN) ||
    !RUNTIME_INSTANCE_PATTERN.test(String(candidate || ''))
  )
    return false;
  const expected = crypto.createHash('sha256').update(RUNTIME_INSTANCE_TOKEN).digest();
  const received = crypto.createHash('sha256').update(String(candidate)).digest();
  return crypto.timingSafeEqual(expected, received);
}

function handleRuntimeShutdownRequest(request, response, shutdown) {
  if (
    request.method !== 'POST' ||
    request.originalUrl !== '/internal/runtime/shutdown' ||
    request.headers.origin !== undefined ||
    !LOOPBACK_ADDRESSES.has(String(request.socket?.remoteAddress || '').toLowerCase()) ||
    !runtimeInstanceMatches(request.headers['x-nako-runtime-instance'])
  ) {
    response.status(401).json({ error: 'Unauthorized', code: 'RUNTIME_SHUTDOWN_UNAUTHORIZED' });
    return;
  }
  response.once('finish', () => setImmediate(() => void shutdown()));
  response.setHeader('Cache-Control', 'no-store');
  response.status(202).json({ ok: true });
}

function launchRuntime(runtime, description) {
  const diagnostics = installBackendLifecycleDiagnostics({ logsDirectory: RUNTIME_PATHS.LOGS_DIR });
  let shutdownPromise;
  let exitCode = 0;
  const stopControllerGuard = controllerExitGuard.startControllerExitGuard({
    onControllerExit: () => void shutdown(0, 'controller-exited'),
  });
  function shutdown(code = 0, reason = 'internal-request') {
    exitCode = Math.max(exitCode, code);
    if (shutdownPromise) return shutdownPromise;
    diagnostics.shutdownRequested(reason);
    stopControllerGuard?.();
    shutdownPromise = runtime
      .stop()
      .catch((error) => {
        console.error('本机服务关闭失败:', error);
        exitCode = 1;
      })
      .then(() => process.exit(exitCode));
    return shutdownPromise;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void shutdown(0, signal));
  // The Electron main process asks for a stop so SQLite and owned ComfyUI close before exit.
  parentChannel.onStop(() => void shutdown(0, 'desktop-stop'));
  void runtime
    .start()
    .then((started) => {
      if (!started) return;
      console.log(description);
      parentChannel.notifyReady();
    })
    .catch((error) => {
      console.error('初始化本机服务失败:', error);
      return shutdown(1, 'startup-failed');
    });
  return shutdown;
}

function startLockedServer() {
  const lockedApp = express();
  lockedApp.post('/internal/runtime/shutdown', (request, response) => {
    handleRuntimeShutdownRequest(request, response, shutdown);
  });
  if (PORT !== null) {
    lockedApp.use(
      createExactLocalBoundary({
        trustedOrigins: [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`],
      }),
    );
  }
  lockedApp.get('/healthz', (_request, response) =>
    response.json({
      ok: true,
      service: 'nako-canvas',
      version: PRODUCT_VERSION,
    }),
  );
  lockedApp.get('/readyz', (_request, response) =>
    response.status(503).json({
      ok: false,
      ready: false,
      service: 'nako-collab',
      version: PRODUCT_VERSION,
      authentication: 'locked',
      code: 'COLLABORATION_AUTHENTICATION_LOCKED',
    }),
  );
  lockedApp.use(['/api', '/library', '/diagnostics'], (_request, response) => {
    response.status(401).json({
      error: '需要登录后访问',
      code: 'AUTHENTICATION_REQUIRED',
    });
  });
  if (process.env.NODE_ENV === 'production') {
    serveCanvas(lockedApp, RUNTIME_PATHS.DIST_DIR);
  }
  const runtime = createLocalRuntimeLifecycle({ app: lockedApp, listen: LISTEN_TARGET });
  const shutdown = launchRuntime(
    runtime,
    `Backend server locked on ${describeListenTarget(LISTEN_TARGET)} (authentication required)`,
  );
}
if (!authenticationConfiguration.ready) {
  startLockedServer();
} else {
  const applicationContext = Object.create(null);

  const app = express();

  const activeUserContext = createActiveUserContext({
    activeOpaqueUserId: authenticationConfiguration.activeOpaqueUserId,
    userScopeResolver: authenticationConfiguration.userScopeResolver,
  });
  const routes = new RouteContributions();
  const pluginHost = await createServerPluginHost({
    libraryDirectory: RUNTIME_PATHS.LIBRARY_DIR,
    privateDirectory: RUNTIME_PATHS.PRIVATE_DIR,
    runtime: {
      paths: RUNTIME_PATHS,
      applicationContext,
      version: PRODUCT_VERSION,
      port: PORT,
      authentication: authenticationConfiguration,
      activeUserContext,
    },
    routes,
  });
  app.post('/internal/runtime/shutdown', (request, response) => {
    handleRuntimeShutdownRequest(request, response, shutdown);
  });

  if (PORT !== null) {
    app.use(
      createExactLocalBoundary({
        trustedOrigins: authenticationConfiguration.trustedOrigins,
      }),
    );
  }

  app.get('/healthz', (_request, response) =>
    response.json({
      ok: true,
      service: 'nako-canvas',
      version: PRODUCT_VERSION,
    }),
  );

  app.get('/readyz', (_request, response) => {
    // Ready once the backend listens; the response shape stays what runtime control reads.
    const ready = runtime.ready;
    response.status(ready ? 200 : 503).json({
      ok: ready,
      ready,
      service: 'nako-collab',
      version: PRODUCT_VERSION,
      authentication: ready ? 'ready' : 'locked',
      ...(ready ? {} : { code: 'COLLABORATION_AUTHENTICATION_LOCKED' }),
    });
  });

  app.use(createRequestContextMiddleware());

  app.use(['/api', '/library', '/diagnostics'], attachActiveUserContext(activeUserContext));

  app.use('/api/plugins', createPluginRouter(pluginHost));
  routes.mount(app, 10);

  app.use(express.json({ limit: '200mb' }));
  routes.mount(app, 20);
  routes.mount(app, 30);
  app.use(['/api', '/library', '/diagnostics'], (_request, response) => {
    response.status(404).json({ error: 'Not Found', code: 'NOT_FOUND' });
  });

  if (process.env.NODE_ENV === 'production') {
    serveCanvas(app, RUNTIME_PATHS.DIST_DIR);
  }
  const runtime = createLocalRuntimeLifecycle({
    app,
    listen: LISTEN_TARGET,
    stopPlugins: () => pluginHost.stop(),
  });
  const shutdown = launchRuntime(
    runtime,
    `Backend server running on ${describeListenTarget(LISTEN_TARGET)} (local only)`,
  );
}

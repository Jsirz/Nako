import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const READY_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 10_000;
// One delay per tolerated crash inside the window; one more crash means the backend is broken.
const RESTART_DELAYS_MS = [300, 1_000, 2_000, 4_000, 8_000];
const RESTART_WINDOW_MS = 120_000;

// The backend lives in a utilityProcess owned by the main process and listens only on a fresh
// named pipe. Crashes restart it with backoff, and every state change reaches the window.
export function createBackendSupervisor({
  fork,
  entry,
  cwd,
  createEnvironment,
  logsDirectory,
  serviceName = 'Nako Backend',
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  readyTimeoutMs = READY_TIMEOUT_MS,
  stopTimeoutMs = STOP_TIMEOUT_MS,
}) {
  let state = 'stopped';
  let userId = null;
  let child = null;
  let pipe = null;
  let restartTimer = null;
  let crashes = [];
  let launchGeneration = 0;
  let failureCode = 'BACKEND_FAILED';
  const listeners = new Set();

  function publish(next) {
    if (state === next) return;
    state = next;
    for (const listener of [...listeners]) listener(next);
  }

  function waitForReady() {
    if (state === 'ready') return Promise.resolve();
    if (state === 'failed') return Promise.reject(Object.assign(new Error(failureCode), { code: failureCode }));
    return new Promise((resolve, reject) => {
      const unsubscribe = onState((next) => {
        if (next === 'ready') {
          unsubscribe();
          resolve();
        } else if (next === 'failed' || next === 'stopped') {
          unsubscribe();
          const code = next === 'failed' ? failureCode : 'BACKEND_STOPPED';
          reject(Object.assign(new Error(code), { code }));
        }
      });
    });
  }

  function openLogs(current) {
    const streams = [
      [
        current.stdout,
        createWriteStream(path.join(logsDirectory, 'backend.stdout.log'), { flags: 'a' }),
      ],
      [
        current.stderr,
        createWriteStream(path.join(logsDirectory, 'backend.stderr.log'), { flags: 'a' }),
      ],
    ];
    for (const [source, target] of streams) source?.pipe(target);
    return () => {
      for (const [source, target] of streams) {
        source?.unpipe(target);
        target.end();
      }
    };
  }

  function handleExit(current) {
    if (child !== current) return;
    child = null;
    pipe = null;
    if (state === 'stopping' || state === 'stopped') {
      publish('stopped');
      return;
    }
    crashes = [...crashes.filter((time) => now() - time < RESTART_WINDOW_MS), now()];
    if (crashes.length > RESTART_DELAYS_MS.length) {
      publish('failed');
      return;
    }
    publish('reconnecting');
    restartTimer = setTimer(
      () => {
        restartTimer = null;
        void launch();
      },
      RESTART_DELAYS_MS[crashes.length - 1],
    );
  }

  async function launch() {
    failureCode = 'BACKEND_FAILED';
    const expectedGeneration = launchGeneration;
    // macOS UNIX sockets have a short path limit. A private temp directory also
    // prevents other local users from accessing the backend.
    let socketDirectory = null;
    let launchPipe;
    const cleanupSocket = () => socketDirectory
      ? rm(socketDirectory, { recursive: true, force: true }) : Promise.resolve();
    let environment;
    try {
      socketDirectory = process.platform === 'win32' ? null
        : await mkdtemp(path.join(os.tmpdir(), 'nk-'));
      launchPipe = socketDirectory ? path.join(socketDirectory, 'b.sock')
        : `\\\\.\\pipe\\nako-backend-${randomUUID()}`;
      environment = await createEnvironment({ userId, pipe: launchPipe });
      await mkdir(logsDirectory, { recursive: true });
    } catch (error) {
      await cleanupSocket();
      if (expectedGeneration === launchGeneration) {
        failureCode = ['CREDENTIAL_FORMAT_INVALID', 'CREDENTIAL_DECRYPT_FAILED'].includes(error?.code)
          ? error.code : 'BACKEND_FAILED';
        publish('failed');
      }
      return;
    }
    if (expectedGeneration !== launchGeneration || state === 'stopping' || state === 'stopped') {
      await cleanupSocket();
      return;
    }
    let current;
    try {
      current = fork(entry, [], { serviceName, cwd, env: environment, stdio: 'pipe' });
    } catch {
      await cleanupSocket();
      publish('failed');
      return;
    }
    child = current;
    pipe = launchPipe;
    const closeLogs = openLogs(current);
    const timer = setTimer(() => current.kill(), readyTimeoutMs);
    current.on('message', (message) => {
      if (message?.type === 'ready') {
        clearTimer(timer);
        if (child === current) publish('ready');
      }
    });
    current.once('exit', () => {
      void cleanupSocket();
      clearTimer(timer);
      closeLogs();
      handleExit(current);
    });
  }

  async function stop() {
    launchGeneration += 1;
    if (restartTimer) {
      clearTimer(restartTimer);
      restartTimer = null;
    }
    const current = child;
    if (!current) {
      publish('stopped');
      return;
    }
    publish('stopping');
    const exited = new Promise((resolve) => current.once('exit', resolve));
    const killer = setTimer(() => current.kill(), stopTimeoutMs);
    try {
      // The backend flushes SQLite and stops the ComfyUI it owns before exiting.
      current.postMessage({ type: 'stop' });
    } catch {
      current.kill();
    }
    await exited;
    clearTimer(killer);
    publish('stopped');
  }

  async function start(nextUserId) {
    if (userId === nextUserId && ['starting', 'ready', 'reconnecting'].includes(state)) {
      return waitForReady();
    }
    if (child || restartTimer) await stop();
    launchGeneration += 1;
    userId = nextUserId;
    crashes = [];
    publish('starting');
    const ready = waitForReady();
    void launch();
    return ready;
  }

  function onState(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    start,
    stop,
    onState,
    state: () => state,
    pipePath: () => (state === 'ready' ? pipe : null),
    userId: () => userId,
  };
}

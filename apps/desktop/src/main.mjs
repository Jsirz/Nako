import { createDesktopPluginHost } from './pluginHost.mjs';
// The main process owns local windows, workspace selection and the backend.
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  protocol,
  safeStorage,
  shell,
  Tray,
  utilityProcess,
  WebContentsView,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_SCHEME, APP_SCHEME_PRIVILEGES, createAppProtocolHandler } from './appProtocol.mjs';
import { createBackendEnvironment, loadReleaseHelpers } from './backendEnvironment.mjs';
import { createBackendSupervisor } from './backendSupervisor.mjs';
import { releasePaths, resolveInstallation } from './installation.mjs';
import { createTray } from './tray.mjs';
import { startupFailureMessage } from './startupFailure.mjs';
import { createUpdateEnvironment } from './updateEnvironment.mjs';
import { acknowledgeUpdatedApplication } from '../../../modules/desktop-shell-observability/api/desktop/windowsUpdateHandoff.mjs';
import { createModuleLogger } from '../../../modules/kernel/logger.js';
import { DESKTOP_ERRORS, desktopError } from '../../../modules/contracts/desktopErrors.js';
import {
  CANVAS_URL,
  LAUNCHER_URL,
  createMainWindow,
  isAppUrl,
  isExternalUrl,
} from './windowManager.mjs';

const logger = createModuleLogger('desktop-shell-observability');

const here = path.dirname(fileURLToPath(import.meta.url));
app.setName('NAKO Agent 纳科画布智能体');
const installation = resolveInstallation({
  packaged: app.isPackaged,
  executablePath: process.execPath,
  sourceRoot: path.resolve(here, '..', '..', '..'),
});

const BACKEND_RETRY_DELAY_MS = 30_000;

// Chromium's cache and storage stay with the rest of Nako's local state instead of Roaming.
// The single-instance lock below is keyed on this folder, so it must be set first.
app.setPath('userData', path.join(installation.state, 'chromium'));
protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: APP_SCHEME_PRIVILEGES }]);

const primaryInstance = app.requestSingleInstanceLock();
// Stop, upgrade and uninstall scripts start a second copy with --quit to close the running one
// gracefully; closing the window only hides it to the tray.
const quitRequested = process.argv.includes('--quit');

let helpers = null;
let desktopHost = null;
let mainWindow = null;
let tray = null;
let appContents = null;
let identity = null;

let backend = null;

let productVersion = app.getVersion();
let quitting = false;
let canvasOpen = false;

let backendRetryTimer = null;


async function selectWorkspace(forceChoice = false) {
  return desktopHost.services.get('desktop.identity').chooseLocalWorkspace({
    usersDirectory: path.join(installation.data, 'users'),
    forceChoice,
    choose: async (ids) => {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '选择本机工作区',
        message: '选择要使用的本机项目和 API Key。',
        detail: '工作区分别保留，不会合并或删除原数据。',
        buttons: [
          ...ids.map((id, index) => `工作区 ${index + 1} · ${id.slice(0, 8)}`),
          '新建本地工作区',
          '取消',
        ],
        cancelId: ids.length + 1,
        noLink: true,
      });
      return result.response === ids.length ? 'new' : ids[result.response];
    },
  });
}

function broadcast(channel, payload) {
  if (appContents && !appContents.isDestroyed()) appContents.send(channel, payload);
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  appContents?.focus();
}

function senderPath(event) {
  const url = event.senderFrame?.url ?? '';
  if (!isAppUrl(url)) throw desktopError(DESKTOP_ERRORS.untrustedSender, 'UNTRUSTED_SENDER', 'ipc.sender', 403);
  return new URL(url).pathname;
}

function handle(channel, work, { launcherOnly = false } = {}) {
  ipcMain.handle(channel, (event, ...args) => {
    const pathname = senderPath(event);
    if (launcherOnly && !pathname.startsWith('/launcher/'))
      throw desktopError(DESKTOP_ERRORS.untrustedSender, 'UNTRUSTED_SENDER', 'ipc.sender', 403);
    return work(...args);
  });
}

function backendView() {
  return backend?.state() === 'ready' ? 'ready' : 'reconnecting';
}

function keepCanvasAlive() {
  clearTimeout(backendRetryTimer);
  backendRetryTimer = null;
}

function onBackendState(state) {
  broadcast('backend:state', backendView());
  if (state !== 'failed' || !canvasOpen) return;
  // The supervisor gave up after repeated crashes. The page and its unsaved edits stay put behind
  // the reconnect notice while the backend is retried slowly.
  clearTimeout(backendRetryTimer);
  backendRetryTimer = setTimeout(() => {
    const userId = backend.userId();
    if (canvasOpen && userId) void backend.start(userId).catch(() => {});
  }, BACKEND_RETRY_DELAY_MS);
}

async function createIdentity() {
  return desktopHost.services.get('desktop.identity').create();
}

async function openCanvas() {
  const userId = identity.userId();
  if (!userId) return { opened: false, message: '本机工作区尚未就绪，请重试。' };
  try {
    await backend.start(userId);
  } catch (error) {
    return { opened: false, message: startupFailureMessage(error) };
  }
  canvasOpen = true;
  keepCanvasAlive(true);
  // The canvas loads after the backend is ready, so its preferences hydrate on first paint.
  await appContents.loadURL(CANVAS_URL);
  mainWindow.setTitle('NAKO Agent 纳科画布智能体');
  return { opened: true, message: '画布已打开。' };
}

function registerIpc() {
  for (const action of ['state', 'check', 'download', 'install']) {
    handle(`application-update:${action}`, () =>
      desktopHost.services.get('desktop.application-updates')[action]());
  }
  ipcMain.on('desktop:version', (event) => {
    event.returnValue = productVersion;
  });
  handle('shell:info', () => ({
    version: app.getVersion(),
    productVersion,
    platform: process.platform === 'darwin' ? 'macos' : 'windows',
    architecture: process.arch,
  }));
  handle('shell:open-external', (url) =>
    isExternalUrl(url) ? shell.openExternal(url) : undefined,
  );
  handle('identity:status', () => identity.status(), { launcherOnly: true });
  handle('identity:restore', () => identity.restore(), { launcherOnly: true });
  handle(
    'identity:recheck',
    async () => {
      identity = await createIdentity();
      return identity.restore();
    },
    { launcherOnly: true },
  );
  handle(
    'canvas:prepare',
    () => {
      const userId = identity.userId();
      if (!userId) return { prepared: false, message: '本机工作区尚未就绪，请重试。' };
      void backend.start(userId).catch(() => {});
      return { prepared: true, message: '' };
    },
    { launcherOnly: true },
  );
  handle('canvas:open', () => openCanvas(), { launcherOnly: true });
  handle('backend:current-state', () => backendView());
  handle('desktop:show-item-in-folder', (target) => shell.showItemInFolder(target));
}

async function start() {
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' },
  ]));
  helpers = await loadReleaseHelpers(installation.tools);
  productVersion = await Promise.resolve()
    .then(() => helpers.loadProductVersion(releasePaths(installation)))
    .catch(() => app.getVersion());
  desktopHost = await createDesktopPluginHost({
    installation,
    selectWorkspace,
    safeStorage,
    broadcast,
    updates: await createUpdateEnvironment({ app, version: productVersion,
      prepareQuit: () => { quitting = true; },
      cancelQuit: () => { quitting = false; },
      publish: (state) => broadcast('application-update:state', state),
      onInstallFailure: async () => {
        if (canvasOpen && backend?.userId()) await backend.start(backend.userId());
      },
      beforeInstall: async () => {
        keepCanvasAlive();
        await backend?.stop();
        return true;
      },
    }),
  });
  identity = await createIdentity();
  backend = createBackendSupervisor({
    fork: (...args) => utilityProcess.fork(...args),
    entry: installation.server,
    cwd: installation.code,
    logsDirectory: installation.logs,
    createEnvironment: ({ userId, pipe }) =>
      createBackendEnvironment({ installation, userId, pipe, helpers }),
  });
  backend.onState(onBackendState);
  protocol.handle(
    APP_SCHEME,
    createAppProtocolHandler({
      backend,
      distDirectory: installation.dist,
      launcherDirectory: installation.launcher,
    }),
  );
  registerIpc();

  // Launcher starts dark; the canvas later applies its account's theme to native window chrome.
  nativeTheme.themeSource = 'dark';
  ({ window: mainWindow, contents: appContents } = createMainWindow({
    BrowserWindow,
    WebContentsView,
    shell,
    ipcMain,
    nativeTheme,
    preload: path.join(here, 'preload.cjs'),
    icon: installation.icon,
  }));
  mainWindow.on('close', (event) => {
    if (quitting) return;
    // Closing hides to the tray; the canvas, its unsaved edits and the backend stay alive.
    event.preventDefault();
    mainWindow.hide();
    broadcast('shell:clear-secrets');
  });
  tray = createTray({
    Tray,
    Menu,
    icon: installation.icon,
    onShow: showWindow,
    onQuit: () => app.quit(),
  });

  if (installation.devUserId) {
    await identity.restore();
    await identity.selectLocalUser(installation.devUserId);
    await openCanvas();
  } else {
    await appContents.loadURL(LAUNCHER_URL);
  }
}

if (!primaryInstance || quitRequested) {
  app.exit(0);
} else {
  app.on('second-instance', (_event, argv) => {
    if (argv.includes('--quit')) app.quit();
    else showWindow();
  });
  app.on('activate', showWindow);
  app.on('will-quit', () => {
    tray?.destroy();
    tray = null;
  });
  let shutdownComplete = false;
  let shutdownPromise;
  app.on('before-quit', (event) => {
    quitting = true;
    if (shutdownComplete) return;
    event.preventDefault();
    keepCanvasAlive(false);
    shutdownPromise ??= (async () => {
      try {
        await backend?.stop();
      } finally {
        await desktopHost?.stop();
      }
    })()
      .catch((error) => logger.error('Desktop shutdown failed', {
        moduleId: 'desktop-shell-observability', operation: 'desktop.shutdown', error,
      }))
      .finally(() => {
        shutdownComplete = true;
        app.quit();
      });
  });
  app
    .whenReady()
    .then(start)
    .then(() => acknowledgeUpdatedApplication(productVersion).catch(() => {}))
    .catch((error) => {
      logger.error('Nako 启动失败', {
        moduleId: 'desktop-shell-observability', operation: 'desktop.start', error,
      });
      app.exit(1);
    });
}

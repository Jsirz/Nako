const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
const subscribe = (channel) => (listener) => {
  const handler = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

function subscribeBackendState(listener) {
  let live = false;
  let active = true;
  const unsubscribe = subscribe('backend:state')((state) => {
    live = true;
    listener(state);
  });
  // A page that loads mid-reconnect sees the current state instead of waiting for the next change.
  invoke('backend:current-state').then(
    (state) => {
      if (active && !live) listener(state);
    },
    () => {},
  );
  return () => {
    active = false;
    unsubscribe();
  };
}

// The canvas bridge; see docs/architecture/electron-desktop-shell.md.
contextBridge.exposeInMainWorld('nakoDesktop', {
  version: ipcRenderer.sendSync('desktop:version'),
  integratedTitleBar: process.platform !== 'darwin',
  // The main process validates both sender and theme; sandboxed preload cannot import contracts.
  setTheme: (theme) => invoke('desktop:set-theme', theme),
  showItemInFolder: (target) => invoke('desktop:show-item-in-folder', String(target)),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  },
  onBackendState: subscribeBackendState,
  updates: Object.freeze({
    state: () => invoke('application-update:state'),
    check: () => invoke('application-update:check'),
    download: () => invoke('application-update:download'),
    install: () => invoke('application-update:install'),
    subscribe: subscribe('application-update:state'),
  }),
});

// The launcher bridge; the main process only answers identity calls from the launcher page.
contextBridge.exposeInMainWorld('nakoShell', {
  info: () => invoke('shell:info'),
  identity: Object.freeze({
    status: () => invoke('identity:status'),
    restore: () => invoke('identity:restore'),
    recheck: () => invoke('identity:recheck'),
  }),
  canvas: Object.freeze({
    prepare: () => invoke('canvas:prepare'),
    open: (userInitiated) => invoke('canvas:open', Boolean(userInitiated)),
  }),
  openExternal: (url) => invoke('shell:open-external', String(url)),
  onClearSecrets: subscribe('shell:clear-secrets'),
});

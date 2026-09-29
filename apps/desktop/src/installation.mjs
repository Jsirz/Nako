import os from 'node:os';
import path from 'node:path';

// Packaged code is read-only; user data lives outside the installation on both platforms.
export function resolveInstallation({
  packaged,
  executablePath,
  sourceRoot,
  resourcesPath = process.resourcesPath,
  platform = process.platform,
  homeDirectory = os.homedir(),
  environment = process.env,
}) {
  const localAppData = environment.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

  if (packaged) {
    const root = path.dirname(executablePath);
    const app = path.join(resourcesPath, 'app');
    const profile = platform === 'darwin'
      ? path.join(homeDirectory, 'Library', 'Application Support', 'Nako')
      : path.join(localAppData, 'Nako');
    return describe({
      packaged: true,
      root,
      app,
      code: app,
      data: path.resolve(environment.NAKO_DESKTOP_DATA_ROOT || path.join(profile, 'data')),
      server: path.join(app, 'apps', 'backend', 'main.mjs'),
      dist: path.join(app, 'dist'),
      launcher: path.join(app, 'apps', 'desktop', 'launcher', 'dist'),
      tools: path.join(app, 'scripts', 'release'),
      envTemplate: path.join(app, '.env.example'),
      packageManifest: path.join(app, 'package.json'),
      icon: path.join(app, 'dist', platform === 'darwin' ? 'nako-tray.png' : 'nako-app.ico'),
      state: path.resolve(environment.NAKO_DESKTOP_STATE_ROOT || path.join(profile, 'Desktop')),
      devUserId: null,
    });
  }
  const repository = path.resolve(sourceRoot);
  const app = repository;
  const scratch = path.join(repository, '.desktop-dev');
  return describe({
    packaged: false,
    root: repository,
    app,
    code: repository,
    data: path.resolve(environment.NAKO_DESKTOP_DATA_ROOT || path.join(scratch, 'data')),
    server: path.join(repository, 'apps', 'backend', 'main.mjs'),
    dist: path.join(repository, 'dist'),
    launcher: path.join(repository, 'apps', 'desktop', 'launcher', 'dist'),
    tools: path.join(repository, 'scripts', 'release'),
    envTemplate: path.join(repository, '.env.example'),
    packageManifest: path.join(repository, 'package.json'),
    icon: path.join(repository, 'public', platform === 'darwin' ? 'nako-tray.png' : 'nako-app.ico'),
    state: path.resolve(environment.NAKO_DESKTOP_STATE_ROOT || path.join(scratch, 'state')),
    devUserId: environment.NAKO_DESKTOP_DEV_USER_ID || null,
  });
}

function describe(base) {
  return Object.freeze({
    ...base,
    logs: path.join(base.data, 'logs'),
    config: path.join(base.data, 'config'),
    envFile: path.join(base.data, 'config', '.env'),
    providerCredentialHelper: path.join(base.code, 'modules', 'identity-account', 'server', 'credentials', 'providerCredentialBridge.ps1'),
  });
}

// The subset of runtimeControl's portable paths that its exported loaders read.
export function releasePaths(installation) {
  return {
    app: installation.app,
    packageManifest: installation.packageManifest,
  };
}

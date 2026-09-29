const { updateFeed } = require('./scripts/desktop/updateFeed.cjs');
const feed = updateFeed();
module.exports = {
  appId: 'app.nako.canvas',
  productName: 'Nako 画布',
  directories: { app: '.packaging/app', output: 'release', buildResources: 'public' },
  electronVersion: '44.3.0',
  asar: false,
  npmRebuild: false, // sqlite3 and sharp use Node-API; staged native modules are verified before packaging.
  files: ['**/*', '.env.example', '!**/*.map', '!package-lock.json'],
  artifactName: 'Nako-${version}-${os}-${arch}.${ext}',
  publish: feed ? [{ provider: 'generic', url: feed }] : null,
  win: { target: ['nsis', 'zip'], icon: 'public/nako-app.ico' },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    shortcutName: 'Nako 画布',
    artifactName: 'Nako-${version}-windows-${arch}-setup.${ext}',
  },
  mac: {
    target: ['dmg', 'zip'],
    icon: 'public/nako-app.icns',
    category: 'public.app-category.graphics-design',
    hardenedRuntime: true,
    entitlements: 'apps/desktop/entitlements.mac.plist',
    entitlementsInherit: 'apps/desktop/entitlements.mac.plist',
    binaries: ['Contents/Resources/app/bin/ffmpeg', 'Contents/Resources/app/bin/ffprobe'],
  },
  dmg: { title: 'Nako 画布 ${version}' },
};

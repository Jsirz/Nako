const path = require('node:path');
const configuration = require('../../config/desktop-updates.json');

function sparkleBuild(feed) {
  if (!feed || Buffer.from(configuration.sparklePublicKey || '', 'base64').length !== 32)
    throw new Error('Mac releases require a Sparkle feed and Ed25519 public key');
  return {
    extraFiles: [{
      from: path.resolve('.packaging/app/node_modules/electron-sparkle-updater/native/vendor/Sparkle.framework'),
      to: 'Frameworks/Sparkle.framework',
    }],
    afterPack: 'scripts/desktop/signMac.cjs',
    extendInfo: {
      SUFeedURL: new URL('appcast.xml', feed).href,
      SUPublicEDKey: configuration.sparklePublicKey,
      SUEnableInstallerLauncherService: false,
      SUVerifyUpdateBeforeExtraction: true,
      SURequireSignedFeed: true,
      SUDeltaChainHistory: 0,
      SUEnableAutomaticChecks: false,
      CFBundleLocalizations: ['en', 'zh_CN', 'zh_TW'],
    },
  };
}
module.exports = { sparkleBuild };

const configuration = require('../../config/desktop-updates.json');

// Each platform/CPU has its own metadata, preventing macOS builds overwriting each other.
function updateFeed(platform = process.platform, arch = process.arch, input = process.env.NAKO_UPDATE_URL || configuration.url) {
  if (!input) return null;
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('NAKO_UPDATE_URL must be an HTTPS directory without credentials, query or fragment.');
  if (!['win32', 'darwin'].includes(platform) || !['x64', 'arm64'].includes(arch))
    throw new Error('Unsupported update platform/architecture');
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${platform === 'win32' ? 'windows' : 'mac'}-${arch}/`;
  return url.href;
}
module.exports = { updateFeed };

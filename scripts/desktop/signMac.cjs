const { execFileSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const path = require('node:path');

module.exports = async context => {
  if (context.electronPlatformName !== 'darwin') return;
  const appName = readdirSync(context.appOutDir).find(name => name.endsWith('.app'));
  if (!appName) throw new Error('Packaged app not found');
  const bundle = path.join(context.appOutDir, appName);
  const entitlements = path.resolve('apps/desktop/entitlements.mac.plist');
  const sign = target => execFileSync('codesign', ['--force', '--sign', '-', '--options', 'runtime',
    '--entitlements', entitlements, target], { stdio: 'inherit' });
  // Sign every Mach-O leaf before signing nested bundles, then seal the complete host bundle.
  const magic = new Set(['cffaedfe', 'cefaedfe', 'cafebabe', 'bebafeca', 'cafebabf']);
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        if (/\.(app|framework|xpc|bundle)$/.test(entry.name)) sign(file);
      } else if (entry.isFile()) {
        const { openSync, readSync, closeSync } = require('node:fs');
        const fd = openSync(file, 'r'), header = Buffer.alloc(4);
        try { readSync(fd, header, 0, 4, 0); } finally { closeSync(fd); }
        if (magic.has(header.toString('hex'))) sign(file);
      }
    }
  }
  walk(bundle);
  sign(bundle);
  execFileSync('codesign', ['--verify', '--deep', '--strict', bundle], { stdio: 'inherit' });
};

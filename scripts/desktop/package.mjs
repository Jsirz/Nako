import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ensureMediaRuntime } from '../runtime/mediaRuntime.mjs';
import updateConfiguration from './updateFeed.cjs';
import desktopUpdates from '../../config/desktop-updates.json' with { type: 'json' };
import { buildUpdateHelper } from './buildUpdateHelper.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const stage = path.join(root, '.packaging', 'app');
const target = process.argv[2];
if (!['win', 'mac'].includes(target)
  || (target === 'win' ? process.platform !== 'win32' : process.platform !== 'darwin'))
  throw new Error('请在 Windows 上运行 desktop:package:win，在 macOS 上运行 desktop:package:mac。');
if (!(target === 'win' ? process.arch === 'x64' : ['x64', 'arm64'].includes(process.arch)))
  throw new Error('Unsupported packaging architecture');
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (process.versions.node !== metadata.engines.node) throw new Error(`需要 Node ${metadata.engines.node}`);
const electron = JSON.parse(await readFile(path.join(root, 'apps/desktop/package.json'), 'utf8'));

function run(args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Build failed (${code}): ${args[0]}`)));
  });
}

async function copyApplication() {
  // Only this fixed build-output directory is removed. No user directories are touched.
  if (path.dirname(stage) !== path.join(root, '.packaging')) throw new Error('Invalid staging path');
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  const entries = ['modules', 'plugins', 'config', 'integrations', 'public', 'dist', 'bin', 'nodes',
    'apps/backend', 'apps/desktop/src', 'apps/desktop/launcher/dist', 'scripts/release',
    'LICENSE', 'LICENSE.upstream', 'THIRD-PARTY-NOTICES.md', 'SOURCE-ORIGIN.md', 'package.json', 'package-lock.json'];
  const excluded = new Set(['node_modules', '.git', '__pycache__', 'private', 'logs', '.DS_Store']);
  for (const entry of entries) await cp(path.join(root, entry), path.join(stage, entry), {
    recursive: true,
    filter: (file) => !excluded.has(path.basename(file))
      && !/^(?:\.env|providers\.env)$|\.(?:db|log|pem|key|p12|pfx)$|\.test\.[cm]?[jt]sx?$/.test(path.basename(file)),
  });
  // Ship clean defaults, never values from a developer's environment template.
  await writeFile(path.join(stage, '.env.example'), 'SERVER_PORT = 3001\nCOMFYUI_SERVER_URL = 127.0.0.1:8188\nCOMFYUI_AUTO_START = true\n');
  await writeFile(path.join(stage, 'config/desktop-updates.json'),
    JSON.stringify({ ...desktopUpdates, url: updateConfiguration.updateFeed() }, null, 2) + '\n');
}

async function installDependencies() {
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('请通过 npm run desktop:package:win 或 desktop:package:mac 打包。');
  await run([npm, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], stage);
  if (target === 'mac') await run([
    path.join(stage, 'node_modules/electron-sparkle-updater/bin/electron-sparkle-updater.js'),
    'rebuild', '--electron-version', electron.devDependencies.electron, '--arch', process.arch,
  ], stage);
  // Explicitly install the pinned Node-API binary; do not run arbitrary dependency scripts.
  const require = createRequire(path.join(stage, 'package.json'));
  await run([require.resolve('prebuild-install/bin.js'), '-r', 'napi'], path.join(stage, 'node_modules/sqlite3'));
  await run(['--input-type=module', '-e',
    "import sharp from 'sharp'; import sqlite3 from 'sqlite3'; await sharp({create:{width:1,height:1,channels:4,background:'#000'}}).png().toBuffer(); await new Promise((resolve,reject)=>{const db=new sqlite3.Database(':memory:',error=>error?reject(error):db.close(error=>error?reject(error):resolve()));});"], stage);
  const { devDependencies, scripts, nakoRuntime, ...production } = metadata;
  await writeFile(path.join(stage, 'package.json'), JSON.stringify({ ...production,
    main: 'apps/desktop/src/main.mjs', productName: electron.productName, author: 'Nako',
  }, null, 2) + '\n');
}

await ensureMediaRuntime({ appRoot: root });
for (const args of [
  ['scripts/generate-app-icon.mjs'], ['scripts/build-model-catalog.mjs'],
  ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.stable.config.ts'],
  ['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/desktop/launcher/vite.config.ts'],
]) await run(args);
await copyApplication();
if (target === 'win') await buildUpdateHelper(root,
  path.join(stage, 'modules/desktop-shell-observability/desktop/windows/NakoUpdate.exe'));
await installDependencies();
const builderArguments = ['node_modules/electron-builder/cli.js', '--config', 'electron-builder.config.cjs',
  `--${target}`, `--${process.arch}`, '--publish', 'never', `-c.electronVersion=${electron.devDependencies.electron}`];
const electronDist = path.join(root, 'apps/desktop/node_modules/electron/dist');
if (existsSync(path.join(electronDist, process.platform === 'win32' ? 'electron.exe' : 'Electron.app')))
  builderArguments.push(`-c.electronDist=${electronDist}`);
await run(builderArguments);
const output = path.join(root, 'release');
if (target === 'mac') {
  for (const extension of ['zip', 'dmg']) await rm(
    path.join(output, `Nako-${metadata.version}-mac-${process.arch}.${extension}.blockmap`), { force: true });
}
const artifacts = (await readdir(output)).filter((name) => name.startsWith(`Nako-${metadata.version}-`)
  && name.includes(`-${process.arch}`) && /\.(exe|dmg|zip)$/.test(name));
const checksums = [];
for (const name of artifacts) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path.join(output, name))) hash.update(chunk);
  checksums.push(`${hash.digest('hex')}  ${name}`);
}
await writeFile(path.join(output, `SHA256SUMS-${target}-${process.arch}.txt`), checksums.join('\n') + '\n');
process.stdout.write(`\n桌面应用已生成：${artifacts.map((name) => path.join(output, name)).join('\n')}\n`);

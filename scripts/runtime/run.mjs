import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const requiredNode = String(metadata.engines?.node || '');

function assertRuntime() {
  if (!((process.platform === 'win32' && process.arch === 'x64')
    || (process.platform === 'darwin' && ['x64', 'arm64'].includes(process.arch)))) {
    throw new Error('Nako supports Windows x64 and macOS x64/arm64.');
  }
  if (process.versions.node !== requiredNode) {
    throw new Error(
      `Nako requires Node ${requiredNode}; current runtime is ${process.versions.node}.`,
    );
  }
}

function run(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  child.once('error', (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 1);
  });
}

assertRuntime();
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--check') {
  console.log(`Node ${process.versions.node} (${process.platform}-${process.arch})`);
} else if (args.length === 1 && args[0] === '--npm') {
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  run(process.execPath, [npmCli]);
} else if (args.length > 0) {
  run(process.execPath, args);
} else {
  throw new Error('No runtime command was provided.');
}

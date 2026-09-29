import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureMediaRuntime } from './mediaRuntime.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const requiredNode = String(metadata.engines?.node || '');

if (!((process.platform === 'win32' && process.arch === 'x64')
  || (process.platform === 'darwin' && ['x64', 'arm64'].includes(process.arch)))) {
  throw new Error('Nako supports Windows x64 and macOS x64/arm64.');
}
if (process.versions.node !== requiredNode) {
  throw new Error(
    `Install Node ${requiredNode} before setup; current runtime is ${process.versions.node}.`,
  );
}

console.log(`Nako runtime is ready: Node ${process.versions.node} (${process.arch}).`);
await ensureMediaRuntime({ appRoot: root });
console.log('Nako media runtime is ready.');

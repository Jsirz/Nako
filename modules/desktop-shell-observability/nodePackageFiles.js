import fs from 'node:fs/promises';
import path from 'node:path';
import { NODE_ERROR, nodeError } from '../contracts/nodeExecution.js';

export async function readNodePackageFile(directory, name, maximum = 1024 * 1024) {
  if (typeof name !== 'string' || path.isAbsolute(name)) throw nodeError(NODE_ERROR.INVALID, '节点文件路径无效');
  const root = await fs.realpath(directory), file = await fs.realpath(path.resolve(root, name));
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw nodeError(NODE_ERROR.DENIED, '节点文件超出包目录');
  if ((await fs.stat(file)).size > maximum) throw nodeError(NODE_ERROR.INVALID, '节点文件超出大小限制');
  return fs.readFile(file, 'utf8');
}

export async function readNodeSources(directory) {
  const sources = {}, queue = [''];
  let bytes = 0;
  while (queue.length) {
    const relative = queue.shift();
    for (const item of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      if (item.isSymbolicLink()) throw nodeError(NODE_ERROR.DENIED, '节点包不允许符号链接');
      if (['node_modules', '.git'].includes(item.name)) continue;
      const name = relative ? `${relative}/${item.name}` : item.name;
      if (item.isDirectory()) { if (name.split('/').length < 8) queue.push(name); continue; }
      if (!/\.(mjs|js)$/.test(name)) continue;
      const source = await readNodePackageFile(directory, name);
      bytes += Buffer.byteLength(source);
      if (Object.keys(sources).length >= 100 || bytes > 4 * 1024 * 1024) throw nodeError(NODE_ERROR.INVALID, '节点包源码超出限制');
      sources[name] = source;
    }
  }
  return sources;
}

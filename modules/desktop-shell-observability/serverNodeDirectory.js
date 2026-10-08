import { desktopNodeError as nodeError } from '../contracts/desktopErrors.js';
import { NODE_ERROR } from '../contracts/nodeExecution.js';
import { createModuleLogger } from '../kernel/logger.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { executeIsolatedNode } from './nodeSandbox.js';
import { readNodeSources, readNodePackageFile } from './nodePackageFiles.js';
import { validateNodePackageManifest } from '../contracts/nodeSdk.js';

const MAX_MANIFEST_BYTES = 1024 * 1024;
const PACKAGE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const MANIFEST_FILES = ['manifest.json', 'node-package.json'];

const safeJson = value => JSON.parse(JSON.stringify(value));
const inside = (root, target) => {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

async function findManifest(directory) {
  for (const fileName of MANIFEST_FILES) {
    const file = path.join(directory, fileName);
    try { await fs.access(file); return file; } catch { /* try the next supported name */ }
  }
  return null;
}

async function packageDirectories(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const directories = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !PACKAGE_ID.test(entry.name) || entry.name.startsWith('.')) continue;
    const directory = path.join(root, entry.name);
    if (await findManifest(directory)) directories.push(directory);
  }
  return directories;
}

async function loadExecutors(directory, manifest, logger) {
  const moduleLogger = createModuleLogger('desktop-shell-observability', logger);
  const entryName = typeof manifest.entry === 'string' ? manifest.entry : 'index.mjs';
  const entry = path.resolve(directory, entryName);
  if (!inside(directory, entry) || !entry.endsWith('.mjs')) throw nodeError(NODE_ERROR.INVALID, 'Node entry must be an .mjs file inside its package directory');
  const sources = await readNodeSources(directory);
  if (!sources[entryName]) throw nodeError(NODE_ERROR.MISSING, 'Node entry is missing');
  const declarations = manifest.nodes.flatMap(node => node.executor ? [node.executor] : []);
  moduleLogger.info('Loaded isolated node package', { moduleId: 'desktop-shell-observability', operation: 'nodes.load', pluginId: manifest.id });
  return Object.fromEntries(declarations.map(declaration => [declaration.method, (input, context) => executeIsolatedNode({
    sources, entry: entryName, method: declaration.method, logger, pluginId: manifest.id,
    timeoutMs: Math.min(1800000, Math.max(1000, Number(declaration.timeoutMs) || 120000)),
  }, input, context)]));
}

export function createNodeDirectoryLoader({ directory, builtinDirectory, registry, logger = console } = {}) {
  if (!directory || !registry) throw nodeError(NODE_ERROR.INVALID, 'Node directory and registry are required');
  const loaded = new Map();
  let errors = [];
  let queue = Promise.resolve();

  async function reloadDirectory() {
    await fs.mkdir(directory, { recursive: true });
    const nextErrors = [];
    const next = new Map();
    const directories = await packageDirectories(directory);
    if (builtinDirectory) {
      const index = directories.findIndex(item => path.resolve(item) === path.resolve(builtinDirectory));
      if (index >= 0) directories.splice(index, 1);
      directories.unshift(builtinDirectory);
    }
    for (const packageDirectory of directories) {
      try {
        const manifestFile = await findManifest(packageDirectory);
        const manifest = validateNodePackageManifest(JSON.parse(await readNodePackageFile(packageDirectory, path.basename(manifestFile), MAX_MANIFEST_BYTES)));
        const builtin = builtinDirectory && path.resolve(packageDirectory) === path.resolve(builtinDirectory);
        if (!builtin && (manifest.id === 'nako.canvas-core' || manifest.nodes.some(node => node.render.kind === 'native')))
          throw nodeError(NODE_ERROR.DENIED, '原生渲染器只供宿主基础节点使用；自定义节点请使用 generic 或 iframe');
        const executors = await loadExecutors(packageDirectory, manifest, logger);
        const registryId = manifest.id;
        const packageId = `user.nodes.${registryId}`;
        if (next.has(registryId)) throw nodeError(NODE_ERROR.CONFLICT, `Duplicate node package: ${manifest.id}`);
        next.set(registryId, { registryId, packageId, directory: packageDirectory, manifest, executors });
      } catch (error) {
        nextErrors.push({ directory: packageDirectory, message: error instanceof Error ? error.message : String(error) });
      }
    }
    for (const registryId of loaded.keys()) registry.unregister(registryId);
    loaded.clear();
    for (const [registryId, record] of next) {
      try {
        registry.register({ manifest: record.manifest, executors: record.executors }, 'user.node-directory');
        loaded.set(registryId, record);
      } catch (error) {
        nextErrors.push({
          directory: record.directory,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    errors = nextErrors;
    return list();
  }

  function reload() { const result = queue.then(reloadDirectory); queue = result.catch(() => {}); return result; }

  function list() {
    return {
      directory,
      packages: [...loaded.values()].map(({ packageId, directory: packageDirectory, manifest }) => ({
        packageId, directory: packageDirectory, manifest: safeJson(manifest),
      })),
      errors: [...errors],
    };
  }

  async function ui(packageId, nodeType) {
    const record = loaded.get(packageId);
    const renderer = record?.manifest.nodes.find(node => node.type === nodeType)?.render;
    if (renderer?.kind !== 'iframe') throw nodeError(NODE_ERROR.INVALID, 'Node UI is not available');
    return readNodePackageFile(record.directory, renderer.entry);
  }
  return Object.freeze({ directory, reload, list, ui });
}

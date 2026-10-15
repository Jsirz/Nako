import { checkFileLimits } from './architecture/fileLimits.mjs';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readModelContributions } from './model-contributions.mjs';
import {
  findDependencyCycles,
  isBackendSource,
  moduleOwner,
  forbiddenModuleImport,
  importSpecifiers,
} from './architecture/sourceGraph.mjs';
const modelImports = new Set(readModelContributions().map((item) => item.target));
// Only the host composition root may wire this account-owned adapter directly.
const hostBindings = new Set([
  'modules/desktop-shell-observability/serverHost.js->modules/identity-account/api/credentialStore.js',
]);
const providerSdk = new Set([
  'modules/generation-providers/index.js',
  'modules/generation-providers/api/server/providers/baseProvider.js',
  'modules/generation-providers/api/server/providers/providerKit.js',
  'modules/generation-providers/api/server/providers/cliMediaInputs.js',
]);
const skip = new Set(['node_modules', 'dist', '.verification', '.desktop-dev', '.git']);
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      skip.has(entry.name)
        ? []
        : entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
    );
const files = ['modules', 'plugins', 'apps', 'scripts', 'tests']
  .flatMap(walk)
  .filter((file) => /\.[cm]?[jt]sx?$/.test(file));
const failures = [];
const backendEdges = [];
const sources = new Map();
const publicApis = new Set();
for (const entry of fs
  .readdirSync('modules', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())) {
  const directory = `modules/${entry.name}`,
    inventory = `${directory}/exports.json`;
  if (fs.existsSync(inventory))
    for (const file of JSON.parse(fs.readFileSync(inventory, 'utf8'))) {
      if (!fs.existsSync(file) || !file.startsWith(`${directory}/api/`))
        failures.push(`${inventory}: invalid public API ${file}`);
      publicApis.add(file);
    }
  if (fs.existsSync(`${directory}/api`))
    for (const file of walk(`${directory}/api`)) {
      if (!publicApis.has(file.replaceAll('\\', '/')))
        failures.push(`${inventory}: unlisted public API ${file}`);
    }
}
const slash = (file) => file.replaceAll('\\', '/');
const resolve = (file, spec) => {
  const base = path.resolve(path.dirname(file), spec);
  for (const suffix of [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.mjs',
    '.cjs',
    '.json',
    '.d.ts',
    '/index.js',
    '/index.ts',
  ])
    if (fs.existsSync(base + suffix) && fs.statSync(base + suffix).isFile())
      return slash(path.relative(process.cwd(), base + suffix));
  return null;
};
for (const directory of ['src', 'server'])
  if (fs.existsSync(directory)) failures.push(`Retired source directory exists: ${directory}`);
for (const file of files) {
  const own = slash(file),
    text = fs.readFileSync(file, 'utf8'),
    source = ts.createSourceFile(file, text, 99, true);
  sources.set(own, text);
  const specs = importSpecifiers(source);
  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      if (/^(?:src\/|server\/)/.test(node.text))
        failures.push(`${own}: retired source path ${node.text}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const spec of specs) {
    if (spec.startsWith('@earendil-works/pi-') && !own.startsWith('modules/agent/'))
      failures.push(`${own}: pi is private to agent: ${spec}`);
    if (own.startsWith('modules/agent/') && /^(?:node:)?fs(?:\/|$)/.test(spec))
      failures.push(`${own}: Harness persistence must use the storage adapter`);
    if (own.startsWith('modules/asset-media/')
      && /^(?:(?:node:)?(?:fs|path|os|crypto|child_process)(?:\/|$)|sharp$)/.test(spec))
      failures.push(`${own}: media platform operations must use adapter services`);
    if (own.startsWith('modules/project/') && /^(?:sqlite3|better-sqlite3|node:sqlite)(?:\/|$)/.test(spec))
      failures.push(`${own}: project persistence must use ProjectRepository`);
    if (!spec.startsWith('.')) {
      if (/^modules\/(contracts|kernel)\//.test(own))
        failures.push(`${own}: package/platform dependency ${spec}`);
      continue;
    }
    const target = resolve(file, spec);
    if (!target) {
      failures.push(`${own}: unresolved import ${spec}`);
      continue;
    }
    if (own.startsWith('modules/canvas-ui/') && target.startsWith('modules/local-runtime/'))
      failures.push(`${own}: canvas must obtain local-runtime capabilities through kernel services`);
    const targetBusiness = target.startsWith('modules/') && !/^modules\/(?:contracts|kernel)\//.test(target);
    if (targetBusiness && own.startsWith('modules/') && moduleOwner(own) !== moduleOwner(target)
        && !hostBindings.has(`${own}->${target}`))
      failures.push(`${own}: cross-module calls and types must use kernel services/contracts: ${spec}`);
    if (targetBusiness && own.startsWith('plugins/')) {
      const sdk = (own.startsWith('plugins/providers/') || own.startsWith('plugins/platform/text-transport/'))
          && providerSdk.has(target)
        || own.startsWith('plugins/workflows/') && target === 'modules/workflow-runtime/api/defineExecutor.js';
      if (!sdk) failures.push(`${own}: adapter must use kernel services/contracts, not business implementations: ${spec}`);
    }
    if (moduleOwner(own) && moduleOwner(target) && isBackendSource(own))
      backendEdges.push({ from: moduleOwner(own), to: moduleOwner(target), source: own, target });
    if (
      own.startsWith('modules/') &&
      target.startsWith('plugins/') &&
      !(own === 'modules/generation-core/models/catalog.ts' && modelImports.has(target))
    )
      failures.push(`${own}: business module imports adapter implementation ${spec}`);
    if (/^modules\/contracts\//.test(own) && !target.startsWith('modules/contracts/'))
      failures.push(`${own}: contracts depend on implementation ${spec}`);
    if (/^modules\/kernel\//.test(own) && !/^modules\/(kernel|contracts)\//.test(target))
      failures.push(`${own}: kernel depends on implementation ${spec}`);
    if (forbiddenModuleImport(own, target))
      failures.push(`${own}: module imports application host or build/release script ${spec}`);
    if (target.startsWith('modules/') && !own.startsWith('tests/')) {
      const owner = own.split('/').slice(0, 2).join('/'),
        targetOwner = target.split('/').slice(0, 2).join('/');
      const publicTarget =
        /^modules\/(?:contracts|kernel)\//.test(target) ||
        /^modules\/[^/]+\/api\//.test(target) ||
        /^modules\/[^/]+\/(?:index|browser|rootPlugin|serverPlugin|desktopPlugin|registryPlugin)\.[cm]?[jt]sx?$/.test(
          target,
        ) ||
        /\.(?:json|css|svg)$/.test(target);
      if (owner !== targetOwner && !publicTarget)
        failures.push(`${own}: crosses private module boundary ${spec}`);
    }
    if (own.startsWith('plugins/') && target.startsWith('plugins/')) {
      const owner = own.split('/').slice(0, 3).join('/'),
        targetOwner = target.split('/').slice(0, 3).join('/');
      const workflowShared = own.startsWith('plugins/workflows/') && target.startsWith('plugins/workflows/shared/');
      if (owner !== targetOwner && !workflowShared)
        failures.push(`${own}: imports another adapter implementation ${spec}`);
    }
    if (
      /\/ui\//.test(own) &&
      /\/(?:server|desktop)\//.test(target) &&
      !target.includes('/ui/desktop/')
    )
      failures.push(`${own}: browser depends on platform implementation ${spec}`);
  }
  if (/\b(?:window|target|targetWindow|globalThis)\.__NAKO_/.test(text))
    failures.push(`${own}: window service locator`);
  if (
    !own.startsWith('scripts/') &&
    !own.startsWith('tests/') &&
    /\b(?:app|request\.app|req\.app)\.locals\b/.test(text)
  )
    failures.push(`${own}: undeclared app.locals service`);
}
for (const name of ['backend', 'application', 'browser', 'desktop', 'model']) {
  const catalogFile = `config/${name}-plugins.json`,
    catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  const ids = new Set();
  for (const entry of catalog) {
    if (ids.has(entry.id)) failures.push(`${catalogFile}: duplicate ${entry.id}`);
    ids.add(entry.id);
    const base = name === 'browser' ? 'apps/canvas/main.tsx' : catalogFile;
    if (!resolve(base, entry.entry)) failures.push(`${catalogFile}: missing entry ${entry.entry}`);
    if (entry.manifest) {
      const file = resolve(base, entry.manifest);
      if (!file) failures.push(`${catalogFile}: missing manifest ${entry.manifest}`);
      else if (JSON.parse(fs.readFileSync(file)).id !== entry.id)
        failures.push(`${catalogFile}: identity mismatch ${entry.id}`);
    }
  }
}
for (const cycle of findDependencyCycles(backendEdges)) {
  const members = new Set(cycle);
  const evidence = backendEdges.filter(
    (edge) => edge.from !== edge.to && members.has(edge.from) && members.has(edge.to),
  );
  failures.push(
    `Backend module dependency cycle: ${cycle.join(' <-> ')}\n${evidence.map((edge) => `  ${edge.source} -> ${edge.target}`).join('\n')}`,
  );
}
failures.push(...checkFileLimits(sources).failures);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Architecture passed: ${files.length} source files; kernel service boundaries; public module APIs; 5 plugin catalogs.`,
  );

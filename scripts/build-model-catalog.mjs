import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createModelCatalog } from '../modules/generation-core/api/server/config/modelCatalog.js';
import { readModelContributions, validateModelDefinitions, MODEL_EXPORT_KINDS } from './model-contributions.mjs';
const catalogUrl = new URL('../config/model-plugins.json', import.meta.url);
const plugins = readModelContributions(fileURLToPath(new URL('../', import.meta.url)));
const listNames = Object.keys(MODEL_EXPORT_KINDS);
const modelLists = Object.fromEntries(listNames.map((name) => [name, []]));
let browser = '// Generated from plugin-owned declarative model contributions.\n';
for (const [index, plugin] of plugins.entries()) {
  const url = new URL(plugin.entry, catalogUrl);
  const result = await build({
    entryPoints: [fileURLToPath(url)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
    metafile: true,
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    const normalized = path.relative(fileURLToPath(new URL('../', import.meta.url)), path.resolve(input)).replaceAll('\\', '/');
    if (normalized !== plugin.target && normalized !== plugin.target.replace(/models\.ts$/, 'protocol.js') && !plugin.dataTargets.includes(normalized))
      throw new Error(`Model data imports implementation: ${plugin.id}: ${normalized}`);
  }
  if (Object.values(result.metafile.outputs).some(output => output.imports.length))
    throw new Error(`Model data imports platform/runtime dependencies: ${plugin.id}`);
  const definitions = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
  validateModelDefinitions(plugin, definitions);
  for (const name of plugin.exports) {
    if (!listNames.includes(name) || !Array.isArray(definitions[name]))
      throw new Error(`Invalid model export ${plugin.id}: ${name}`);
    modelLists[name].push(...definitions[name]);
  }
  browser += `import * as p${index} from '${'../../' + plugin.entry.slice(3).replace(/\.ts$/, '')}';\n`;
}
browser += '\nexport const modelContributions = {\n';
for (const name of listNames) {
  modelLists[name].sort((a, b) => a.catalogOrder - b.catalogOrder);
  browser += `  ${name}: [${plugins.flatMap((plugin, index) => (plugin.exports.includes(name) ? [`...p${index}.${name}`] : [])).join(', ')}],\n`;
}
browser += '};\n';
const catalog = createModelCatalog(modelLists);
const count = Object.values(modelLists).reduce((sum, entries) => sum + entries.length, 0);
if (Object.keys(catalog).length !== count)
  throw new Error('Duplicate or invalid model names across plugins');
await writeFile(new URL('../apps/canvas/modelContributions.ts', import.meta.url), browser);
await writeFile(
  new URL('../modules/generation-core/server/config/modelCatalog.generated.json', import.meta.url),
  JSON.stringify(catalog, null, 2) + '\n',
);
console.log(`[ModelCatalog] ${count} models from ${plugins.length} plugin contributions`);

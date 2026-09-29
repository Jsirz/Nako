import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function convertPreferences(document) {
  if (document?.schemaVersion !== 1 || typeof document.browserImported !== 'boolean' ||
      !document.values || Array.isArray(document.values) || typeof document.values !== 'object') {
    throw new Error('Invalid preference document');
  }
  const values = {};
  for (const [key, value] of Object.entries(document.values)) {
    const renamed = key.replace(/^(?:aifisher|fisherai|noko)(?=[.:-])/, 'nako');
    if (renamed !== key && Object.hasOwn(document.values, renamed)) continue;
    if (Object.hasOwn(values, renamed) && values[renamed] !== value) {
      throw new Error('Conflicting preference keys; original document unchanged');
    }
    Object.defineProperty(values, renamed, { value, enumerable: true, configurable: true });
  }
  return { ...document, values };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination || path.resolve(source) === path.resolve(destination)) {
    throw new Error('Usage: node scripts/maintenance/convert-preferences.mjs SOURCE NEW_DESTINATION');
  }
  const document = convertPreferences(JSON.parse(await readFile(source, 'utf8')));
  await writeFile(destination, JSON.stringify(document, null, 2) + '\n', { flag: 'wx' });
  console.log('Nako preference copy created; original unchanged.');
}

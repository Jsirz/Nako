import fs from 'node:fs';
import path from 'node:path';
import { validatePluginManifest } from '../modules/contracts/index.js';

export const MODEL_EXPORT_KINDS = Object.freeze({ TEXT_MODELS: 'text', IMAGE_MODELS: 'image', AUDIO_MODELS: 'audio', VIDEO_MODELS: 'video' });

// The sole business-module -> plugin import exception is this explicit data catalog.
export function readModelContributions(root = process.cwd()) {
  const entries = JSON.parse(fs.readFileSync(path.join(root, 'config/model-plugins.json'), 'utf8'));
  if (!Array.isArray(entries)) throw new Error('Model contributions must be an array');
  const ids = new Set();
  return entries.map(entry => {
    if (!/^provider\.[a-z][a-z0-9-]*$/.test(entry.id) || ids.has(entry.id)) throw new Error(`Invalid model contribution identity: ${entry.id}`);
    ids.add(entry.id);
    const expected = `../plugins/providers/${entry.id.slice('provider.'.length)}/models.ts`;
    if (entry.entry !== expected || !Array.isArray(entry.exports) || !entry.exports.length || new Set(entry.exports).size !== entry.exports.length || entry.exports.some(name => !Object.hasOwn(MODEL_EXPORT_KINDS, name))) throw new Error(`Invalid model contribution: ${entry.id}`);
    const target = `plugins/providers/${entry.id.slice('provider.'.length)}/models.ts`;
    if (!fs.statSync(path.join(root, target)).isFile()) throw new Error(`Missing models: ${entry.id}`);
    const manifest = validatePluginManifest(JSON.parse(fs.readFileSync(path.join(root, path.dirname(target), 'manifest.json'), 'utf8')));
    if (manifest.id !== entry.id || !manifest.providers?.length) throw new Error(`Missing model provider declarations: ${entry.id}`);
    const dataFiles = entry.data || [];
    if (!Array.isArray(dataFiles) || new Set(dataFiles).size !== dataFiles.length)
      throw new Error(`Invalid model data list: ${entry.id}`);
    const dataTargets = dataFiles.map(file => {
      if (typeof file !== 'string' || !/^catalog\/[a-z0-9-]+\.json$/.test(file))
        throw new Error(`Invalid model data path: ${entry.id}`);
      const dataTarget = `plugins/providers/${entry.id.slice('provider.'.length)}/${file}`;
      const absolute = path.join(root, dataTarget);
      if (fs.lstatSync(absolute).isSymbolicLink() || !Array.isArray(JSON.parse(fs.readFileSync(absolute, 'utf8'))))
        throw new Error(`Model data must be a JSON array: ${dataTarget}`);
      return dataTarget;
    });
    return { ...entry, target, manifest, dataTargets };
  });
}

export function validateModelDefinitions(contribution, definitions) {
  for (const name of contribution.exports) {
    if (!Array.isArray(definitions[name])) throw new Error(`Invalid model export ${contribution.id}: ${name}`);
    for (const model of definitions[name]) {
      const provider = contribution.manifest.providers.find(item => item.name === model.provider);
      if (!model.name?.trim() || !Number.isFinite(model.catalogOrder) || !provider?.kinds.includes(MODEL_EXPORT_KINDS[name])) throw new Error(`Invalid model/provider/kind in ${contribution.id}: ${model.name}`);
    }
  }
}

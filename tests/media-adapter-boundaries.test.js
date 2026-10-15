import { afterEach, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PluginHost } from '../modules/kernel/index.js';
import probePlugin from '../plugins/media/ffmpeg-sharp/probePlugin.js';
import filesPlugin from '../plugins/media/filesystem/runtimePlugin.js';
import mediaPlugin from '../modules/asset-media/runtimePlugin.js';
import { ERRORS } from '../modules/contracts/errors.js';

const disposers = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const dispose of disposers.splice(0).reverse()) await dispose();
});

async function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nako-media-adapters-'));
  disposers.push(() => fs.rmSync(directory, { recursive: true, force: true }));
  const library = path.join(directory, 'library');
  fs.mkdirSync(library);
  const host = new PluginHost({ logger: { info() {}, warn() {}, error() {} } });
  host.register({
    manifest: { id: 'host.runtime', version: '1.0.0', apiVersion: '^1.0.0', type: 'platform',
      services: { provides: ['host.runtime', 'http.routes', 'platform.paths'] } },
    activate(context) {
      context.services.register('host.runtime', {});
      context.services.register('http.routes', {});
      context.services.register('platform.paths', {
        runtime: { BIN_DIR: directory }, workspace: () => ({ LIBRARY_DIR: library }),
        publicLibraryPrefix: () => '/library',
      });
    },
  }).register(probePlugin).register(filesPlugin).register(mediaPlugin);
  await host.start();
  disposers.push(() => host.stop());
  return { directory, library, host, runtime: host.services.get('media.runtime') };
}

it('starts media capabilities without the repository and full storage/processor plugins', async () => {
  const { host, library, runtime } = await fixture();
  const saved = runtime.saveBuffer(Buffer.from('fixture'), 'project-1', 'images', 'png', { prompt: 'fixture' }, 'node-1');
  expect(fs.readFileSync(saved.path, 'utf8')).toBe('fixture');
  expect(runtime.resolveLocalPath(saved.url + '?t=1')).toBe(saved.path);
  expect(runtime.imageBase64(saved.url)).toBe('data:image/png;base64,Zml4dHVyZQ==');
  expect(JSON.parse(fs.readFileSync(path.join(path.dirname(saved.path), saved.id + '.json'), 'utf8')))
    .toMatchObject({ id: saved.id, nodeId: 'node-1', prompt: 'fixture', filename: saved.filename });
  expect(await runtime.listAssets({ libraryDirectory: library, type: 'images', projectId: 'project-1' }))
    .toEqual([expect.objectContaining({ id: saved.id, url: saved.url })]);
  expect(host.services.list().find(item => item.id === 'media.files').owner).toBe('media.filesystem-runtime');
  expect(host.services.list().find(item => item.id === 'media.probe').owner).toBe('media.ffmpeg-probe');
  expect(host.services.has('project.repository')).toBe(false);
});

it('rejects a metadata publication failure and removes the uncommitted binary', async () => {
  const { library, runtime } = await fixture();
  vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw Object.assign(new Error('fixture'), { code: 'EACCES' }); });
  expect(() => runtime.saveBuffer(Buffer.from('fixture'), 'project-1', 'images', 'png'))
    .toThrow(expect.objectContaining({ code: ERRORS.mediaStorage, status: 500,
      context: expect.objectContaining({ moduleId: 'media.filesystem', operation: 'saveMetadata' }) }));
  expect(fs.readdirSync(path.join(library, 'media/project-1/images'))).toEqual([]);
});

it('keeps the previous metadata when an atomic update cannot be published', async () => {
  const { library, runtime } = await fixture();
  const saved = runtime.saveBuffer(Buffer.from('fixture'), 'project-1', 'images', 'png');
  const directory = path.dirname(saved.path), metadataPath = path.join(directory, saved.id + '.json');
  const original = fs.readFileSync(metadataPath, 'utf8');
  vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw Object.assign(new Error('fixture'), { code: 'EACCES' }); });
  expect(() => runtime.saveMetadata(directory, { id: saved.id, filename: saved.filename, prompt: 'changed' }))
    .toThrow(expect.objectContaining({ code: ERRORS.mediaStorage }));
  expect(fs.readFileSync(metadataPath, 'utf8')).toBe(original);
  expect(fs.readdirSync(directory).sort()).toEqual([saved.filename, saved.id + '.json'].sort());
  expect(runtime.resolveLocalPath('/library/%2e%2e%5coutside.png')).toBeNull();
  expect(() => runtime.listAssets({ libraryDirectory: path.dirname(library), type: 'images' })).toThrow();
});

it('rejects a linked project directory outside the current user library', async () => {
  const { directory, library, runtime } = await fixture();
  const outside = path.join(directory, 'outside');
  fs.mkdirSync(outside);
  fs.mkdirSync(path.join(library, 'media'));
  fs.symlinkSync(outside, path.join(library, 'media/project-1'), process.platform === 'win32' ? 'junction' : 'dir');
  expect(() => runtime.saveBuffer(Buffer.from('fixture'), 'project-1', 'images', 'png'))
    .toThrow(expect.objectContaining({ code: ERRORS.invalidMedia, status: 400 }));
  expect(fs.readdirSync(outside)).toEqual([]);
  expect(runtime.resolveLocalPath('/library/media/project-1')).toBeNull();
});

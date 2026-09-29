import { Readable } from 'node:stream';
import { createFilesystemMediaStore } from './assetStore.js';
import { createFilesystemLibraryStore } from './libraryStore.js';
import { createMediaDownloadStore } from './downloadStore.js';
import { imageContent, readAgentReference } from './agentImages.js';
import { fitVisualReferences } from './visualContactSheets.js';
import { createMediaInspector } from './mediaInspection.js';
import path from 'node:path';
import { findLatestMediaResult } from './generationRecovery.js';
import { generateAssetId, saveMediaBufferToFile, downloadAndSaveAsset } from '../../../modules/asset-media/api/server/utils/imageHelpers.js';
const kinds = { image: 'images', video: 'videos', audio: 'audios' };
const mimeTypes = { image: 'image/png', video: 'video/mp4', audio: 'audio/mpeg' };
function unwrap(result) {
  if (result.status >= 400) throw Object.assign(new Error(result.body.error), { code: result.body.code, status: result.status });
  return result.body;
}
export function createFilesystemMediaPlugin(options) {
  return {
    manifest: { id: 'media.filesystem', version: '1.0.0', apiVersion: '^1.0.0', type: 'media',
      dependencies: { 'storage.sqlite': '^1.0.0' }, services: { requires: ['project.repository'], provides: ['media.store', 'media.operations', 'media.agent', 'media.generation'] },
      capabilities: ['media.storage'], reloadRequired: true },
    activate(context) {
      const operations = Object.freeze({
        ...createFilesystemMediaStore({ ...options, logger: context.logger, workflowStore: context.services.get('project.repository') }),
        library: createFilesystemLibraryStore({ ...options, logger: context.logger }),
        downloads: createMediaDownloadStore(),
      });
      context.services.register('media.operations', operations);
      const validate = (projectId, type, extension = 'bin') => {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId) || !Object.values(kinds).includes(type) || !/^[A-Za-z0-9]{1,10}$/.test(extension)) throw new Error('Invalid generated media location');
      };
      context.services.register('media.generation', Object.freeze({
        createId: generateAssetId,
        saveBuffer(buffer, projectId, type, extension, metadata, nodeId) {
          validate(projectId, type, extension);
          return saveMediaBufferToFile(buffer, projectId, type, extension, metadata, nodeId, options);
        },
        download(url, projectId, type) { validate(projectId, type); return downloadAndSaveAsset(url, projectId, type, options); },
        findLatest: nodeId => findLatestMediaResult({ mediaDir: path.join(options.libraryDirectory, 'media'), nodeId, getUrlPrefix: () => '/library' }),
      }));
      context.services.register('media.agent', Object.freeze({
        readReference: input => readAgentReference({...input,libraryDirectory:options.libraryDirectory}),
        imageContent: (media, input) => imageContent(media, { ...input, libraryDirectory: options.libraryDirectory }),
        fitVisualReferences: (media, limit, input) => fitVisualReferences(media, limit, { ...input, libraryDirectory: options.libraryDirectory }),
        inspect: createMediaInspector({ libraryDirectory: options.libraryDirectory }),
      }));
      context.services.register('media.store', Object.freeze({
        async save(input) {
          if (!kinds[input.type] || !input.data) throw new Error('Invalid media input');
          const body = unwrap(await operations.upload({ params: { type: kinds[input.type] },
            headers: { 'x-project-id': input.projectId, 'x-filename': encodeURIComponent(input.name || `${input.type}.${input.type === 'image' ? 'png' : input.type === 'video' ? 'mp4' : 'mp3'}`), 'content-length': input.data.byteLength, 'content-type': mimeTypes[input.type] },
            stream: Readable.from([input.data]) }));
          return { ...body.asset, id: body.asset.id, type: input.type, projectId: input.projectId, url: body.url };
        },
        async read(id) {
          for (const [type, plural] of Object.entries(kinds)) {
            const result = unwrap(await operations.list({ params: { type: plural }, query: {} }));
            const asset = (Array.isArray(result) ? result : result.assets || []).find(item => item.id === id);
            if (asset) return { ...asset, type };
          }
          return null;
        },
        async remove(id) {
          const asset = await this.read(id);
          if (asset) unwrap(await operations.deleteAsset({ params: { type: kinds[asset.type], id }, query: { projectId: asset.projectId } }));
        },
      }));
    },
  };
}

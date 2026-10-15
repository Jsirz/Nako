import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ERRORS, PluginError } from '../../../modules/contracts/errors.js';
import { resolveLocalPath, resolveImageToBase64, assertInside } from './mediaPaths.js';
import { saveAssetMetadata, saveMediaBufferToFile } from './mediaWrites.js';
import { resolveMediaArtifact, inspectMediaArtifact } from './mediaArtifact.js';
import { buildAssetUrl, normalizeAsset, listMediaAssets } from './mediaAssetListing.js';
import { validateRecoveredVideo } from './recoveredVideo.js';
import { signTOSV4 } from './tosSigner.js';

/** @returns {import('../../../modules/contracts/mediaRuntime').MediaFileService} */
export function createMediaFiles({ paths, probe, logger }) {
  const libraryDirectory = () => paths.workspace().LIBRARY_DIR;
  const createMetadataProbe = options => probe.create({
    resolveMimeType: (filename, type) => resolveMediaArtifact({ filename, declaredType: type }).mimeType,
    ...options,
  });
  return Object.freeze({
    resolveLocalPath: input => resolveLocalPath(input, libraryDirectory()),
    imageBase64: input => resolveImageToBase64(input, libraryDirectory(), logger),
    resolveArtifact: resolveMediaArtifact,
    inspectArtifact: inspectMediaArtifact,
    createMetadataProbe,
    signStorage: signTOSV4,
    validateRecoveredVideo: (buffer, signal) => validateRecoveredVideo(buffer, signal, createMetadataProbe()),
    createId: () => randomUUID(),
    saveMetadata(directory, metadata) {
      try {
        assertInside(fs.realpathSync(libraryDirectory()), fs.realpathSync(directory), 'saveMetadata');
        saveAssetMetadata(directory, metadata, logger);
      } catch (cause) {
        if (cause instanceof PluginError) throw cause;
        throw new PluginError(ERRORS.mediaStorage, '媒体元数据保存失败', {
          status: 500, cause, context: { moduleId: 'media.filesystem', operation: 'saveMetadata', assetId: metadata.id },
        });
      }
    },
    saveBuffer: (buffer, projectId, type, extension, metadata = {}, nodeId) =>
      saveMediaBufferToFile(buffer, projectId, type, extension, metadata, nodeId, libraryDirectory(), paths.publicLibraryPrefix(), logger),
    assetUrl: buildAssetUrl,
    normalizeAsset,
    listAssets(options) {
      if (path.resolve(options.libraryDirectory) !== path.resolve(libraryDirectory())) {
        throw new PluginError(ERRORS.invalidMedia, '媒体存储目录无效', {
          status: 400, context: { moduleId: 'media.filesystem', operation: 'listAssets' },
        });
      }
      return listMediaAssets(options);
    },
  });
}

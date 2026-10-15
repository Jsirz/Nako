import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ERRORS, PluginError } from '../../../modules/contracts/errors.js';
import { assertInside } from './mediaPaths.js';
import { resolveMediaArtifact } from './mediaArtifact.js';

function storageError(operation, cause, context = {}) {
  return cause instanceof PluginError ? cause : new PluginError(ERRORS.mediaStorage, '媒体文件保存失败', {
    status: 500, cause, context: { moduleId: 'media.filesystem', operation, ...context },
  });
}

export function removeIncomplete(filename, logger, operation) {
  try { fs.rmSync(filename, { force: true }); }
  catch (error) { logger.warn('Incomplete media cleanup failed', { operation, error }); }
}

/** Publish one complete metadata file; failures always propagate to the caller. */
export function saveAssetMetadata(directory, data, logger) {
  const { id, filename, prompt, type, model, mode, aspectRatio, resolution, nodeId, cost, ...extra } = data;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(id)) {
    throw new PluginError(ERRORS.invalidMedia, '媒体标识无效', {
      status: 400, context: { moduleId: 'media.filesystem', operation: 'saveMetadata' },
    });
  }
  const metadata = {
    id, filename, nodeId: nodeId || null, prompt: prompt || '', model: model || 'Unknown',
    mode: typeof mode === 'string' ? mode : '', aspectRatio: aspectRatio || 'Auto',
    resolution: resolution || 'Auto', cost: typeof cost === 'number' ? cost : 0,
    createdAt: new Date().toISOString(), type, ...extra,
  };
  const temporary = path.join(directory, `.${id}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(metadata, null, 2), { flag: 'wx' });
    fs.renameSync(temporary, path.join(directory, `${id}.json`));
  } catch (cause) {
    removeIncomplete(temporary, logger, 'saveMetadata.cleanup');
    throw storageError('saveMetadata', cause, { assetId: id });
  }
}

export function saveMediaBufferToFile(buffer, projectId, type, extension, meta, nodeId, libraryDirectory, urlPrefix, logger) {
  const operation = 'saveBuffer';
  if (typeof projectId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(projectId)
    || !['images', 'videos', 'audios'].includes(type)
    || typeof extension !== 'string' || !/^[A-Za-z0-9]{1,10}$/.test(extension)
    || !(buffer instanceof Uint8Array) || !buffer.byteLength
    || buffer.byteLength > resolveMediaArtifact({ declaredType: type }).maximumBytes) {
    throw new PluginError(ERRORS.invalidMedia, '媒体数据或保存位置无效', {
      status: 400, context: { moduleId: 'media.filesystem', operation, projectId },
    });
  }
  const root = path.resolve(libraryDirectory);
  const id = randomUUID(), filename = `${id}.${extension}`;
  const directory = path.join(root, 'media', projectId, type);
  const target = path.join(directory, filename);
  let written = false;
  try {
    fs.mkdirSync(root, { recursive: true });
    const canonicalRoot = fs.realpathSync(root);
    let current = root;
    for (const segment of ['media', projectId, type]) {
      current = path.join(current, segment);
      fs.mkdirSync(current, { recursive: true });
      assertInside(canonicalRoot, fs.realpathSync(current), operation);
    }
    const descriptor = fs.openSync(target, 'wx');
    written = true;
    try { fs.writeFileSync(descriptor, buffer); }
    finally { fs.closeSync(descriptor); }
    saveAssetMetadata(directory, { ...meta, id, filename, type, nodeId }, logger);
  } catch (cause) {
    if (written) removeIncomplete(target, logger, 'saveBuffer.cleanup');
    throw storageError(operation, cause, { projectId, assetId: id });
  }
  return { id, path: target, url: `${urlPrefix}/media/${projectId}/${type}/${filename}`, filename };
}

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ERRORS, PluginError } from '../../../modules/contracts/index.js';
import { resolveMediaArtifact } from '../../../modules/asset-media/api/server/media/mediaArtifact.js';

/** Synchronous project snapshots retain their existing repository save contract. */
export function createProjectMediaStore({ libraryDirectory, logger }) {
  const root = path.resolve(libraryDirectory, 'media');
  const fail = (message, projectId, cause) => {
    throw new PluginError(ERRORS.mediaStorage, message, {
      context: { moduleId: 'media.filesystem', projectId }, cause,
    });
  };
  function directoryFor(projectId, type) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId) || !['images', 'videos', 'audios'].includes(type)) {
      throw new PluginError(ERRORS.invalidMedia, '项目媒体位置无效', {
        context: { moduleId: 'media.filesystem', projectId }, status: 400,
      });
    }
    fs.mkdirSync(root, { recursive: true });
    const canonicalRoot = fs.realpathSync(root);
    const inside = candidate => {
      const relative = path.relative(canonicalRoot, fs.realpathSync(candidate));
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        fail('项目媒体位置超出存储目录', projectId);
      }
    };
    const projectDirectory = path.join(root, projectId);
    fs.mkdirSync(projectDirectory, { recursive: true });
    inside(projectDirectory);
    const directory = path.join(projectDirectory, type);
    fs.mkdirSync(directory, { recursive: true });
    inside(directory);
    return directory;
  }
  function saveMediaToFile(dataUrl, projectId, prompt = '', nodeId = null) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) fail('内联媒体格式无效', projectId);
    const declared = resolveMediaArtifact({ contentType: match[1] });
    if (match[2].length > Math.ceil(declared.maximumBytes / 3) * 4) fail('内联媒体超过大小限制', projectId);
    const buffer = Buffer.from(match[2], 'base64');
    const artifact = resolveMediaArtifact({ contentType: match[1], prefix: buffer.subarray(0, 32), requireRecognizedContent: true });
    if (!buffer.length || buffer.length > artifact.maximumBytes || artifact.kind !== declared.kind) fail('内联媒体内容无效', projectId);
    const directory = directoryFor(projectId, artifact.storageType);
    const id = randomUUID();
    const filename = `${id}${artifact.extension}`;
    const target = path.join(directory, filename);
    const metadata = {
      id, filename, nodeId, prompt, type: artifact.storageType, model: 'System',
      cost: 0, aspectRatio: 'Auto', resolution: 'Auto', createdAt: new Date().toISOString(),
    };
    try {
      fs.writeFileSync(target, buffer, { flag: 'wx' });
      fs.writeFileSync(path.join(directory, `${id}.json`), JSON.stringify(metadata, null, 2), { flag: 'wx' });
    } catch (cause) {
      fs.rmSync(target, { force: true });
      fail('项目媒体保存失败', projectId, cause);
    }
    return { id, url: `/library/media/${projectId}/${artifact.storageType}/${filename}` };
  }
  function findLastFrame(projectId, nodeId) {
    if (!nodeId) return null;
    const directory = directoryFor(projectId, 'images');
    let latest;
    for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.json'))) {
      let metadata;
      try { metadata = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')); }
      catch { continue; }
      if (metadata.nodeId !== nodeId || metadata.prompt !== 'Video Last Frame'
        || typeof metadata.filename !== 'string' || path.basename(metadata.filename) !== metadata.filename
        || /[\\/:\0]/.test(metadata.filename) || !fs.existsSync(path.join(directory, metadata.filename))) continue;
      if (!latest || new Date(metadata.createdAt || 0) > new Date(latest.createdAt || 0)) latest = metadata;
    }
    return latest ? `/library/media/${projectId}/images/${latest.filename}` : null;
  }
  function sanitizeWorkflowNodes(nodes, projectId) {
    if (!Array.isArray(nodes)) return nodes;
    let count = 0;
    const fields = { resultUrl: 'Canvas Content', lastFrame: 'Video Last Frame', editorCanvasData: 'Editor Content', editorBackgroundUrl: 'Editor Background' };
    const sanitized = nodes.map(node => {
      const clean = { ...node };
      for (const [field, prompt] of Object.entries(fields)) {
        if (typeof clean[field] !== 'string' || !clean[field].startsWith('data:')) continue;
        const existing = field === 'lastFrame' ? findLastFrame(projectId, clean.id) : null;
        const saved = existing ? { url: existing } : saveMediaToFile(clean[field], projectId, prompt, clean.id);
        if (saved) { clean[field] = saved.url; count += 1; }
      }
      return clean;
    });
    if (count) logger.info('Project media snapshot saved', { projectId, convertedFields: count });
    return sanitized;
  }
  return Object.freeze({ saveMediaToFile, sanitizeWorkflowNodes });
}

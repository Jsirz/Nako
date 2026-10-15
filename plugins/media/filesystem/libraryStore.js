import { ERRORS, PluginError } from '../../../modules/contracts/index.js';
import { mediaError } from '../../../modules/contracts/mediaDelivery.js';
import { createModuleLogger } from '../../../modules/kernel/logger.js';
import { mediaFiles } from '../../../modules/kernel/server.js';
import { removeIncomplete } from './mediaWrites.js';
const generateAssetId = (...args) => mediaFiles().createId(...args);
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';

function saveAssetMetadata(directory, metadata, logger) {
    try { mediaFiles().saveMetadata(directory, metadata); }
    catch (error) {
        removeIncomplete(path.join(directory, metadata.filename), logger, 'libraryImport.cleanup');
        throw error;
    }
}

class FilesystemLibraryStore {
    constructor({ libraryDirectory, publicDirectory, logger = createModuleLogger('media.filesystem') }) {
        Object.assign(this, { libraryDirectory, publicDirectory, logger });
        this.LIBRARY_ASSETS_DIR = path.join(libraryDirectory, 'assets');
        this.LIBRARY_WORKFLOWS_DIR = path.join(libraryDirectory, 'workflows');
        for (const directory of [this.LIBRARY_ASSETS_DIR, this.LIBRARY_WORKFLOWS_DIR]) {
            if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
        }
    }
    getUrlPrefix = () => '/library';
    getProjectMediaDir = (projectId = 'default', type) => {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId) || !['images', 'videos', 'audios'].includes(type))
            throw new PluginError(ERRORS.permission, 'Invalid project media location', { context: { moduleId: 'media.filesystem', operation: 'libraryImport' } });
        const directory = path.join(this.libraryDirectory, 'media', projectId, type);
        fs.mkdirSync(directory, { recursive: true });
        return directory;
    };
    resolveLocalPath = value => {
        try {
            const pathname = new URL(String(value), 'http://localhost').pathname;
            if (!pathname.startsWith('/library/')) return null;
            const target = path.resolve(this.libraryDirectory, decodeURIComponent(pathname.slice('/library/'.length)));
            const relative = path.relative(path.resolve(this.libraryDirectory), target);
            return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? target : null;
        } catch { return null; }
    };
// --- Library Assets API ---

    LIBRARY_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
    LIBRARY_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v', '.mkv']);
    LIBRARY_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac']);

sanitizeAssetFileName = (name) => {
    const safeName = String(name || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '');
    return safeName || 'asset';
};

encodeLibraryAssetId = (relativePath) => {
    return Buffer.from(relativePath, 'utf8').toString('base64url');
};

decodeLibraryAssetId = (id) => {
    try {
        return Buffer.from(String(id || ''), 'base64url').toString('utf8');
    } catch {
        return null;
    }
};

getLibraryAssetType = (fileName) => {
    const { LIBRARY_IMAGE_EXTENSIONS, LIBRARY_VIDEO_EXTENSIONS, LIBRARY_AUDIO_EXTENSIONS } = this;
    const ext = path.extname(fileName).toLowerCase();
    if (LIBRARY_IMAGE_EXTENSIONS.has(ext)) return 'image';
    if (LIBRARY_VIDEO_EXTENSIONS.has(ext)) return 'video';
    if (LIBRARY_AUDIO_EXTENSIONS.has(ext)) return 'audio';
    return null;
};

getMediaTypeFromLibraryType = (type) => {
    if (type === 'video') return 'videos';
    if (type === 'audio') return 'audios';
    return 'images';
};

buildLibraryAssetUrl = (relativePath) => {
    const { getUrlPrefix } = this;
    const normalizedPath = relativePath.split(path.sep).join('/');
    const encodedPath = normalizedPath
        .split('/')
        .map(part => encodeURIComponent(part))
        .join('/');
    return `${getUrlPrefix()}/assets/${encodedPath}`;
};

getLibraryAssetMetaPathFromFile = (filePath) => {
    const parsed = path.parse(filePath);
    return path.join(parsed.dir, `${parsed.name}.json`);
};

readLibraryAssetMeta = (filePath) => {
    const { getLibraryAssetMetaPathFromFile, logger } = this;
    const metaPath = getLibraryAssetMetaPathFromFile(filePath);
    if (!fs.existsSync(metaPath)) return null;

    try {
        return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (error) {
        logger.warn('Library metadata read failed', { operation: 'readLibraryMetadata', code: error.code });
        return null;
    }
};

writeLibraryAssetMeta = (targetDir, assetId, metadata) => {
    const metaPath = path.join(targetDir, `${assetId}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
};

buildLibraryAssetEntry = (relativePath, fallback = {}) => {
    const { LIBRARY_ASSETS_DIR, readLibraryAssetMeta, getLibraryAssetType, encodeLibraryAssetId, buildLibraryAssetUrl } = this;
    const absolutePath = path.join(LIBRARY_ASSETS_DIR, relativePath);
    const stats = fs.statSync(absolutePath);
    const createdAt = stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime;
    const metadata = readLibraryAssetMeta(absolutePath) || {};
    const type = metadata.mediaType || fallback.type || getLibraryAssetType(absolutePath);
    const duration = Number.isFinite(Number(metadata.duration))
        ? Number(metadata.duration)
        : (
            Number.isFinite(Number(metadata.videoDuration))
                ? Number(metadata.videoDuration)
                : undefined
        );

    return {
        id: encodeLibraryAssetId(relativePath),
        name: metadata.name || fallback.name || path.parse(absolutePath).name,
        title: metadata.title || metadata.name || fallback.name || path.parse(absolutePath).name,
        category: metadata.category || fallback.category || relativePath.split(path.sep)[0],
        ownership: typeof metadata.ownership === 'string' ? metadata.ownership : '',
        url: buildLibraryAssetUrl(relativePath),
        type,
        nodeType: metadata.nodeType || null,
        sourceType: metadata.sourceType || null,
        prompt: metadata.prompt || '',
        model: metadata.model || '',
        imageModel: metadata.imageModel || '',
        videoModel: metadata.videoModel || '',
        audioModel: metadata.audioModel || '',
        textModel: metadata.textModel || '',
        imageMode: metadata.imageMode || '',
        videoMode: metadata.videoMode || '',
        audioMode: metadata.audioMode || '',
        aspectRatio: metadata.aspectRatio || '',
        resultAspectRatio: metadata.resultAspectRatio || '',
        resolution: metadata.resolution || '',
        duration,
        createdAt: metadata.createdAt || createdAt.toISOString()
    };
};

listLibraryAssets = () => {
    const { LIBRARY_ASSETS_DIR, getLibraryAssetType, buildLibraryAssetEntry } = this;
    const assets = [];

    if (!fs.existsSync(LIBRARY_ASSETS_DIR)) {
        return assets;
    }

    const categoryEntries = fs.readdirSync(LIBRARY_ASSETS_DIR, { withFileTypes: true });
    for (const categoryEntry of categoryEntries) {
        if (!categoryEntry.isDirectory()) continue;

        const category = categoryEntry.name;
        const categoryDir = path.join(LIBRARY_ASSETS_DIR, category);
        const fileEntries = fs.readdirSync(categoryDir, { withFileTypes: true });

        for (const fileEntry of fileEntries) {
            if (!fileEntry.isFile()) continue;

            const type = getLibraryAssetType(fileEntry.name);
            if (!type) continue;

            const relativePath = path.join(category, fileEntry.name);
            assets.push(buildLibraryAssetEntry(relativePath, {
                category,
                type,
                name: path.parse(fileEntry.name).name
            }));
        }
    }

    assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return assets;
};

encodeLibraryWorkflowId = (relativePath) => {
    return Buffer.from(relativePath, 'utf8').toString('base64url');
};

decodeLibraryWorkflowId = (id) => {
    try {
        return Buffer.from(String(id || ''), 'base64url').toString('utf8');
    } catch {
        return null;
    }
};

buildLibraryWorkflowUrl = (relativePath) => {
    const { getUrlPrefix } = this;
    const normalizedPath = relativePath.split(path.sep).join('/');
    const encodedPath = normalizedPath
        .split('/')
        .map(part => encodeURIComponent(part))
        .join('/');
    return `${getUrlPrefix()}/workflows/${encodedPath}`;
};

getWorkflowPresetJsonInfo = (category, folderName) => {
    const { LIBRARY_WORKFLOWS_DIR } = this;
    const presetDir = path.join(LIBRARY_WORKFLOWS_DIR, category, folderName);
    const jsonPath = path.join(presetDir, `${folderName}.json`);
    const coverPath = path.join(presetDir, `${folderName}.png`);
    return { presetDir, jsonPath, coverPath };
};

readJsonFile = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

buildWorkflowPresetEntry = (category, folderName) => {
    const { getWorkflowPresetJsonInfo, readJsonFile, encodeLibraryWorkflowId, buildLibraryWorkflowUrl } = this;
    const { jsonPath, coverPath } = getWorkflowPresetJsonInfo(category, folderName);
    if (!fs.existsSync(jsonPath)) return null;

    const payload = readJsonFile(jsonPath);
    const stats = fs.statSync(jsonPath);
    const createdAt = stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime;
    const relativeDir = path.join(category, folderName);
    const relativeCoverPath = path.join(relativeDir, `${folderName}.png`);

    return {
        id: encodeLibraryWorkflowId(relativeDir),
        name: payload.name || folderName,
        title: payload.name || folderName,
        category: payload.category || category,
        coverUrl: fs.existsSync(coverPath) ? buildLibraryWorkflowUrl(relativeCoverPath) : '',
        nodeCount: Array.isArray(payload.nodes) ? payload.nodes.length : 0,
        createdAt: payload.createdAt || createdAt.toISOString()
    };
};

listLibraryWorkflowPresets = () => {
    const { LIBRARY_WORKFLOWS_DIR, buildWorkflowPresetEntry } = this;
    if (!fs.existsSync(LIBRARY_WORKFLOWS_DIR)) return [];

    const workflows = [];
    const categoryEntries = fs.readdirSync(LIBRARY_WORKFLOWS_DIR, { withFileTypes: true });
    for (const categoryEntry of categoryEntries) {
        if (!categoryEntry.isDirectory()) continue;
        const category = categoryEntry.name;
        const categoryDir = path.join(LIBRARY_WORKFLOWS_DIR, category);
        const workflowEntries = fs.readdirSync(categoryDir, { withFileTypes: true });

        for (const workflowEntry of workflowEntries) {
            if (!workflowEntry.isDirectory()) continue;
            const preset = buildWorkflowPresetEntry(category, workflowEntry.name);
            if (preset) workflows.push(preset);
        }
    }

    return workflows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

collectNodeAssetCandidates = (node) => {
    const { getUrlPrefix, resolveLocalPath, readJsonFile } = this;
    const candidates = [];
    const pending = [{ record: node, owner: node.projectId, parameters: false }];
    const types = { image: 'images', mask: 'images', video: 'videos', audio: 'audios', images: 'images', videos: 'videos', audios: 'audios' };
    const add = (record, field, value = record[field]) => {
        if (typeof value === 'string' && value.trim()) candidates.push({ record, field, value });
    };
    while (pending.length) {
        const { record, owner, parameters } = pending.pop();
        if (!record || typeof record !== 'object') continue;
        if (Array.isArray(record)) {
            for (const item of record) pending.push({ record: item, owner, parameters });
            continue;
        }
        const projectId = record.projectId || owner;
        if (parameters && !record.assetId) {
            for (const item of Object.values(record)) pending.push({ record: item, owner: projectId, parameters: true });
            continue;
        }
        for (const field of ['resultUrl', 'url', 'inputUrl', 'lastFrame', 'editorBackgroundUrl', 'editorCanvasData', 'coverUrl']) add(record, field);
        for (const field of ['resultUrls', 'urls', 'characterReferenceUrls']) {
            if (Array.isArray(record[field])) record[field].forEach((value, index) => add(record[field], index, value));
        }
        // Structured input references may have no URL. Store their assetId as a
        // preset-relative handle, then restore the normal reference on import.
        if (record.assetId && !record.url && !record.resultUrl) {
            if (String(record.assetId).startsWith('./')) add(record, 'assetId');
            else {
                const type = types[record.type || record.mediaKind];
                if (type && projectId) {
                    const id = String(record.assetId);
                    const metadataUrl = `${getUrlPrefix()}/media/${encodeURIComponent(projectId)}/${type}/${encodeURIComponent(id)}.json`;
                    const metadataPath = resolveLocalPath(metadataUrl);
                    const metadata = metadataPath && fs.existsSync(metadataPath) ? readJsonFile(metadataPath) : null;
                    if (!metadata?.filename || path.basename(metadata.filename) !== metadata.filename) throw mediaError('组合引用的素材不存在，请重新上传。');
                    add(record, 'assetId', `${getUrlPrefix()}/media/${encodeURIComponent(projectId)}/${type}/${encodeURIComponent(metadata.filename)}`);
                }
            }
        }
        for (const field of ['result', 'resultHistory', 'workflowOutputs', 'outputs']) pending.push({ record: record[field], owner: projectId, parameters: false });
        pending.push({ record: record.parameterValues, owner: projectId, parameters: true });
    }
    return candidates;
};

updateNodeAssetField = (candidate, value, projectId) => {
    const { record, field } = candidate;
    if (field === 'assetId') record.assetId = projectId ? path.parse(value).name : value;
    else record[field] = value;
    if (['assetId', 'url', 'resultUrl'].includes(field) && value !== candidate.value) {
        if (field !== 'assetId' && record.assetId) record.assetId = path.parse(value).name;
        if (projectId) record.projectId = projectId;
        delete record.networkUrl;
    }
};

importWorkflowPresetNodeAssets = (nodes, presetDir, folderName, projectId) => {
    const { collectNodeAssetCandidates, updateNodeAssetField, getLibraryAssetType, getMediaTypeFromLibraryType, getProjectMediaDir, getUrlPrefix } = this;
    const importedAssets = new Map();
    return nodes.map((node) => {
        const nextNode = JSON.parse(JSON.stringify(node));
        const candidates = collectNodeAssetCandidates(nextNode);

        for (const candidate of candidates) {
            const currentValue = candidate.value;
            if (typeof currentValue !== 'string' || !currentValue.startsWith('./')) continue;

            if (importedAssets.has(currentValue)) {
                updateNodeAssetField(candidate, importedAssets.get(currentValue), projectId || 'default');
                continue;
            }
            const absoluteSourcePath = path.resolve(presetDir, currentValue);
            const relativeSource = path.relative(presetDir, absoluteSourcePath);
            if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) throw mediaError('组合素材路径无效。');
            if (!fs.existsSync(absoluteSourcePath)) throw mediaError('组合素材文件缺失，请重新保存组合。');
            const actualRelative = path.relative(fs.realpathSync(presetDir), fs.realpathSync(absoluteSourcePath));
            if (actualRelative.startsWith('..') || path.isAbsolute(actualRelative)) throw mediaError('组合素材路径无效。');

            const ext = path.extname(absoluteSourcePath).toLowerCase();
            const libraryType = getLibraryAssetType(absoluteSourcePath) || getLibraryAssetType(ext);
            if (!libraryType) continue;

            const mediaType = getMediaTypeFromLibraryType(libraryType);
            const targetDir = getProjectMediaDir(projectId || 'default', mediaType);
            const assetId = generateAssetId();
            const targetFilename = `${assetId}${ext}`;
            const targetPath = path.join(targetDir, targetFilename);

            fs.copyFileSync(absoluteSourcePath, targetPath);

            const sourceMetaPath = path.join(path.dirname(absoluteSourcePath), `${path.parse(absoluteSourcePath).name}.json`);
            let copiedMeta = null;
            if (fs.existsSync(sourceMetaPath)) {
                try {
                    copiedMeta = JSON.parse(fs.readFileSync(sourceMetaPath, 'utf8'));
                } catch {
                    copiedMeta = null;
                }
            }

            saveAssetMetadata(targetDir, {
                id: assetId,
                filename: targetFilename,
                prompt: copiedMeta?.prompt || nextNode.prompt || nextNode.title || '',
                type: mediaType,
                model: copiedMeta?.model || nextNode.model || 'Workflow Preset',
                title: copiedMeta?.title || nextNode.title || '',
                nodeType: copiedMeta?.nodeType || nextNode.type || null,
                sourceType: 'workflow-preset',
                imageModel: copiedMeta?.imageModel || nextNode.imageModel || '',
                videoModel: copiedMeta?.videoModel || nextNode.videoModel || '',
                audioModel: copiedMeta?.audioModel || nextNode.audioModel || '',
                textModel: copiedMeta?.textModel || nextNode.textModel || '',
                imageMode: copiedMeta?.imageMode || nextNode.imageMode || '',
                videoMode: copiedMeta?.videoMode || nextNode.videoMode || '',
                audioMode: copiedMeta?.audioMode || nextNode.audioMode || '',
                aspectRatio: copiedMeta?.aspectRatio || nextNode.aspectRatio || '',
                resultAspectRatio: copiedMeta?.resultAspectRatio || nextNode.resultAspectRatio || '',
                resolution: copiedMeta?.resolution || nextNode.resolution || '',
                duration: copiedMeta?.duration || nextNode.videoDuration || null
            }, this.logger);

            const url = `${getUrlPrefix()}/media/${encodeURIComponent(projectId || 'default')}/${mediaType}/${targetFilename}`;
            importedAssets.set(currentValue, url);
            updateNodeAssetField(candidate, url, projectId || 'default');
        }

        return nextNode;
    });
};

// Save curated asset to library
async save(req) {
    const { sanitizeAssetFileName, LIBRARY_ASSETS_DIR, resolveLocalPath, logger, getLibraryAssetType, writeLibraryAssetMeta, buildLibraryAssetEntry } = this;
    try {
        const { sourceUrl, name, category, meta, ownership = '' } = req.body;
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 200
            || typeof category !== 'string' || !category.trim() || category.trim().length > 80
            || typeof ownership !== 'string' || ownership.trim().length > 120) {
            return { status: 400, body: { error: '名称、分类或归属格式不正确' } };
        }
        const normalizedName = String(name || '').trim();
        const normalizedCategory = sanitizeAssetFileName(category);

        if (!sourceUrl || !normalizedName || !normalizedCategory) {
            return { status: 400, body: { error: "Missing required fields" } };
        }

        // Determine destination directory
        const destDir = path.join(LIBRARY_ASSETS_DIR, normalizedCategory);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const assetId = generateAssetId();
        let destFilename = '';
        let destPath;
        let extension = '.png';
        let mimeType = '';

        // HANDLE DATA URL (Base64)
        if (sourceUrl.startsWith('data:')) {
            const matches = sourceUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return { status: 400, body: { error: 'Invalid data URL format' } };
            }

            const detectedMimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            mimeType = detectedMimeType;

            // Determine extension from mime
            if (detectedMimeType === 'image/jpeg') extension = '.jpg';
            else if (detectedMimeType === 'video/mp4') extension = '.mp4';
            else if (detectedMimeType === 'audio/mpeg' || detectedMimeType === 'audio/mp3') extension = '.mp3';
            else if (detectedMimeType === 'audio/wav') extension = '.wav';
            else if (detectedMimeType === 'audio/x-m4a' || detectedMimeType === 'audio/m4a') extension = '.m4a';

            destFilename = `${assetId}${extension}`;
            destPath = path.join(destDir, destFilename);

            fs.writeFileSync(destPath, buffer);
        }
        // HANDLE FILE PATH OR URL
        else {
            // 使用统一工具解析本地文件路径
            const sourcePath = resolveLocalPath(sourceUrl);

            if (!sourcePath || !fs.existsSync(sourcePath)) {
                logger.error('Library source file not found', { operation: 'saveLibraryAsset', code: ERRORS.mediaNotFound });
                return { status: 404, body: { error: 'Source file not found', code: ERRORS.mediaNotFound } };
            }

            // Copy file
            extension = path.extname(sourcePath).toLowerCase() || '.png';
            destFilename = `${assetId}${extension}`;
            destPath = path.join(destDir, destFilename);
            mimeType = meta?.mimeType || '';

            fs.copyFileSync(sourcePath, destPath);
        }

        const assetType = getLibraryAssetType(destFilename) || 'image';
        const createdAt = new Date().toISOString();
        const stats = fs.statSync(destPath);
        const metadata = {
            id: assetId,
            name: normalizedName,
            title: normalizedName,
            category: normalizedCategory,
            filename: destFilename,
            ownership: ownership.trim(),
            mediaType: assetType,
            nodeType: meta?.nodeType || null,
            sourceType: meta?.sourceType || null,
            prompt: String(meta?.prompt || normalizedName).trim(),
            model: String(meta?.model || '').trim(),
            imageModel: String(meta?.imageModel || '').trim(),
            videoModel: String(meta?.videoModel || '').trim(),
            audioModel: String(meta?.audioModel || '').trim(),
            textModel: String(meta?.textModel || '').trim(),
            imageMode: String(meta?.imageMode || '').trim(),
            videoMode: String(meta?.videoMode || '').trim(),
            audioMode: String(meta?.audioMode || '').trim(),
            aspectRatio: String(meta?.aspectRatio || '').trim(),
            resultAspectRatio: String(meta?.resultAspectRatio || '').trim(),
            resolution: String(meta?.resolution || '').trim(),
            duration: Number.isFinite(Number(meta?.duration))
                ? Number(meta.duration)
                : (
                    Number.isFinite(Number(meta?.videoDuration))
                        ? Number(meta.videoDuration)
                        : null
                ),
            mimeType,
            size: stats.size,
            createdAt
        };

        writeLibraryAssetMeta(destDir, assetId, metadata);
        const relativePath = path.join(normalizedCategory, destFilename);
        const newEntry = buildLibraryAssetEntry(relativePath, {
            category: normalizedCategory,
            type: assetType,
            name: normalizedName
        });

        return { status: 200, body: { success: true, asset: newEntry } };
    } catch (error) {
        logger.error('Library save failed', { operation: 'save', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

// List library assets
async list(req) {
    const { listLibraryAssets, logger } = this;
    try {
        return { status: 200, body: listLibraryAssets() };
    } catch (error) {
        logger.error('Library list failed', { operation: 'list', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

// Import library asset into current project media folder
async importAsset(req) {
    const { decodeLibraryAssetId, LIBRARY_ASSETS_DIR, getLibraryAssetType, readLibraryAssetMeta, getMediaTypeFromLibraryType, getProjectMediaDir, getUrlPrefix, logger } = this;
    try {
        const { id, projectId } = req.body;
        const relativePath = decodeLibraryAssetId(id);

        if (!relativePath) {
            return { status: 400, body: { error: 'Invalid asset id' } };
        }

        const sourcePath = path.join(LIBRARY_ASSETS_DIR, relativePath);
        const normalizedSourcePath = path.normalize(sourcePath);
        const normalizedAssetsDir = path.normalize(LIBRARY_ASSETS_DIR);

        const isInsideAssetsDir = normalizedSourcePath === normalizedAssetsDir || normalizedSourcePath.startsWith(`${normalizedAssetsDir}${path.sep}`);
        if (!isInsideAssetsDir || !fs.existsSync(normalizedSourcePath)) {
            return { status: 404, body: { error: 'Asset not found' } };
        }

        const libraryType = getLibraryAssetType(normalizedSourcePath);
        if (!libraryType) {
            return { status: 400, body: { error: 'Unsupported asset type' } };
        }

        const assetMeta = readLibraryAssetMeta(normalizedSourcePath) || {};
        const mediaType = getMediaTypeFromLibraryType(libraryType);
        const finalProjectId = projectId || 'default';
        const targetDir = getProjectMediaDir(finalProjectId, mediaType);
        const sourceExt = path.extname(normalizedSourcePath).toLowerCase();
        const assetId = generateAssetId();
        const targetFilename = `${assetId}${sourceExt}`;
        const targetPath = path.join(targetDir, targetFilename);
        const assetName = assetMeta.name || path.parse(normalizedSourcePath).name;
        const normalizedDuration = Number.isFinite(Number(assetMeta.duration))
            ? Number(assetMeta.duration)
            : (
                Number.isFinite(Number(assetMeta.videoDuration))
                    ? Number(assetMeta.videoDuration)
                    : undefined
            );

        fs.copyFileSync(normalizedSourcePath, targetPath);
        saveAssetMetadata(targetDir, {
            id: assetId,
            filename: targetFilename,
            prompt: assetMeta.prompt || assetName,
            type: mediaType,
            model: assetMeta.model || 'Asset Library',
            nodeType: assetMeta.nodeType || null,
            sourceType: assetMeta.sourceType || 'asset-library',
            title: assetMeta.title || assetName,
            imageModel: assetMeta.imageModel || '',
            videoModel: assetMeta.videoModel || '',
            audioModel: assetMeta.audioModel || '',
            textModel: assetMeta.textModel || '',
            imageMode: assetMeta.imageMode || '',
            videoMode: assetMeta.videoMode || '',
            audioMode: assetMeta.audioMode || '',
            aspectRatio: assetMeta.aspectRatio || '',
            resultAspectRatio: assetMeta.resultAspectRatio || '',
            resolution: assetMeta.resolution || '',
            duration: normalizedDuration
        }, logger);

        return { status: 200, body: {
            success: true,
            asset: {
                id: assetId,
                url: `${getUrlPrefix()}/media/${finalProjectId}/${mediaType}/${targetFilename}`,
                name: assetName,
                title: assetMeta.title || assetName,
                prompt: assetMeta.prompt || assetName,
                type: mediaType,
                mediaType: libraryType,
                nodeType: assetMeta.nodeType || null,
                sourceType: assetMeta.sourceType || null,
                model: assetMeta.model || '',
                imageModel: assetMeta.imageModel || '',
                videoModel: assetMeta.videoModel || '',
                audioModel: assetMeta.audioModel || '',
                textModel: assetMeta.textModel || '',
                imageMode: assetMeta.imageMode || '',
                videoMode: assetMeta.videoMode || '',
                audioMode: assetMeta.audioMode || '',
                aspectRatio: assetMeta.aspectRatio || '',
                resultAspectRatio: assetMeta.resultAspectRatio || '',
                resolution: assetMeta.resolution || '',
                duration: normalizedDuration
            }
        } };
    } catch (error) {
        logger.error('Library import failed', { operation: 'importAsset', error });
        return { status: error.status || 500, body: { error: error instanceof PluginError ? error.message : '素材导入失败', code: error.code } };
    }
}

// Editing presentation metadata keeps the media path/id stable for existing canvas references.
async update(req) {
    const { decodeLibraryAssetId, getLibraryAssetType, LIBRARY_ASSETS_DIR, getLibraryAssetMetaPathFromFile, buildLibraryAssetEntry } = this;
    try {
        const fields = req.body;
        if (!fields || typeof fields !== 'object' || Array.isArray(fields)
            || Object.keys(fields).some(key => !['name', 'category', 'ownership'].includes(key))
            || typeof fields.name !== 'string' || !fields.name.trim() || fields.name.trim().length > 200
            || typeof fields.category !== 'string' || !fields.category.trim() || fields.category.trim().length > 80
            || typeof fields.ownership !== 'string' || fields.ownership.trim().length > 120) {
            return { status: 400, body: { error: '名称、分类或归属格式不正确' } };
        }
        const relativePath = decodeLibraryAssetId(req.params.id);
        if (!relativePath || !getLibraryAssetType(relativePath)) {
            return { status: 400, body: { error: 'Invalid asset id' } };
        }
        const root = fs.realpathSync(LIBRARY_ASSETS_DIR);
        const filePath = path.resolve(LIBRARY_ASSETS_DIR, relativePath);
        const isInside = value => value.startsWith(`${root}${path.sep}`);
        if (!isInside(filePath) || !fs.existsSync(filePath)
            || !isInside(fs.realpathSync(filePath)) || !fs.statSync(filePath).isFile()) {
            return { status: 404, body: { error: 'Asset not found' } };
        }
        const metaPath = getLibraryAssetMetaPathFromFile(filePath);
        if (fs.existsSync(metaPath) && fs.lstatSync(metaPath).isSymbolicLink()) {
            return { status: 404, body: { error: 'Asset not found' } };
        }
        // Preserve unknown metadata; malformed metadata must never be silently replaced.
        const previous = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
        if (!previous || typeof previous !== 'object' || Array.isArray(previous)) throw mediaError('Invalid metadata');
        const metadata = {
            ...previous,
            name: fields.name.trim(), title: fields.name.trim(),
            category: fields.category.trim(), ownership: fields.ownership.trim(),
        };
        const temporary = `${metaPath}.${randomUUID()}.tmp`;
        try {
            fs.writeFileSync(temporary, JSON.stringify(metadata, null, 2), { encoding: 'utf8', flag: 'wx' });
            fs.renameSync(temporary, metaPath);
        } finally {
            if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        }
        return { status: 200, body: { success: true, asset: buildLibraryAssetEntry(relativePath) } };
    } catch {
        return { status: 500, body: { error: '保存未完成，请刷新资产库后重试' } };
    }
}

// Delete library asset
async remove(req) {
    const { decodeLibraryAssetId, LIBRARY_ASSETS_DIR, getLibraryAssetMetaPathFromFile, logger } = this;
    try {
        const { id } = req.params;
        const relativePath = decodeLibraryAssetId(id);

        if (!relativePath) {
            return { status: 400, body: { error: 'Invalid asset id' } };
        }

        const filePath = path.normalize(path.join(LIBRARY_ASSETS_DIR, relativePath));
        const normalizedAssetsDir = path.normalize(LIBRARY_ASSETS_DIR);

        const isInsideAssetsDir = filePath === normalizedAssetsDir || filePath.startsWith(`${normalizedAssetsDir}${path.sep}`);
        if (!isInsideAssetsDir || !fs.existsSync(filePath)) {
            return { status: 404, body: { error: 'Asset not found' } };
        }

        const metaPath = getLibraryAssetMetaPathFromFile(filePath);
        fs.unlinkSync(filePath);
        if (fs.existsSync(metaPath)) {
            fs.unlinkSync(metaPath);
        }

        return { status: 200, body: { success: true } };
    } catch (error) {
        logger.error('Library delete failed', { operation: 'remove', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

// --- Library Workflow Presets API ---

async listWorkflows(_req) {
    const { listLibraryWorkflowPresets, logger } = this;
    try {
        return { status: 200, body: listLibraryWorkflowPresets() };
    } catch (error) {
        logger.error('Library workflow list failed', { operation: 'listWorkflows', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

async importWorkflow(req) {
    const { decodeLibraryWorkflowId, getWorkflowPresetJsonInfo, readJsonFile, importWorkflowPresetNodeAssets, logger } = this;
    try {
        const { id, projectId } = req.body;
        const relativeDir = decodeLibraryWorkflowId(id);

        if (!relativeDir) {
            return { status: 400, body: { error: 'Invalid workflow id' } };
        }

        const [category, folderName] = relativeDir.split(/[\\/]/);
        if (!category || !folderName) {
            return { status: 400, body: { error: 'Invalid workflow path' } };
        }

        const { presetDir, jsonPath } = getWorkflowPresetJsonInfo(category, folderName);
        if (!fs.existsSync(jsonPath)) {
            return { status: 404, body: { error: 'Workflow preset not found' } };
        }

        const payload = readJsonFile(jsonPath);
        const importedNodes = importWorkflowPresetNodeAssets(payload.nodes || [], presetDir, folderName, projectId || 'default');

        return { status: 200, body: {
            success: true,
            workflow: {
                name: payload.name || folderName,
                category: payload.category || category,
                nodes: importedNodes
            }
        } };
    } catch (error) {
        logger.error('Library workflow import failed', { operation: 'importWorkflow', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

async removeWorkflow(req) {
    const { decodeLibraryWorkflowId, LIBRARY_WORKFLOWS_DIR, logger } = this;
    try {
        const relativeDir = decodeLibraryWorkflowId(req.params.id);
        if (!relativeDir) {
            return { status: 400, body: { error: 'Invalid workflow id' } };
        }

        const presetDir = path.normalize(path.join(LIBRARY_WORKFLOWS_DIR, relativeDir));
        const normalizedRoot = path.normalize(LIBRARY_WORKFLOWS_DIR);
        const isInsideRoot = presetDir === normalizedRoot || presetDir.startsWith(`${normalizedRoot}${path.sep}`);

        if (!isInsideRoot || !fs.existsSync(presetDir)) {
            return { status: 404, body: { error: 'Workflow preset not found' } };
        }

        fs.rmSync(presetDir, { recursive: true, force: true });
        return { status: 200, body: { success: true } };
    } catch (error) {
        logger.error('Library workflow delete failed', { operation: 'removeWorkflow', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

// --- Public Workflows API (bundled examples) ---

// List public workflows (shipped with the repo in public/workflows/)
// Dynamically scans directory - no need to maintain index.json manually
async listPublicWorkflows(req) {
    const { publicDirectory, logger } = this;
    try {
        const publicWorkflowsDir = path.join(publicDirectory, 'workflows');

        if (!fs.existsSync(publicWorkflowsDir)) {
            return { status: 200, body: [] };
        }

        // Scan all .json files except index.json
        const files = fs.readdirSync(publicWorkflowsDir)
            .filter(f => f.endsWith('.json') && f !== 'index.json');

        const workflows = files.map(file => {
            try {
                const content = fs.readFileSync(path.join(publicWorkflowsDir, file), 'utf8');
                const workflow = JSON.parse(content);

                // Generate description from workflow content
                const nodeTypes = workflow.nodes?.reduce((acc, n) => {
                    acc[n.type] = (acc[n.type] || 0) + 1;
                    return acc;
                }, {}) || {};
                const typesSummary = Object.entries(nodeTypes)
                    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                    .join(', ');
                const description = workflow.description ||
                    (typesSummary ? `Workflow with ${typesSummary}` : 'A public workflow template');

                return {
                    id: file.replace('.json', ''),
                    title: workflow.title || 'Untitled',
                    description,
                    nodeCount: workflow.nodes?.length || 0,
                    coverUrl: workflow.coverUrl || null
                };
            } catch (parseError) {
                logger.warn('Invalid public workflow skipped', { operation: 'listPublicWorkflows', filename: file, code: parseError.code });
                return null;
            }
        }).filter(Boolean); // Remove any null entries from parse errors

        // Sort by title alphabetically
        workflows.sort((a, b) => a.title.localeCompare(b.title));

        return { status: 200, body: workflows };
    } catch (error) {
        logger.error('Public workflows list failed', { operation: 'listPublicWorkflows', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

// Load specific public workflow
async readPublicWorkflow(req) {
    const { publicDirectory, logger } = this;
    try {
        const publicWorkflowsDir = path.join(publicDirectory, 'workflows');
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(req.params.id)) return { status: 400, body: { error: 'Invalid workflow id' } };
        const filePath = path.join(publicWorkflowsDir, `${req.params.id}.json`);

        if (!fs.existsSync(filePath)) {
            return { status: 404, body: { error: "Public workflow not found" } };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        return { status: 200, body: JSON.parse(content) };
    } catch (error) {
        logger.error('Public workflow load failed', { operation: 'readPublicWorkflow', code: error.code });
        return { status: 500, body: { error: error.message } };
    }
}

}

export function createFilesystemLibraryStore(options) {
    const store = new FilesystemLibraryStore(options);
    const operations = ['save', 'list', 'importAsset', 'update', 'remove', 'listWorkflows', 'importWorkflow', 'removeWorkflow', 'listPublicWorkflows', 'readPublicWorkflow'];
    return Object.freeze(Object.fromEntries(operations.map(name => [name, store[name].bind(store)])));
}

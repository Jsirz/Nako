import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ERRORS, PluginError } from '../../../modules/contracts/index.js';

const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.heic', '.heif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);

export class ThumbnailCacheError extends PluginError {
    constructor(message, status = 400) {
        super(status === 404 ? ERRORS.mediaNotFound : ERRORS.invalidMedia, message, {
            status, context: { moduleId: 'media.ffmpeg-sharp', operation: 'thumbnail' },
        });
        this.name = 'ThumbnailCacheError';
    }
}

function normalizeMaxSize(value) {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed)) return 960;
    return Math.min(2048, Math.max(128, parsed));
}

function resolveLibrarySource(libraryDir, sourceUrl) {
    const cleanUrl = String(sourceUrl || '').split(/[?#]/, 1)[0];
    if (!cleanUrl.startsWith('/library/')) {
        throw new ThumbnailCacheError('缩略图仅支持本地 library 图片');
    }

    let relativeUrl;
    try {
        relativeUrl = decodeURIComponent(cleanUrl.slice('/library/'.length));
    } catch {
        throw new ThumbnailCacheError('图片路径编码无效');
    }

    const libraryRoot = fs.realpathSync(libraryDir);
    const candidate = path.resolve(libraryRoot, relativeUrl.replaceAll('/', path.sep));
    const inside = target => {
        const relativePath = path.relative(libraryRoot, target);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            throw new ThumbnailCacheError('图片路径超出 library 目录', 403);
        }
    };
    inside(candidate);
    const assertPublic = target => {
        const relative = path.relative(libraryRoot, target).split(path.sep).join('/');
        if (!['assets/', 'media/', 'prompts/previews/', 'workflows/covers/'].some(prefix => relative.startsWith(prefix))
            || relative.split('/').some(segment => segment.startsWith('.') || /[\\:\0]/.test(segment))) {
            throw new ThumbnailCacheError('缩略图不支持私有文件', 403);
        }
    };
    assertPublic(candidate);
    if (!IMAGE_EXTENSIONS.has(path.extname(candidate).toLowerCase())) {
        throw new ThumbnailCacheError('不支持的图片格式');
    }
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
        throw new ThumbnailCacheError('原图不存在', 404);
    }
    const sourcePath = fs.realpathSync(candidate);
    inside(sourcePath);
    assertPublic(sourcePath);
    return sourcePath;
}

export function createThumbnailCache({ libraryDir }) {
    const cacheDir = path.join(libraryDir, '.cache', 'thumbnails');
    const jobs = new Map();

    return {
        async get(sourceUrl, maxSizeValue) {
            const sourcePath = resolveLibrarySource(libraryDir, sourceUrl);
            const maxSize = normalizeMaxSize(maxSizeValue);
            const stat = fs.statSync(sourcePath);
            const fingerprint = `${sourcePath}:${stat.size}:${stat.mtimeMs}:${maxSize}`;
            const cacheKey = crypto.createHash('sha256').update(fingerprint).digest('hex');
            const thumbnailPath = path.join(cacheDir, `${cacheKey}.webp`);
            const reference = { kind: 'thumbnail', id: cacheKey };
            if (fs.existsSync(thumbnailPath)) return reference;

            const existingJob = jobs.get(cacheKey);
            if (existingJob) return existingJob;

            const job = (async () => {
                fs.mkdirSync(cacheDir, { recursive: true });
                const temporaryPath = `${thumbnailPath}.${process.pid}.tmp`;
                try {
                    // libvips needs the Windows extended-length form for deep install/data roots.
                    // Node's own filesystem calls already normalize these paths internally.
                    await sharp(path.toNamespacedPath(sourcePath))
                        .rotate()
                        .resize({
                            width: maxSize,
                            height: maxSize,
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .webp({ quality: 78, effort: 4 })
                        .toFile(path.toNamespacedPath(temporaryPath));
                    fs.renameSync(temporaryPath, thumbnailPath);
                    return reference;
                } finally {
                    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
                }
            })();

            jobs.set(cacheKey, job);
            try {
                return await job;
            } finally {
                jobs.delete(cacheKey);
            }
        }
    };
}

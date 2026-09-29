import { defineApplicationPlugin } from '../kernel/application.js';
import { RUNTIME_PATHS } from '../project/api/server/workspace/runtimePaths.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {
  saveAssetMetadata,
  generateAssetId,
} from './server/utils/imageHelpers.js';
import { createSafeProxyRouter } from '../identity-account/api/server/security/safeProxyRouter.js';
import { createThumbnailCache, ThumbnailCacheError } from './server/media/thumbnailCache.js';
import { createMediaAssetRouter } from './server/media/mediaAssetRouter.js';
import { createMediaEditingRouter } from './server/media/mediaEditingRouter.js';
import { createMediaDownloadRouter } from './server/media/mediaDownloadRouter.js';
import { createMediaLibraryRouter } from './server/media/mediaLibraryRouter.js';
import { createTosRouter } from './server/storage/tosRouter.js';
import {
  BASE_LIBRARY_DIR,
  getWorkspacePaths,
  getUrlPrefix,
} from '../project/api/server/workspace/workspacePaths.js';
import { createPublicLibraryGuard } from '../identity-account/api/server/security/publicLibraryGuard.js';
import { denyPrivateLibraryPath } from '../identity-account/api/server/security/privateLibraryGuard.js';
export default defineApplicationPlugin({
  ...{
    id: 'module.asset-media',
    dependencies: ['media.filesystem', 'media.ffmpeg-sharp'],
    requires: ['media.operations', 'media.editing'],
    provides: ['media.projectFiles'],
  },
  async activate(context) {
    const {
      paths: RUNTIME_PATHS,
      applicationContext,
      version: PRODUCT_VERSION,
      port: PORT,
      authentication: authenticationConfiguration,
      activeUserContext,
    } = context.services.get('host.runtime');
    const BASE_LIBRARY_DIR = RUNTIME_PATHS.LIBRARY_DIR;
    const LOGS_DIR = RUNTIME_PATHS.LOGS_DIR;
    const routes = context.services.get('http.routes');
    const app = express.Router();
    routes.contribute(context, app);

    const thumbnailCache = createThumbnailCache({ libraryDir: BASE_LIBRARY_DIR });

    async function serveMediaThumbnail(request, response) {
      try {
        const thumbnailPath = await thumbnailCache.get(request.query.url, request.query.max);
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        response.type('image/webp');
        response.sendFile(thumbnailPath, { dotfiles: 'allow' });
      } catch (error) {
        const status = error instanceof ThumbnailCacheError ? error.status : 500;
        if (status >= 500) console.error('Thumbnail generation error:', error);
        response.status(status).json({ error: error.message || '缩略图生成失败' });
      }
    }

    app.get('/api/media/thumbnail', serveMediaThumbnail);

    app.use('/api/media-download', createMediaDownloadRouter({ downloads: context.services.get('media.operations').downloads }));

    app.use('/api', createSafeProxyRouter());

    app.use(
      '/api',
      createMediaAssetRouter({ mediaStore: context.services.get('media.operations') }),
    );

    app.use(
      '/api',
      createMediaEditingRouter({ mediaProcessor: context.services.get('media.editing') }),
    );

    function getProjectMediaDir(projectId, type) {
      const finalProjectId = projectId || 'default';
      const dir = path.join(getWorkspacePaths().LIBRARY_MEDIA_DIR, finalProjectId, type);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return dir;
    }

    function saveMediaToFile(dataUrl, projectId, prompt = '', nodeId = null) {
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return null;
      }

      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return null;

      const mimeType = matches[1];
      const base64Data = matches[2];

      try {
        const buffer = Buffer.from(base64Data, 'base64');
        // Generate a unique ID (timestamped if nodeId is provided)
        const id = generateAssetId(nodeId);

        let filename, mediaType;

        if (mimeType.startsWith('video/')) {
          filename = `${id}.mp4`;
          mediaType = 'videos';
        } else if (mimeType.startsWith('audio/')) {
          filename = `${id}.mp3`;
          mediaType = 'audios';
        } else {
          const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
          filename = `${id}.${ext}`;
          mediaType = 'images';
        }

        const finalProjectId = projectId || 'default';
        const targetDir = getProjectMediaDir(finalProjectId, mediaType);
        fs.writeFileSync(path.join(targetDir, filename), buffer);

        // Save metadata using the SAME unique ID to prevent overwriting
        saveAssetMetadata(targetDir, {
          id, // Use unique ID for the .json file
          filename,
          nodeId: nodeId, // Original nodeId for linkage
          prompt: prompt || '',
          type: mediaType,
          model: 'System',
          cost: 0, // System saves (uploads/text) have 0 cost
        });

        const url = `${getUrlPrefix()}/media/${finalProjectId}/${mediaType}/${filename}`;

        console.log(`  [Media Save] Saved → ${url}`);
        return { url, id };
      } catch (err) {
        console.error('  [Media Save] Failed to save media:', err.message);
        return null;
      }
    }

    function findExistingLastFrameUrl(projectId, nodeId) {
      if (!nodeId) return null;

      try {
        const imagesDir = getProjectMediaDir(projectId, 'images');
        if (!fs.existsSync(imagesDir)) return null;

        const metaFiles = fs.readdirSync(imagesDir).filter((f) => f.endsWith('.json'));
        let matched = null;

        for (const file of metaFiles) {
          try {
            const meta = JSON.parse(fs.readFileSync(path.join(imagesDir, file), 'utf8'));
            if (meta?.nodeId === nodeId && meta?.prompt === 'Video Last Frame' && meta?.filename) {
              if (!matched || new Date(meta.createdAt || 0) > new Date(matched.createdAt || 0)) {
                matched = meta;
              }
            }
          } catch {
            /* Skip malformed historical metadata. */
          }
        }

        return matched
          ? `${getUrlPrefix()}/media/${projectId || 'default'}/images/${matched.filename}`
          : null;
      } catch {
        return null;
      }
    }

    function sanitizeWorkflowNodes(nodes, projectId) {
      if (!nodes || !Array.isArray(nodes)) return nodes;

      let sanitizedCount = 0;

      const sanitized = nodes.map((node) => {
        const cleanNode = { ...node };
        const nodeId = cleanNode.id;

        // Check resultUrl for base64 data
        if (cleanNode.resultUrl && cleanNode.resultUrl.startsWith('data:')) {
          const saved = saveMediaToFile(cleanNode.resultUrl, projectId, 'Canvas Content', nodeId);
          if (saved) {
            cleanNode.resultUrl = saved.url;
            sanitizedCount++;
          }
        }

        // Check lastFrame for base64 data (video nodes)
        if (cleanNode.lastFrame && cleanNode.lastFrame.startsWith('data:')) {
          // 去重策略：同一 nodeId 的 Video Last Frame 只保存一次，后续复用已有文件
          const existingLastFrameUrl = findExistingLastFrameUrl(projectId, nodeId);
          if (existingLastFrameUrl) {
            cleanNode.lastFrame = existingLastFrameUrl;
          } else {
            const saved = saveMediaToFile(
              cleanNode.lastFrame,
              projectId,
              'Video Last Frame',
              nodeId,
            );
            if (saved) {
              cleanNode.lastFrame = saved.url;
              sanitizedCount++;
            }
          }
        }

        // Check editorCanvasData for base64 data (Image Editor)
        if (cleanNode.editorCanvasData && cleanNode.editorCanvasData.startsWith('data:')) {
          const saved = saveMediaToFile(
            cleanNode.editorCanvasData,
            projectId,
            'Editor Content',
            nodeId,
          );
          if (saved) {
            cleanNode.editorCanvasData = saved.url;
            sanitizedCount++;
          }
        }

        // Check editorBackgroundUrl for base64 data (Image Editor)
        if (cleanNode.editorBackgroundUrl && cleanNode.editorBackgroundUrl.startsWith('data:')) {
          const saved = saveMediaToFile(
            cleanNode.editorBackgroundUrl,
            projectId,
            'Editor Background',
            nodeId,
          );
          if (saved) {
            cleanNode.editorBackgroundUrl = saved.url;
            sanitizedCount++;
          }
        }

        return cleanNode;
      });

      if (sanitizedCount > 0) {
        console.log(
          `[Workflow Sanitize] Converted ${sanitizedCount} base64 field(s) to file URLs for project ${projectId}`,
        );
      }

      return sanitized;
    }

    app.use(createTosRouter({ logger: context.logger }));

    app.use(
      createMediaLibraryRouter({ library: context.services.get('media.operations').library }),
    );
    const library = express.Router();
    library.use(
      '/library',
      (_request, response, next) => {
        response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        next();
      },
      createPublicLibraryGuard(),
      denyPrivateLibraryPath,
      express.static(BASE_LIBRARY_DIR),
    );
    routes.contribute(context, library, { phase: 30 });
    context.services.register('media.projectFiles', {
      getProjectMediaDir,
      saveMediaToFile,
      sanitizeWorkflowNodes,
    });
  },
});

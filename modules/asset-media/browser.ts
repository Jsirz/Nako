import type { PluginDefinition } from '../contracts/index.js';
import { definePlugin } from '../kernel/plugin.js';
import type { ProjectMediaRecoveryService } from '../contracts/projectWorkflow';
import { interruptedMediaNode } from './ui/media/mediaOperationRecovery';
import type { MediaSettingsService } from '../contracts/browserCapabilities';
import { mountMediaDownloadSettings } from './ui/media/mediaDownloadSettings';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installMediaEditing } from './ui/media/mediaEditing';
import { installMediaDownloadFileName } from './ui/media/mediaDownloadFileName';
import { adaptiveMediaNodeSize, isResizableMediaNode, videoDisplayAspectRatio, installMediaNodeSizing } from './ui/media/mediaNodeSizing';
import { installStableVideoPlayback } from './ui/media/videoPlayback';
import { installMiniMaxH3CanvasAdapter } from './ui/media/minimaxH3';
import { installMiniMaxPromptScroll } from './ui/media/minimaxPromptScroll';
import { NativeStableMediaRenderer } from './ui/media/nativeStableMediaRenderer';
import { startStableMediaEnhancement } from './ui/media/stableMediaEnhancement';
import { createVideoWorkflowClient, installVideoWorkflows } from './ui/media/videoWorkflows';
import type { MediaCanvasService } from '../contracts/mediaCanvas';
import { classifyMedia, uploadMediaFile, uploadMediaData } from './ui/media/canvasMediaTransport';
import { inspectImage, inspectVideo, extractVideoLastFrame } from './ui/media/generationMediaMetadata';
import { loadCollageImage, renderImageCollage } from './ui/media/imageCollage';
import { drawAnnotationStroke, renderAnnotations } from './ui/media/imageAnnotationDrawing';

import { createCanvasImageUpscale } from './ui/media/canvasImageUpscale';
import { imageToolModel, createImageAngleDraft } from './ui/media/imageAngleDraft';

const plugin: PluginDefinition = {
  manifest: {
    id: 'ui.asset-media',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.workflow-runtime': '^1.0.0' },
    capabilities: ['ui.asset-media'],
    services: { provides: ['ui.media.settings', 'ui.media.recovery', 'ui.media.canvas'], requires: ['generation.defaults', 'ui.generation.catalog', 'ui.generation.interaction'] },
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      const downloads = installMediaDownloadFileName();
      const miniMax = trackBrowserResource(context, installMiniMaxH3CanvasAdapter());
      context.services.register<MediaCanvasService>('ui.media.canvas', Object.freeze({
        classify: classifyMedia, uploadFile: uploadMediaFile, uploadData: uploadMediaData,
        inspectImage, inspectVideo, loadImage: loadCollageImage, collage: renderImageCollage,
        drawStroke: drawAnnotationStroke, renderAnnotations,
        nodeSize: adaptiveMediaNodeSize, isResizable: isResizableMediaNode, videoAspectRatio: videoDisplayAspectRatio,
        extractVideoLastFrame, downloads: () => downloads,
        miniMax: () => miniMax, createVideoWorkflowClient,
        imageToolModel, imageAngleDraft: createImageAngleDraft, createUpscale: createCanvasImageUpscale,
      }));
      const settings: MediaSettingsService = {
        mountSettings(host) {
          const dispose = mountMediaDownloadSettings(host, downloads);
          context.onDispose(dispose);
          return dispose;
        },
      };
      context.services.register('ui.media.settings', settings);
      context.services.register<ProjectMediaRecoveryService>('ui.media.recovery', Object.freeze({ interruptedMediaNode }));
      trackBrowserResource(context, installMediaNodeSizing());
      trackBrowserResource(context, installStableVideoPlayback());
      trackBrowserResource(context, installMiniMaxPromptScroll());
      trackBrowserResource(context, installVideoWorkflows());
      trackBrowserResource(context, installMediaEditing());
      trackBrowserResource(
        context,
        startStableMediaEnhancement({ renderer: new NativeStableMediaRenderer() }),
      );
    });
  },
};
export default definePlugin(plugin);

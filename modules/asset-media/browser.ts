import type { NakoPlugin } from '../contracts/index.js';
import { activateBrowserModule, trackBrowserResource } from '../kernel/browser';
import { installMediaEditing } from './ui/media/mediaEditing';
import { installMediaDownloadFileName } from './ui/media/mediaDownloadFileName';
import { installMediaNodeSizing } from './ui/media/mediaNodeSizing';
import { installStableVideoPlayback } from './ui/media/videoPlayback';
import { installMiniMaxH3CanvasAdapter } from './ui/media/minimaxH3';
import { installMiniMaxPromptScroll } from './ui/media/minimaxPromptScroll';
import { NativeStableMediaRenderer } from './ui/media/nativeStableMediaRenderer';
import { startStableMediaEnhancement } from './ui/media/stableMediaEnhancement';
import { installVideoWorkflows } from './ui/media/videoWorkflows';

const plugin: NakoPlugin = {
  manifest: {
    id: 'ui.asset-media',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    reloadRequired: true,
    dependencies: { 'ui.workflow-runtime': '^1.0.0' },
    capabilities: ['ui.asset-media'],
  },
  async activate(context) {
    await activateBrowserModule(context, async () => {
      trackBrowserResource(context, installMediaDownloadFileName());
      trackBrowserResource(context, installMediaNodeSizing());
      trackBrowserResource(context, installStableVideoPlayback());
      trackBrowserResource(context, installMiniMaxH3CanvasAdapter());
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
export default plugin;

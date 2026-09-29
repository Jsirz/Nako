export { CanvasLegacyWorkflowNode } from '../nodes/canvasLegacyWorkflowNode';
export { CanvasImageResize } from './canvasImageResize';
export { CanvasImageAnnotation } from './canvasImageAnnotation';
export { CanvasImageCrop } from './canvasImageCrop';
export { CanvasPanoramaScene } from './canvasPanoramaScene';
import type * as React from 'react';
export { CanvasSaveDialog } from './canvasSaveDialog';
export { useCanvasPanels } from './canvasPanels';
export { CanvasContextMenu } from './canvasContextMenu';
export { CanvasCompositePreview } from './canvasCompositePreview';
export { CanvasComparePreview } from './canvasComparePreview';
export { CanvasMediaPreview } from './canvasMediaPreview';
export { CanvasAssetDialog } from './canvasSaveWrappers';
type Component = React.ComponentType<Record<string, unknown>>;
interface OverlayComponents {
  ContextMenu: Component;
  AssetDialog: Component;
  MediaPreview: Component;
  ComparePreview: Component;
  CompositePreview: Component;
}
interface OverlayProps extends Record<string, unknown> {
  onSaveAssetToLibrary: (name: string, category: string, ownership?: string) => Promise<void>;
  setIsCreateAssetModalOpen: (open: boolean) => void;
}

/** Presentation assembly preserves the original components and the complete save promise. */
export function CanvasOverlays(
  runtime: Pick<typeof React, 'createElement' | 'Fragment'>,
  props: OverlayProps,
  components: OverlayComponents,
) {
  const element = runtime.createElement;
  return element(
    runtime.Fragment,
    null,
    element(components.ContextMenu, {
      state: props.contextMenu,
      onClose: props.onCloseContextMenu,
      onSelectType: props.onSelectType,
      onUpload: props.onUpload,
      onUndo: props.onUndo,
      onRedo: props.onRedo,
      onPaste: props.onPaste,
      onCopy: props.onCopy,
      onCreateAsset: props.onCreateAsset,
      onCopyImage: props.onCopyImage,
      onAddAssets: props.onAddAssets,
      canUndo: props.canUndo,
      canRedo: props.canRedo,
    }),
    element(components.AssetDialog, {
      isOpen: props.isCreateAssetModalOpen,
      onClose: () => props.setIsCreateAssetModalOpen(false),
      nodeToSnapshot: props.nodeToSnapshot,
      categories: props.assetCategories,
      defaultOwnership: props.assetDefaultOwnership,
      onSave: props.onSaveAssetToLibrary,
    }),
    element(components.MediaPreview, {
      mediaUrl: props.expandedImageUrl,
      onClose: props.onCloseExpand,
    }),
    element(components.ComparePreview, {
      payload: props.expandedComparePayload,
      onClose: props.onCloseCompare,
    }),
    element(components.CompositePreview, {
      payload: props.expandedCompositePayload,
      onClose: props.onCloseComposite,
    }),
  );
}

export { CanvasCompareNode, CanvasCompositeNode } from '../nodes/canvasImageNodes';

export { CanvasMiniMaxNode } from '../nodes/canvasMiniMaxNode';

export { CanvasMediaToolbar } from '../nodes/canvasMediaToolbar';

export { CanvasHeader } from './canvasHeader';
export { ProjectDashboard } from '../../../project/api/ui/navigation/projectDashboard';
export { ProjectDashboardHeader } from '../../../project/api/ui/navigation/projectDashboardHeader';
export { DashboardProjectCard, DashboardFolderCard } from '../../../project/api/ui/navigation/projectDashboardCards';
export { ProjectDashboardMenu } from '../../../project/api/ui/navigation/projectDashboardMenu';
export { CanvasMinimap } from './canvasMinimap';
export { CanvasSelectionBounds } from './canvasSelectionBounds';
export { CanvasViewportControls } from './canvasViewportControls';
export { CanvasPromptEditor } from '../../../agent/api/ui/prompt/canvasPromptEditor';
export { CanvasPromptTag, CanvasMentionTag } from '../../../agent/api/ui/prompt/canvasPromptTags';
export { CanvasMentionList } from '../../../agent/api/ui/prompt/canvasMentionList';
export { CanvasPresetList } from '../../../agent/api/ui/prompt/canvasPresetList';
export { CanvasPresetCard } from '../../../agent/api/ui/prompt/canvasPresetCard';
export { CanvasPresetForm } from '../../../agent/api/ui/prompt/canvasPresetForm';
export { CanvasVideoPlayer } from '../../../asset-media/api/ui/media/canvasVideoPlayer';
export { CanvasImagePreview } from '../../../asset-media/api/ui/media/canvasImagePreview';
export { CanvasTextComposer } from '../nodes/canvasTextComposer';
export { CanvasImageComposer } from '../nodes/canvasImageComposer';
export { CanvasVideoComposer } from '../nodes/canvasVideoComposer';
export { CanvasAudioPlayer } from '../../../asset-media/api/ui/media/canvasAudioPlayer';
export { CanvasAudioNode } from '../nodes/canvasAudioNode';
export { CanvasTextCard, CanvasImageCard, CanvasVideoCard } from '../nodes/canvasMediaCards';
export { CanvasDimensions, CanvasAdvancedSettings } from '../nodes/canvasNodeControls';
export { CanvasModelSelector } from '../nodes/canvasModelSelector';
export { CanvasConnectedAssets } from '../nodes/canvasConnectedAssets';
export { CanvasAssetHistory } from './canvasAssetHistory';
export { CanvasTooltip } from './canvasTooltip';

export { CanvasAssetLibrary, CanvasLibraryGrid, CanvasWorkflowLibrary } from './canvasLibrary';

export { CanvasNodeFrame, CanvasNodeHeader, CanvasConnector, CanvasConnectors, CanvasNode, CanvasGenericNode } from '../nodes/canvasNodeFrame';
export { CanvasSidePanels } from './canvasSidePanels';
export { CanvasEdges } from '../canvas/canvasEdges';
export { CanvasScene } from '../canvas/canvasScene';
export { equalCanvasNodeProps } from '../nodes/canvasNodeProps';
export { CanvasSidebar } from './canvasSidebar';
export { CanvasModelIcon } from '../nodes/canvasModelIcon';
export { CanvasSettings } from '../settings/canvasSettings';

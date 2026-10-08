import { canvasError } from '../../../contracts/canvasErrors.js';
import type * as ReactTypes from 'react';
import { useCanvasPageEvents } from './canvasApplicationEvents';
import { useCanvasAssetInsertion } from './canvasAssetInsertion';
import { copyCanvasImageToSystemClipboard } from './canvasImageClipboard';
import './canvasWorkspace.css';
import type { useCanvasSaveAndReferences } from './useCanvasSaveAndReferences';

export function useCanvasAssetActions(context: ReturnType<typeof useCanvasSaveAndReferences>) {
  const assets = useCanvasAssetImports(context);
  const menus = useCanvasAssetMenus(context, assets);
  return { ...context, ...assets, ...menus };
}

function useCanvasAssetImports(context: ReturnType<typeof useCanvasSaveAndReferences>) {
  const {
    React,
    NodeStatus,
    useAssets,
    usePresets,
    useCommands,
    useAutoSave,
    useVideoResults,
    useImageResults,
    view,
    readOnly,
    contextMenu,
    setContextMenu,
    pointerRef,
    closeWorkflowPresetPanel,
    canvasTitle,
    viewport,
    canvasRef,
    focusOnNodes,
    nodes,
    setNodes,
    getNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    updateNode,
    deleteNodes,
    clearSelection,
    autoAlignNodes,
    selectedConnection,
    deleteSelectedConnection,
    clearSelectionBox,
    groups,
    groupNodes,
    workflowId,
    dirty,
    undo,
    redo,
    save,
    saveManually,
  } = context;

  const {
      isCreateAssetModalOpen,
      setIsCreateAssetModalOpen,
      nodeToSnapshot,
      assetCategories,
      handleOpenCreateAsset,
      handleSaveAssetToLibrary,
      handleContextUpload,
      handleClipboardImagePaste,
      handleReplaceMedia,
    } = useAssets({
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      viewport,
      contextMenu,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
    }),
    {
      handleImportWorkflowPreset,
    } = usePresets({
      enabled: view === 'canvas' && !readOnly,
      viewport,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
      closeWorkflowPresetPanel,
    }),
    { handleCopy, handlePaste, hasCopiedNodes } = useCommands({
      nodes,
      viewport,
      selectedNodeIds,
      selectedConnection,
      setNodes,
      setSelectedNodeIds,
      setContextMenu,
      deleteNodes,
      deleteSelectedConnection,
      clearSelection,
      clearSelectionBox,
      undo,
      redo,
      autoAlignNodes,
      handleSaveWorkflow: saveManually,
      focusOnNodes,
      groupSelectedNodes: (ke: string[]) => {
        if (ke.length > 1) {
          groupNodes(ke, nodes, setNodes);
        }
      },
    });
  useAutoSave({
    isDirty: dirty,
    nodes,
    groups,
    title: canvasTitle,
    documentId: workflowId,
    enabled: view === 'canvas' && !readOnly,
    onSave: () => save({ reportFailure: true }),
    hasActiveOperations: nodes.some((node) => node.status === NodeStatus.LOADING),
    interval: 5e3,
  });
  useVideoResults({ nodes, updateNode });

  useImageResults({ nodes, updateNode });
  useCanvasPageEvents(React, {
    enabled: view === 'canvas' && !readOnly,
    canvasRef,
    pointer: pointerRef,
    hasCopiedNodes,
    paste: handlePaste,
    upload: handleClipboardImagePaste,
  });
  return {
    isCreateAssetModalOpen, setIsCreateAssetModalOpen, nodeToSnapshot, assetCategories,
    handleOpenCreateAsset, handleSaveAssetToLibrary, handleContextUpload,
    handleClipboardImagePaste, handleReplaceMedia, handleImportWorkflowPreset,
    handleCopy, handlePaste, hasCopiedNodes,
  };
}

function useCanvasAssetMenus(
  context: ReturnType<typeof useCanvasSaveAndReferences>,
  assets: ReturnType<typeof useCanvasAssetImports>,
) {
  const {
    React, useContextMenu, nodes, viewport, workflowId, contextMenu, setContextMenu,
    handleSelectTypeFromMenu, cancelConnectionDrag, handleHistoryClick, closeWorkflowPanel,
    handleAssetsClick, openAssetLibraryModal, media, getNodes, view, readOnly, setNodes,
    setSelectedNodeIds, selectedNodeIds, getNodeWidth, getNodeHeight, getWorkflowEpoch,
    canvasRef, closeHistoryPanel, closeAssetLibrary,
  } = context;
  const { handleOpenCreateAsset, handleReplaceMedia } = assets;
  const {
      handleDoubleClick,
      handleGlobalContextMenu,
      handleAddNext,
      handleNodeContextMenu,
      handleContextMenuCreateAsset,
      handleContextMenuSelect,
      handleToolbarAdd,
    } = useContextMenu({
      nodes,
      viewport,
      projectId: workflowId || undefined,
      contextMenu,
      setContextMenu,
      handleOpenCreateAsset,
      handleSelectTypeFromMenu,
      onCancelConnection: cancelConnectionDrag,
    }),
    openHistory = React.useCallback(
      (ke: ReactTypes.MouseEvent<HTMLButtonElement>) => {
        handleHistoryClick(ke, closeWorkflowPanel);
      },
      [handleHistoryClick, closeWorkflowPanel],
    ),
    openAssets = React.useCallback(
      (ke: ReactTypes.MouseEvent<HTMLButtonElement>) => {
        handleAssetsClick(ke, closeWorkflowPanel);
      },
      [handleAssetsClick, closeWorkflowPanel],
    ),
    openAssetsModal = React.useCallback(() => {
      openAssetLibraryModal(contextMenu.y, closeWorkflowPanel);
    }, [openAssetLibraryModal, contextMenu.y, closeWorkflowPanel]),
    replaceMedia = handleReplaceMedia,
    handleContextMenuCopyImage = React.useCallback(async () => {
      const source = nodes.find((node) => node.id === contextMenu.sourceNodeId);
      const resultUrl = typeof source?.resultUrl === 'string' ? source.resultUrl : '';
      if (!source || !['Image', 'Upload Image'].includes(source.type) || !resultUrl)
        throw canvasError('该节点没有可复制的图片。', 'asset.copy-image');
      await copyCanvasImageToSystemClipboard(resultUrl);
    }, [contextMenu.sourceNodeId, nodes]),
    createCollage = media.useCanvasCollage(React, {
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
      selectedNodeIds,
      getNodeWidth,
      getNodeHeight,
    }),
    { selectHistoryAsset, importLibraryAsset } = useCanvasAssetInsertion(React, {
      enabled: view === 'canvas' && !readOnly,
      getWorkflowEpoch,
      projectId: workflowId || undefined,
      viewport,
      canvasRef,
      setNodes,
      closeHistory: closeHistoryPanel,
      closeLibrary: closeAssetLibrary,
    });
  return {
    handleContextMenuCopyImage,
    handleDoubleClick,
    handleGlobalContextMenu,
    handleAddNext,
    handleNodeContextMenu,
    handleContextMenuCreateAsset,
    handleContextMenuSelect,
    handleToolbarAdd,
    openHistory,
    openAssets,
    openAssetsModal,
    replaceMedia,
    createCollage,
    selectHistoryAsset,
    importLibraryAsset,
  };
}

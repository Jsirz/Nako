import type * as ReactTypes from 'react';
import { useCanvasPageEvents } from './canvasApplicationEvents';
import { useCanvasAssetInsertion } from './canvasAssetInsertion';
import { copyCanvasImageToSystemClipboard } from './canvasImageClipboard';
import './canvasWorkspace.css';
import type { useCanvasSaveAndReferences } from './useCanvasSaveAndReferences';

export function useCanvasAssetActions(context: ReturnType<typeof useCanvasSaveAndReferences>) {
  const {
    React,
    NodeStatus,
    useAssets,
    usePresets,
    useCommands,
    useAutoSave,
    useVideoResults,
    useImageResults,
    useContextMenu,
    media,
    getNodeWidth,
    getNodeHeight,
    view,
    readOnly,
    contextMenu,
    setContextMenu,
    pointerRef,
    handleHistoryClick,
    closeHistoryPanel,
    handleAssetsClick,
    closeAssetLibrary,
    openAssetLibraryModal,
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
    handleSelectTypeFromMenu,
    autoAlignNodes,
    selectedConnection,
    cancelConnectionDrag,
    deleteSelectedConnection,
    clearSelectionBox,
    groups,
    groupNodes,
    workflowId,
    closeWorkflowPanel,
    getWorkflowEpoch,
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
        throw new Error('该节点没有可复制的图片。');
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
    ...context,
    isCreateAssetModalOpen,
    setIsCreateAssetModalOpen,
    nodeToSnapshot,
    assetCategories,
    handleOpenCreateAsset,
    handleSaveAssetToLibrary,
    handleContextUpload,
    handleClipboardImagePaste,
    handleReplaceMedia,
    handleContextMenuCopyImage,
    handleImportWorkflowPreset,
    handleCopy,
    handlePaste,
    hasCopiedNodes,
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

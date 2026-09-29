import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasSidePanels(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const {
    React,
    SidePanels,
    chatPanelWidth,
    setChatPanelWidth,
    isHistoryPanelOpen,
    historyPanelY,
    closeHistoryPanel,
    isChatOpen,
    toggleChat,
    closeChat,
    isAssetLibraryOpen,
    assetLibraryY,
    assetLibraryVariant,
    closeAssetLibrary,
    isWorkflowPresetPanelOpen,
    workflowPresetPanelY,
    closeWorkflowPresetPanel,
    isDraggingNodeToChat,
    viewport,
    focusOnNodes,
    nodes,
    selectedNodeIds,
    setSelectedNodeIds,
    workflowId,
    isWorkflowPanelOpen,
    workflowPanelY,
    closeWorkflowPanel,
    getWorkflowEpoch,
    localUserName,
    controlRuntime,
    documentEpoch,
    canvasCreation,
    canvasProjects,
    canvasBudgets,
    canvasProducts,
    canvasControl,
    loadProject,
    agentReferences,
    handleImportWorkflowPreset,
    selectHistoryAsset,
    importLibraryAsset,
  } = context;
  return React.createElement(SidePanels, {
    key: 'sidepanels',
    documentEpoch: getWorkflowEpoch(),
    isWorkflowPanelOpen,
    workflowPanelY,
    onCloseWorkflowPanel: closeWorkflowPanel,
    onLoadWorkflow: loadProject,
    workflowId: workflowId || void 0,
    isHistoryPanelOpen,
    historyPanelY,
    onCloseHistoryPanel: closeHistoryPanel,
    onSelectAsset: selectHistoryAsset,
    isAssetLibraryOpen,
    assetLibraryY,
    assetLibraryVariant,
    onCloseAssetLibrary: closeAssetLibrary,
    onLibrarySelect: importLibraryAsset,
    isWorkflowPresetPanelOpen,
    workflowPresetPanelY,
    onCloseWorkflowPresetPanel: closeWorkflowPresetPanel,
    onWorkflowPresetSelect: handleImportWorkflowPreset,
    isChatOpen,
    onToggleChat: toggleChat,
    onCloseChat: closeChat,
    localUserName,
    isDraggingNodeToChat,
    chatPanelWidth,
    onChatPanelWidthChange: setChatPanelWidth,
    projectId: workflowId || void 0,
    nodes,
    selectedAgentReferenceNodes: agentReferences,
    selectedNodeIds,
    onCreateTextNode: (text: string) => {
      const runtime = getWorkflowEpoch() === documentEpoch ? controlRuntime.current() : null;
      if (!runtime) throw new Error('当前画布不可编辑，请结束拖拽后重试。');
      const before = runtime.snapshot();
      const node = runtime.create(
        'Text',
        { x: (160 - viewport.x) / viewport.zoom, y: (120 - viewport.y) / viewport.zoom },
        runtime.projectId,
      );
      node.title = 'Agent 提示词';
      node.textContent = text;
      node.textMode = 'editing';
      runtime.commit(before, { ...before, nodes: [...before.nodes, node] });
      runtime.focus?.([node.id]);
      return node.id;
    },
    onCanvasAction: canvasControl,
    canvasCreation,
    canvasProjects,
    canvasBudgets,
    canvasProducts,
    onLocateNode: (ke: string) => {
      focusOnNodes(nodes, [ke]);
      setSelectedNodeIds([ke]);
    },
  });
}

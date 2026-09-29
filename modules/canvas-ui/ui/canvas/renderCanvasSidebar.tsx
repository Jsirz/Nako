import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasSidebar(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const {
    React,
    Sidebar,
    setSettingsOpen,
    closeHistoryPanel,
    closeAssetLibrary,
    closeWorkflowPresetPanel,
    closeWorkflowPanel,
    localUserName,
    userColor,
    handleToolbarAdd,
    openHistory,
    openAssets,
  } = context;
  return React.createElement(Sidebar, {
    key: 'sidebar',
    onAddClick: handleToolbarAdd,
    onWorkflowsClick: () => window.dispatchEvent(new CustomEvent('nako:open-workflow-library')),
    onWorkflowPresetsClick: () =>
      window.dispatchEvent(new CustomEvent('nako:open-skill-community')),
    onHistoryClick: openHistory,
    onAssetsClick: openAssets,
    onToolsOpen: () => {
      closeWorkflowPanel();
      closeHistoryPanel();
      closeAssetLibrary();
      closeWorkflowPresetPanel();
    },
    onSettingsClick: () => {
      setSettingsOpen(true);
    },
    currentUserName: localUserName,
    currentUserColor: userColor,
  });
}

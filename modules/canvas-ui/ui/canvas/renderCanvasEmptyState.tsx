import { CanvasEmptyState } from './CanvasEmptyState';
import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasEmptyState(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const {
    React,
    setContextMenu,
    chatPanelWidth,
    isChatOpen,
    viewport,
    nodes,
    handleSelectTypeFromMenu,
    workflowId,
    windowSize,
    handleToolbarAdd,
  } = context;
  return (
    nodes.length === 0 &&
    React.createElement(CanvasEmptyState, {
      key: 'empty-state',
      onMore: handleToolbarAdd,
      onCreate: (type: string) => {
        const availableWidth = windowSize.width - (isChatOpen ? chatPanelWidth : 0);
        handleSelectTypeFromMenu(
          type,
          {
            type: 'add-nodes',
            x: Math.max(90, availableWidth / 2 - 150),
            y: Math.max(100, windowSize.height / 2 - 160),
          },
          viewport,
          () => setContextMenu((current) => ({ ...current, isOpen: false })),
          workflowId || undefined,
        );
      },
    })
  );
}

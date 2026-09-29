import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasSelectionBox(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const { React, selectionBox } = context;
  return (
    selectionBox.isActive &&
    React.createElement('div', {
      key: 'div',
      className: 'absolute pointer-events-none',
      style: {
        left: Math.min(selectionBox.startX, selectionBox.endX),
        top: Math.min(selectionBox.startY, selectionBox.endY),
        width: Math.abs(selectionBox.endX - selectionBox.startX),
        height: Math.abs(selectionBox.endY - selectionBox.startY),
        border: '2px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '12px',
        zIndex: 1e3,
      },
    })
  );
}

import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasResize(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const { React, Resize, resizeNodeId, handleCloseResize, nodes, workflowId, saveResize } = context;
  return (
    resizeNodeId &&
    React.createElement(Resize, {
      key: 'resize',
      node: nodes.find((ke) => ke.id === resizeNodeId),
      onSave: saveResize,
      onClose: handleCloseResize,
      projectId: workflowId || undefined,
    })
  );
}

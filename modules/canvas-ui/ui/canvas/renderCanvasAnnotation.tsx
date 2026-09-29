import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasAnnotation(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const {
    React,
    Annotation,
    annotatingNodeId,
    handleCloseAnnotation,
    nodes,
    workflowId,
    saveAnnotation,
  } = context;
  return (
    annotatingNodeId &&
    React.createElement(Annotation, {
      key: 'annotation',
      node: nodes.find((ke) => ke.id === annotatingNodeId),
      onSave: saveAnnotation,
      onClose: handleCloseAnnotation,
      projectId: workflowId || undefined,
    })
  );
}

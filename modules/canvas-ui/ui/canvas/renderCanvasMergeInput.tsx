import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasMergeInput(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const { React, mergeProjectFileRef, handleMergeProjectFile } = context;
  return React.createElement('input', {
    key: 'merge-project-file',
    type: 'file',
    accept: '.json,application/json',
    ref: mergeProjectFileRef,
    style: { display: 'none' },
    onChange: handleMergeProjectFile,
  });
}

import type * as ReactTypes from 'react';
import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasImportInput(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const { React, projectFileRef, importWorkflow } = context;
  return React.createElement('input', {
    key: 'input',
    ref: projectFileRef,
    type: 'file',
    accept: '.json,.nako,application/json',
    'aria-label': '导入画布文件',
    onChange: async (event: ReactTypes.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        await importWorkflow(file);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : '画布导入未完成。');
      }
    },
    className: 'hidden',
  });
}

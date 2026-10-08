import type { CanvasWorkflowProps } from '../../../contracts/projectWorkflow';
import type { ProjectHooks } from './canvasWorkflowHooks';
export type { CanvasWorkflowProps } from '../../../contracts/projectWorkflow';
import { useCanvasSaveFeedback } from './canvasSaveFeedback';
import { useCanvasProjectFiles } from './canvasProjectFiles';
import { useCanvasProjectTransfer } from './canvasProjectTransfer';
import { useWorkflowState } from './canvasWorkflowState';
import { useWorkflowView } from './canvasWorkflowView';
import { useWorkflowSave } from './canvasWorkflowSave';
import { useWorkflowLoad } from './canvasWorkflowLoad';

/** Compose document identity, view rebasing, ordered saves, and load intent. */
export function useCanvasWorkflow(hooks: ProjectHooks, props: CanvasWorkflowProps) {
  const state = useWorkflowState(hooks, props);
  const ui = useWorkflowView(hooks, state);
  const handleSaveWorkflow = useWorkflowSave(hooks, state, ui);
  const load = useWorkflowLoad(hooks, state, ui);
  return {
    workflowId: state.workflowId,
    workflowRevision: state.workflowRevision,
    isWorkflowPanelOpen: state.isWorkflowPanelOpen,
    workflowPanelY: state.workflowPanelY,
    handleSaveWorkflow,
    ...load,
    useSaveFeedback: (options: Parameters<typeof useCanvasSaveFeedback>[1]) => useCanvasSaveFeedback(hooks, options),
    useProjectFiles: (options: Parameters<typeof useCanvasProjectFiles>[1]) => useCanvasProjectFiles(hooks, options),
    useProjectTransfer: (options: Parameters<typeof useCanvasProjectTransfer>[1]) => useCanvasProjectTransfer(hooks, options),
  };
}

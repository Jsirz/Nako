export { createWorkflowCanvasNodes, installWorkflowCanvasNodes } from './workflowNodeComposition';
export {
  WORKFLOW_CANVAS_INPUT_NODE_EVENT,
  WORKFLOW_CANVAS_INSERTED_EVENT,
} from './workflowNodeInsertion';
export {
  applyWorkflowSeedAdvancements,
  normalizeNumericParameterValues,
} from './workflowNodeParameters';
export { workflowErrorSummary, workflowMediaKindLabel } from './workflowNodePresentation';
export { expandWorkflowInputSlots, expandWorkflowStorageSlots } from './workflowNodeSlots';
export { buildWorkflowCanvasValues } from './workflowNodeValues';

export type {
  WorkflowCanvasExampleInsertion,
  WorkflowCanvasInputSlot,
  WorkflowCanvasInsertionResult,
  WorkflowCanvasNodeRecord,
  WorkflowCanvasNodesAdapter,
  WorkflowCanvasOutputValue,
  WorkflowCanvasUploadedInputNode,
  WorkflowVerifiedCanvasInsertion,
} from '../../../contracts/workflowCanvasNodeProtocol';
import type { WorkflowCanvasNodesAdapter } from '../../../contracts/workflowCanvasNodeProtocol';
declare global {
  interface Window {
    __NAKO_WORKFLOW_NODES__?: WorkflowCanvasNodesAdapter;
  }
}

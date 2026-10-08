import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import type {
  WorkflowCanvasInsertionResult,
  WorkflowCanvasNodesAdapter,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';

export const WORKFLOW_CANVAS_INSERT_REQUEST_EVENT = 'nako:add-workflow-node';

export const WORKFLOW_CANVAS_INSERTED_EVENT = 'nako:workflow-canvas-inserted';

export const WORKFLOW_CANVAS_INPUT_NODE_EVENT = 'nako:add-workflow-input-node';

export function createWorkflowCanvasInsertion(
  context: WorkflowCanvasOperationContext,
): Pick<WorkflowCanvasNodesAdapter, 'addToCanvas'> {
  void context;
  return {
    addToCanvas(blueprint, verified) {
      const requestId = crypto.randomUUID();
      return new Promise<WorkflowCanvasInsertionResult>((resolve, reject) => {
        const cleanup = () => {
          window.clearTimeout(timeout);
          window.removeEventListener(WORKFLOW_CANVAS_INSERTED_EVENT, onInserted);
        };
        const onInserted = (event: Event) => {
          const detail = (event as CustomEvent<Partial<WorkflowCanvasInsertionResult>>).detail;
          if (detail?.requestId !== requestId) return;
          if (!Array.isArray(detail.nodeIds) || typeof detail.workflowNodeId !== 'string') return;
          cleanup();
          resolve({ requestId, nodeIds: detail.nodeIds, workflowNodeId: detail.workflowNodeId });
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(localRuntimeError('画布没有确认节点已插入，请刷新画布后重试。', 'addToCanvas', ERRORS.invalidCanvas));
        }, 12_000);
        window.addEventListener(WORKFLOW_CANVAS_INSERTED_EVENT, onInserted);
        window.dispatchEvent(
          new CustomEvent(WORKFLOW_CANVAS_INSERT_REQUEST_EVENT, {
            detail: {
              requestId,
              blueprint: structuredClone(blueprint),
              ...(verified ? { verified: structuredClone(verified) } : {}),
            },
          }),
        );
      });
    },
  };
}

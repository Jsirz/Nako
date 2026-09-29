import type { WorkflowCanvasNodesAdapter } from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasBlueprint, WorkflowCanvasClient } from './workflowManagerClient';

import type { WorkflowExampleBundle } from './workflowNodeExamples';
import type { createWorkflowNodeObserver } from './workflowNodeExecution';

export interface WorkflowCanvasOperationContext {
  adapter: WorkflowCanvasNodesAdapter;
  client: WorkflowCanvasClient;
  exampleBundles: Map<string, WorkflowExampleBundle>;
  reconciliations: Map<string, Promise<WorkflowCanvasBlueprint | null>>;
  observe: ReturnType<typeof createWorkflowNodeObserver>;
}

import type { WorkflowCanvasNodesAdapter } from '../../../contracts/workflowCanvasNodeProtocol';

import { browserServices } from '../../../kernel/browser';

import type { WorkflowCanvasClient } from './workflowManagerClient';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import { createWorkflowExampleOperations } from './workflowNodeExampleOperations';
import { loadWorkflowExampleBundles } from './workflowNodeExamples';
import { createWorkflowNodeObserver, createWorkflowRunOperations } from './workflowNodeExecution';
import { createWorkflowPortOperations } from './workflowNodeGeometry';
import { createWorkflowCanvasInsertion } from './workflowNodeInsertion';
import { createWorkflowNodeStructure } from './workflowNodeStructure';
import { createWorkflowNodeUpload } from './workflowNodeUpload';
import { createWorkflowVerifiedInsertion } from './workflowNodeVerifiedInsertion';

export function createWorkflowCanvasNodes(
  client: WorkflowCanvasClient,
): WorkflowCanvasNodesAdapter {
  const adapter = {} as WorkflowCanvasNodesAdapter;
  const context: WorkflowCanvasOperationContext = {
    adapter,
    client,
    exampleBundles: loadWorkflowExampleBundles(),
    reconciliations: new Map(),
    observe: createWorkflowNodeObserver(client),
  };
  Object.assign(
    adapter,
    createWorkflowNodeStructure(context),
    createWorkflowNodeUpload(context),
    createWorkflowCanvasInsertion(context),
    createWorkflowExampleOperations(context),
    createWorkflowVerifiedInsertion(context),
    createWorkflowPortOperations(context),
    createWorkflowRunOperations(context),
  );
  return adapter;
}

export function installWorkflowCanvasNodes(
  client: WorkflowCanvasClient,
): WorkflowCanvasNodesAdapter {
  const adapter = Object.freeze(createWorkflowCanvasNodes(client));
  browserServices.__NAKO_WORKFLOW_NODES__ = adapter;
  return adapter;
}

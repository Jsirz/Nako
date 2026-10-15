import type { WorkflowManagerClient } from './workflowClient';
import type { WorkflowCanvasNodesAdapter } from './workflowCanvasNodeProtocol';
import type { WorkflowCanvasBlueprint } from './workflowCanvas';

/** Browser contribution only. Platform processes and credentials remain behind HTTP services. */
export interface LocalRuntimeUiService {
  createWorkflowClient(fetcher?: typeof fetch): WorkflowManagerClient;
  createWorkflowNodes(client: WorkflowManagerClient): WorkflowCanvasNodesAdapter;
  mountWorkflowManager(client: WorkflowManagerClient): () => void;
  installWorkflowNodes(client: WorkflowManagerClient): WorkflowCanvasNodesAdapter;
  normalizeParameters(schema: WorkflowCanvasBlueprint['parameterSchema'], values: Record<string, unknown>): Record<string, unknown>;
  mountSettings(host: HTMLElement): () => void;
  requestWorkflowNodeRun(projectId: string, nodeId: string, isCurrent?: () => boolean): Promise<boolean>;
  renderWorkflowNode(runtime: unknown, props: unknown, frame: unknown): unknown;
}

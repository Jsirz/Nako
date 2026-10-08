import type { WorkflowManagerClient } from './workflowClient';

/** Browser contribution only. Platform processes and credentials remain behind HTTP services. */
export interface LocalRuntimeUiService {
  createWorkflowClient(): WorkflowManagerClient;
  mountSettings(host: HTMLElement): () => void;
  requestWorkflowNodeRun(projectId: string, nodeId: string, isCurrent?: () => boolean): Promise<boolean>;
  renderWorkflowNode(runtime: unknown, props: unknown, frame: unknown): unknown;
}

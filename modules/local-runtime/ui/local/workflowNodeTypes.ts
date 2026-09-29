import type { WorkflowCanvasNodeRecord } from '../../../contracts/workflowCanvasNodeProtocol';

export type CanvasNode = Record<string, unknown> & { id: string; type: string };

export type NodePatch = Partial<WorkflowCanvasNodeRecord>;

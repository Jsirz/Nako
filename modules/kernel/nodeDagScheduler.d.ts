import type { NodeEdge, NodeDefinition } from '../contracts/nodeSdk.js';
export interface NodeDagSchedulerOptions { registry?: { getDefinition(type: string, owner?: string): NodeDefinition | undefined; getExecutor(type: string, owner?: string): ((input: unknown, context: unknown) => Promise<unknown> | unknown) | undefined; validateEdge(edge: NodeEdge, nodes: Array<Record<string, unknown>>): { valid: boolean; code?: string } }; executors?: Record<string, (input: unknown, context: unknown) => Promise<unknown> | unknown>; onEvent?: (event: Record<string, unknown>) => unknown; maxParallel?: number; }
export interface NodeDagRunOptions { nodes: Array<Record<string, unknown>>; edges?: NodeEdge[]; context?: Record<string, unknown>; initialInputs?: Record<string, Array<Record<string, unknown>>>; signal?: AbortSignal; }
export declare class NodeDagScheduler {
  constructor(options?: NodeDagSchedulerOptions);
  validate(nodes: Array<Record<string, unknown>>, edges?: NodeEdge[]): { valid: boolean; code?: string; edges: NodeEdge[] };
  prepare(nodes: Array<Record<string, unknown>>, edges?: NodeEdge[], initialInputs?: NodeDagRunOptions['initialInputs']): NodeEdge[];
  run(options: NodeDagRunOptions): Promise<{ results: Record<string, unknown>; states: Record<string, string>; edges: NodeEdge[]; failures: Array<{ nodeId: string; code: string; message: string }> }>;
  executeNode(node: Record<string, unknown>, context: Record<string, unknown>): Promise<unknown>;
  inputsFor(nodeId: string, edges: NodeEdge[], results: Map<string, unknown>): Array<Record<string, unknown>>;
}
export declare function createNodeDagScheduler(options?: NodeDagSchedulerOptions): NodeDagScheduler;

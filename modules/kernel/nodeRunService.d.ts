import type { NodeRunRuntime, NodeRunStore, NodeCapabilityHandlers, NodeRunRecovery } from '../contracts/nodeExecution.js';
import type { NodeRegistry } from './nodeRegistry.js';
export declare function createNodeRunService(options: { registry: NodeRegistry; store: NodeRunStore; capabilities: NodeCapabilityHandlers; readProject(id: string): Promise<Record<string, unknown> | null>; recoverRun?: NodeRunRecovery; policy: readonly string[] }): Promise<NodeRunRuntime>;

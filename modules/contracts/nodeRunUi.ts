import type { NodeRunReceipt } from './nodeExecution.js';

export interface NodeRunUiService {
  get(id: string): Promise<NodeRunReceipt>;
  approve(run: NodeRunReceipt): Promise<NodeRunReceipt>;
  cancel(id: string): Promise<NodeRunReceipt>;
  wait(initial: NodeRunReceipt, onState?: (run: NodeRunReceipt) => void,
    signal?: AbortSignal): Promise<NodeRunReceipt>;
}

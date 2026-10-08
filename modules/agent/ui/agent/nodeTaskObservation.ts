import { AgentOperationError } from '../../../contracts/agentErrors.js';
import type { NodeRunReceipt } from '../../../contracts/nodeExecution.js';
export async function observeNodeTask({ projectId, nodeId, requestId, runId, cancel, signal, fetcher }: {
  projectId: string; nodeId: string; requestId?: string; runId?: string; cancel: boolean; signal?: AbortSignal; fetcher: typeof fetch;
}) {
  if (!requestId && !runId) return null;
  const url = runId ? '/api/node-runs/' + encodeURIComponent(runId) : '/api/node-runs/find?' + new URLSearchParams({ projectId, requestId: requestId! });
  const response = await fetcher(url, { signal });
  if (!response.ok) throw new AgentOperationError('节点运行状态不可用', { operation: 'observe-node-task', projectId, nodeId, status: response.status });
  let run = await response.json() as NodeRunReceipt | null;
  if (!run) return null;
  if (run.projectId !== projectId || !run.nodes?.some(node => node.id === nodeId)) throw new AgentOperationError('节点运行归属不匹配', { operation: 'observe-node-task', projectId, nodeId, runId: run.id });
  if (cancel) {
    const cancelled = await fetcher('/api/node-runs/' + encodeURIComponent(run.id) + '/cancel', { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: '{}' });
    if (!cancelled.ok) throw new AgentOperationError('节点停止结果未确认', { operation: 'cancel-node-task', projectId, nodeId, runId: run.id });
    run = await cancelled.json() as NodeRunReceipt;
  }
  const text = Object.values(run.results?.[nodeId] || {}).find(value => typeof value === 'string');
  return { nodeId, status: ['error', 'interrupted'].includes(run.status) ? 'failed' : run.status === 'cancelled' ? 'cancelling' : run.status === 'success' ? 'success' : 'pending',
    remoteMayContinue: run.status === 'cancelled', ...(typeof text === 'string' ? { text } : {}) };
}

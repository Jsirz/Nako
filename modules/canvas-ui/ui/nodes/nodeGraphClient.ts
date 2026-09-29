import type { NodeRunReceipt, NodeRunRequest } from '../../../contracts/nodeExecution.js';
export type { NodeRunReceipt, NodeRunRequest } from '../../../contracts/nodeExecution.js';

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? { headers: { accept: 'application/json' } } : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || '节点请求失败'), { code: result.code });
  return result;
}
export const prepareNodeGraph = (input: NodeRunRequest) => request<NodeRunReceipt>('/api/node-runs', input);
export const getNodeRun = (id: string) => request<NodeRunReceipt>('/api/node-runs/' + encodeURIComponent(id));
export const findNodeRun = (projectId: string, requestId: string) => request<NodeRunReceipt | null>('/api/node-runs/find?' + new URLSearchParams({ projectId, requestId }));
export async function waitForNodeRequest(projectId: string, requestId: string, signal: AbortSignal) {
  while (true) {
    signal.throwIfAborted();
    const run = await findNodeRun(projectId, requestId); if (run) return run;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
export const listNodeRuns = (projectId: string) => request<NodeRunReceipt[]>('/api/node-runs?projectId=' + encodeURIComponent(projectId));
export const approveNodeRun = (run: NodeRunReceipt) => request<NodeRunReceipt>(`/api/node-runs/${encodeURIComponent(run.id)}/approve`, { grants: run.capabilities });
export const cancelNodeRun = (id: string) => request<NodeRunReceipt>(`/api/node-runs/${encodeURIComponent(id)}/cancel`, {});
export const stopProjectNodeRuns = (projectId: string) => request(`/api/node-runs/projects/${encodeURIComponent(projectId)}/stop`, {});
export async function waitNodeRun(initial: NodeRunReceipt, onState?: (run: NodeRunReceipt) => void, signal?: AbortSignal) {
  let run = initial;
  while (['running', 'awaiting_approval'].includes(run.status) || run.recoveryPending) {
    signal?.throwIfAborted(); onState?.(run);
    await new Promise(resolve => setTimeout(resolve, 700));
    signal?.throwIfAborted(); run = await getNodeRun(run.id); signal?.throwIfAborted();
  }
  onState?.(run); return run;
}
export async function executeNodeGraph(input: NodeRunRequest, approve?: (run: NodeRunReceipt) => Promise<boolean>) {
  let run = await prepareNodeGraph(input);
  if (run.status === 'awaiting_approval') {
    if (!approve || !await approve(run)) { await cancelNodeRun(run.id); throw new Error('本次节点运行未获授权'); }
    run = await approveNodeRun(run);
  }
  run = await waitNodeRun(run);
  if (run.status !== 'success') throw Object.assign(new Error(run.error || '节点运行已停止'), { code: run.code });
  return { ok: true, results: run.results, states: run.states, runId: run.id };
}

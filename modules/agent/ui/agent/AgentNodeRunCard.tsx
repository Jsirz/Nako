import { useEffect, useState } from 'react';
import { approveNodeRun, cancelNodeRun, getNodeRun, waitNodeRun } from '../../../canvas-ui/api/ui/nodes/nodeGraphClient';
import type { NodeRunReceipt } from '../../../contracts/nodeExecution.js';

export function AgentNodeRunCard({ id }: { id: string }) {
  const [run, setRun] = useState<NodeRunReceipt>(), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    getNodeRun(id).then(value => waitNodeRun(value, setRun, abort.signal)).catch(cause => { if (!abort.signal.aborted) setError(cause.message); });
    return () => abort.abort();
  }, [id]);
  const act = (action: 'approve' | 'cancel') => {
    if (!run) return;
    (action === 'approve' ? approveNodeRun(run) : cancelNodeRun(id)).then(setRun).catch(cause => setError(cause.message));
  };
  return <div className="rounded-lg border border-[var(--nk-border)] bg-[var(--nk-surface)] p-3 text-xs space-y-2" data-node-run={id}>
    <p className="font-semibold">节点运行 · {run?.status || '读取状态'}</p>
    {run && <p>申请能力：{run.capabilities.join('、') || '本地计算'} · 模型调用上限 {run.maxModelCalls}</p>}
    {run?.status === 'awaiting_approval' && <pre className="max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(run.nodes, null, 2)}</pre>}
    {run?.status === 'awaiting_approval' && <button className="rounded bg-[var(--nk-focus)] px-3 py-1 text-white" onClick={() => act('approve')}>授权并运行</button>}
    {run && ['running', 'awaiting_approval'].includes(run.status) && <button className="ml-2" onClick={() => act('cancel')}>停止</button>}
    {run?.results && Object.keys(run.results).length > 0 && <pre className="max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(run.results, null, 2)}</pre>}
    {(error || run?.error) && <p role="alert" className="text-red-400">{error || run?.error}</p>}
  </div>;
}

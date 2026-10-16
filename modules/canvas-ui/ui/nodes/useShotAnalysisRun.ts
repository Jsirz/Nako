import { useEffect, useRef, useState } from 'react';
import { canvasError } from '../../../contracts/canvasErrors.js';
import { prepareNodeGraph, approveNodeRun, cancelNodeRun, getNodeRun, waitNodeRun, waitForNodeRequest, type NodeRunReceipt } from './nodeGraphClient';
import { buildNodeGraph, type NodeValue } from './nodeGraphSnapshot';
import type { ShotAnalysisResult } from '../../../contracts/shotAnalysis.js';

export function useShotAnalysisRun(options: {
  node: NodeValue; allNodes: NodeValue[]; projectId: string; documentEpoch: number; readOnly: boolean;
  patch(value: Record<string, unknown>): void;
  saveBeforePrepare?(): Promise<boolean>;
  onAnalysisSuccess?(result: ShotAnalysisResult): void;
}) {
  const { node, projectId, documentEpoch, readOnly, patch, saveBeforePrepare } = options;
  const [run, setRun] = useState<NodeRunReceipt>();
  const [error, setError] = useState(''), [submitting, setSubmitting] = useState(false), [observation, observe] = useState(0);
  const busy = useRef(false), actionPending = useRef(false), latest = useRef(options), live = useRef(false), sequence = useRef(0),
    completedRun = useRef('');
  latest.current = options;
  const current = () => live.current && latest.current.projectId === projectId && latest.current.documentEpoch === documentEpoch && latest.current.node.id === node.id;
  useEffect(() => {
    setRun(undefined); setError(''); setSubmitting(false); busy.current = false; actionPending.current = false; completedRun.current = '';
    live.current = true;
    return () => { live.current = false; sequence.current++; };
  }, [projectId, documentEpoch, node.id, readOnly]);
  const receipt = (value: NodeRunReceipt) => {
    if (!current() || latest.current.readOnly) return;
    busy.current = ['running', 'awaiting_approval'].includes(value.status);
    setRun(value);
    const output = value.results?.[node.id];
    if (value.status === 'success' && completedRun.current !== value.id) {
      completedRun.current = value.id;
      const direct = Boolean(latest.current.node.nodeDirectRunRequestId && latest.current.node.nodeDirectRunRequestId === latest.current.node.nodeRequestId);
      latest.current.patch({ pluginResult: output, nodeAnalysisRunId: value.id, nodeDirectRunRequestId: undefined, status: 'success', errorMessage: undefined });
      if (direct && output?.analysis)
        latest.current.onAnalysisSuccess?.(output.analysis as ShotAnalysisResult);
    }
    if (['error', 'interrupted', 'cancelled'].includes(value.status)) latest.current.patch({ nodeDirectRunRequestId: undefined, status: 'error', errorMessage: value.error || '运行已停止' });
  };
  useEffect(() => {
    if (readOnly) return;
    const id = String(node.nodeRunId || ''), requestId = String(node.nodeRequestId || '');
    if (!id && !requestId) { setRun(undefined); busy.current = false; return; }
    const version = sequence.current;
    const controller = new AbortController();
    const valid = () => !controller.signal.aborted && current() && sequence.current === version &&
      id === String(latest.current.node.nodeRunId || '') && requestId === String(latest.current.node.nodeRequestId || '');
    const initial = id ? getNodeRun(id) : waitForNodeRequest(projectId, requestId, controller.signal);
    void initial.then(async value => {
      if (!valid()) return;
      if (!id) { latest.current.patch({ nodeRunId: value.id }); return; }
      if (value.status === 'awaiting_approval' && requestId && latest.current.node.nodeDirectRunRequestId === requestId) {
        setRun(value);
        value = await approveNodeRun(value);
        if (!valid()) return;
      }
      return waitNodeRun(value, state => { if (valid()) receipt(state); }, controller.signal);
    }).catch(cause => { if (valid()) setError(cause?.code ? cause.message : '任务状态查询失败，请重新查询原任务。'); });
    return () => controller.abort();
  }, [node.nodeRunId, node.nodeRequestId, projectId, documentEpoch, node.id, readOnly, observation]);
  const active = submitting || Boolean(node.nodeDirectRunRequestId || node.nodeRequestId && !node.nodeRunId) || run?.status === 'running' || run?.status === 'awaiting_approval';
  const start = async (reuse: boolean, analysis?: string) => {
    if (readOnly || active || busy.current) return;
    const version = ++sequence.current;
    const valid = () => current() && sequence.current === version && !latest.current.readOnly;
    busy.current = true; setSubmitting(true); setError(''); setRun(undefined);
    let requestId: string | undefined;
    try {
      if (reuse && !node.nodeAnalysisRunId) throw canvasError('尚无可复用的本地分析，请先开始拉片。', 'shotAnalysis.start');
      if (!saveBeforePrepare || !(await saveBeforePrepare())) {
        if (!valid()) return;
        throw canvasError('画布尚未保存完成，请等待保存后重试拉片。', 'shotAnalysis.save-before-run');
      }
      if (!valid()) return;
      const saved = latest.current;
      const parameters = { ...saved.node.parameters };
      delete parameters.analysis; delete parameters.reuseRunId;
      if (reuse) { parameters.reuseRunId = saved.node.nodeAnalysisRunId; if (analysis) parameters.analysis = analysis; }
      const graph = { ...buildNodeGraph({ ...saved.node, parameters }, saved.allNodes, projectId), maxModelCalls: reuse ? 0 : 1 };
      requestId = graph.requestId;
      patch({ nodeRequestId: requestId, nodeDirectRunRequestId: requestId, nodeRunId: undefined, status: 'loading', errorMessage: undefined });
      const prepared = await prepareNodeGraph(graph);
      if (!valid()) return;
      patch({ nodeRunId: prepared.id });
    } catch (cause) {
      if (!valid()) return;
      busy.current = false;
      const status = cause && typeof cause === 'object' && 'status' in cause ? Number(cause.status) : 0;
      if (requestId && status >= 400 && status < 500 && status !== 408)
        patch({ nodeRequestId: undefined, nodeDirectRunRequestId: undefined, nodeRunId: undefined, status: node.pluginResult ? 'success' : 'idle' });
      // Unknown transport results keep the request ID; query it instead of resubmitting.
      if (cause && typeof cause === 'object' && 'code' in cause) {
        const failure = cause as { message: string };
        setError(failure.message);
      } else setError(requestId ? '连接中断，请重新查询原任务，避免重复调用模型。' : '画布保存失败，请检查网络后重试拉片。');
      observe(value => value + 1);
    } finally { if (valid()) setSubmitting(false); }
  };
  const cancel = async () => {
    if (readOnly || !run || actionPending.current) return;
    const version = ++sequence.current;
    const valid = () => current() && sequence.current === version;
    actionPending.current = true; setSubmitting(true);
    try { const value = await cancelNodeRun(run.id); if (valid()) receipt(value); }
    catch { if (valid()) setError('停止请求失败，请重新查询原任务。'); }
    finally { if (valid()) { actionPending.current = false; setSubmitting(false); observe(value => value + 1); } }
  };
  const progress = run?.events.filter(event => event.type === 'progress' && event.nodeId === node.id).at(-1)?.message;
  return { run, active, submitting, error, setError, start, cancel,
    progress: typeof progress === 'string' ? progress : '', query: () => { setError(''); observe(value => value + 1); } };
}

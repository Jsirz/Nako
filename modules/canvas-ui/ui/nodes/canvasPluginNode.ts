import { createElement as h, useEffect, useRef, useState } from 'react';
import type { CanvasComponent } from '../app/canvasComponentType';
import { prepareNodeGraph, approveNodeRun, cancelNodeRun, getNodeRun, waitNodeRun, waitForNodeRequest, type NodeRunReceipt } from './nodeGraphClient';
import type { NodeDefinition } from './nodeFramework';
import { NodeCustomUi } from './nodeCustomUi';
import { NodeSchemaFields } from './nodeSchemaFields';
import { buildNodeGraph, type NodeValue } from './nodeGraphSnapshot';
import { validateNodeValue } from '../../../contracts/nodeExecution.js';

export function CanvasPluginNode(props: Record<string, unknown> & {
  data: NodeValue; definition?: NodeDefinition; allNodes?: NodeValue[];
  dependencies: { Frame: CanvasComponent; Header: CanvasComponent };
}) {
  const { data: node, definition, dependencies } = props;
  const [run, setRun] = useState<NodeRunReceipt>(), [error, setError] = useState(''), [submitting, setSubmitting] = useState(false);
  const [modelLimit, setModelLimit] = useState(10);
  const busy = useRef(false), [observing, setObserving] = useState(0);
  const updateRef = useRef(props.onUpdate); updateRef.current = props.onUpdate;
  const patch = (value: Record<string, unknown>) => (updateRef.current as ((id: string, patch: Record<string, unknown>) => void) | undefined)?.(node.id, value);
  const values = node.parameters || {};
  const changeParameters = (parameters: Record<string, unknown>) => {
    try { patch({ parameters: validateNodeValue(definition?.parameters, parameters) }); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const active = submitting || Boolean(node.nodeRequestId && !node.nodeRunId) || run?.status === 'running' || run?.status === 'awaiting_approval';
  const properties = (definition?.parameters?.properties || {}) as Parameters<typeof NodeSchemaFields>[0]['properties'];
  const receipt = (value: NodeRunReceipt) => {
    busy.current = ['running', 'awaiting_approval'].includes(value.status);
    setRun(value);
    const output = value.results?.[node.id];
    if (value.status === 'success') patch({ pluginResult: output, outputPorts: definition?.outputs, status: 'success', errorMessage: undefined });
    if (['error', 'interrupted', 'cancelled'].includes(value.status)) patch({ status: 'error', errorMessage: value.error || '运行已停止' });
  };
  useEffect(() => {
    if (props.readOnly) return;
    const id = String(node.nodeRunId || ''), requestId = String(node.nodeRequestId || ''); if (!id && !requestId) return;
    const abort = new AbortController();
    const initial = id ? getNodeRun(id) : waitForNodeRequest(String(props.projectId || node.projectId || ''), requestId, abort.signal);
    initial.then(value => {
      if (abort.signal.aborted) return;
      if (!id) { patch({ nodeRunId: value.id }); return; }
      return waitNodeRun(value, receipt, abort.signal);
    }).catch(cause => { if (!abort.signal.aborted) setError(cause.message); });
    // Unmount disconnects observation; it does not cancel server execution.
    return () => abort.abort();
  }, [node.nodeRunId, node.nodeRequestId, observing, props.readOnly]);
  const start = async (upstream = false) => {
    if (props.readOnly || !definition || active || busy.current) return;
    busy.current = true;
    setSubmitting(true); setError('');
    try {
      const projectId = String(props.projectId || node.projectId || '');
      const graph = { ...buildNodeGraph(node, props.allNodes || [], projectId, upstream), maxModelCalls: modelLimit };
      patch({ nodeRequestId: graph.requestId, nodeRunId: undefined, status: 'loading' });
      const value = await prepareNodeGraph(graph);
      patch({ nodeRunId: value.id, status: 'loading' }); receipt(value);
    } catch (cause) {
      busy.current = false;
      if (cause && typeof cause === 'object' && 'code' in cause) patch({ nodeRequestId: undefined, status: 'error' });
      setError(cause instanceof Error ? cause.message : String(cause));
    }
    finally { setSubmitting(false); }
  };
  const approve = () => { if (!props.readOnly && run) void approveNodeRun(run).then(receipt).catch(cause => setError(cause.message)); };
  const cancel = () => { if (!props.readOnly && run) void cancelNodeRun(run.id).then(receipt).catch(cause => setError(cause.message)); };
  return h(dependencies.Frame, { ...props, data: node },
    h(dependencies.Header, { data: node, selected: props.selected, readOnly: props.readOnly, onUpdate: props.onUpdate }),
    h('div', { className: 'p-3 text-xs text-[var(--nk-text-muted)] space-y-3', onPointerDown: (event: { stopPropagation(): void }) => { if (!props.readOnly) event.stopPropagation(); } },
      definition?.description && h('p', null, definition.description),
      h('div', { className: 'grid grid-cols-2 gap-2' },
        h('div', null, '输入', ...(definition?.inputs || []).map(port => h('div', { key: port.id }, `${port.id} · ${port.media.join('/')}`))),
        h('div', null, '输出', ...(definition?.outputs || []).map(port => h('div', { key: port.id }, `${port.id} · ${port.media.join('/')}`)))),
      props.readOnly
        ? h('pre', { className: 'max-h-48 overflow-auto whitespace-pre-wrap text-[var(--nk-text)]', 'aria-label': 'Plugin parameters' }, JSON.stringify(values, null, 2))
        : definition?.render?.kind === 'iframe' ? h(NodeCustomUi, { packageId: definition.pluginId || '', type: definition.type, parameters: values, run,
          onChange: changeParameters, onRun: () => void start(), onCancel: cancel })
          : h(NodeSchemaFields, { properties, values, onChange: (key: string, value: unknown) => patch({ parameters: { ...values, [key]: value } }) }),
      error && h('div', { role: 'alert', className: 'text-red-400 break-words' }, error),
      Boolean(error && node.nodeRequestId) && h('button', { onClick: () => { setError(''); setObserving(value => value + 1); } }, '重新查询原任务'),
      Boolean(node.nodeRequestId && !node.nodeRunId) && h('p', null, '正在核对提交结果，请勿重复创建任务。'),
      Boolean(node.migrationError) && h('div', { role: 'alert', className: 'text-red-400 break-words' }, String(node.migrationError)),
      h('label', { className: 'block' }, '本次模型调用上限 ', h('input', { type: 'number', min: 0, max: 100, value: modelLimit, disabled: active || Boolean(props.readOnly), className: 'w-16 rounded bg-[var(--nk-input)] px-2', onChange: (event: { target: { value: string } }) => setModelLimit(Math.max(0, Math.min(100, Math.trunc(Number(event.target.value) || 0)))) })),
      run?.status === 'awaiting_approval' && h('div', { className: 'rounded border border-amber-500 p-2 space-y-2' },
        h('p', null, `申请能力：${run.capabilities.join('、') || '执行节点'}；最多调用模型 ${run.maxModelCalls} 次。`),
        h('pre', { className: 'max-h-36 overflow-auto whitespace-pre-wrap' }, JSON.stringify(run.nodes, null, 2)),
        h('button', { type: 'button', disabled: Boolean(props.readOnly), onClick: approve, className: 'rounded bg-[var(--nk-focus)] px-3 py-1 text-white' }, '授权并运行')),
      run && h('p', { 'aria-live': 'polite' }, `${run.status} · ${String(run.events.at(-1)?.message || '')}`),
      node.pluginResult !== undefined && h('pre', { className: 'max-h-32 overflow-auto whitespace-pre-wrap text-[var(--nk-text)]' }, JSON.stringify(node.pluginResult, null, 2)),
      active ? h('button', { type: 'button', disabled: Boolean(props.readOnly), onClick: cancel }, '停止运行') : h('div', { className: 'flex gap-2' },
        h('button', { type: 'button', disabled: Boolean(props.readOnly), onClick: () => void start(), className: 'rounded bg-[var(--nk-focus)] px-3 py-1 text-white' }, '运行节点'),
        h('button', { type: 'button', disabled: Boolean(props.readOnly), onClick: () => void start(true) }, '运行上游 DAG')),
      h('p', null, `插件：${definition?.pluginId || node.pluginId || ''}`)));
}

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, ArrowRight, LoaderCircle } from 'lucide-react';
import type { CanvasComponent } from '../app/canvasComponentType';
import { canvasError } from '../../../contracts/canvasErrors.js';
import { createVideoReplicaPlan, parseVideoReplicaResult, validateVideoReplicaPlan, type VideoReplicaSettings, type VideoReplicaPlan, type VideoReplicaInsertion } from '../../../contracts/videoReplica.js';
import { nodeLinks, nodeOutput, type NodeValue } from './nodeGraphSnapshot';
import { useShotAnalysisRun } from './useShotAnalysisRun';
import { useReplicaUpload } from './useReplicaUpload';
import { VideoReplicaDialog } from './videoReplicaDialog';
import './shotAnalysisNode.css';
import './videoReplicaNode.css';

export function CanvasVideoReplicaNode(props: Record<string, unknown> & {
  data: NodeValue; allNodes?: NodeValue[]; dependencies: { Frame: CanvasComponent; Header: CanvasComponent };
}) {
  const { data: node, dependencies } = props, allNodes = props.allNodes || [];
  const projectId = String(props.projectId || node.projectId || ''), documentEpoch = Number(props.documentEpoch || 0), readOnly = Boolean(props.readOnly);
  const latest = useRef(props); latest.current = props;
  const patch = (value: Record<string, unknown>) => (latest.current.onUpdate as ((id: string, value: Record<string, unknown>) => void) | undefined)?.(node.id, value);
  const [step, setStep] = useState<'analysis' | 'assets' | 'plan'>(), [error, setError] = useState('');
  const uploadingResult = useRef('');
  useEffect(() => { setStep(undefined); setError(''); }, [projectId, documentEpoch, node.id]);
  const link = nodeLinks(node, allNodes).find(item => item.targetPortId === 'video');
  const parent = link && allNodes.find(item => item.id === link.sourceNodeId);
  const source = link ? parent && nodeOutput(parent, link.sourcePortId) : node.parameters?.video;
  const url = typeof source === 'string' ? source : String((source as { url?: string } | undefined)?.url || '');
  const saved = (node.pluginResult as { analysis?: unknown } | undefined)?.analysis;
  const result = useMemo(() => { try { return saved ? parseVideoReplicaResult(saved) : undefined; } catch { return undefined; } }, [saved]);
  const stale = Boolean(result && result.source.url !== url);
  const settings: VideoReplicaSettings = {
    replacements: node.replicaAssetResultId === result?.id ? node.replicaReplacements as VideoReplicaSettings['replacements'] : {},
    requirements: String(node.replicaRequirements || ''), aspectRatio: String(node.replicaAspectRatio || '16:9'), resolution: String(node.replicaResolution || '720p'),
  };
  let plan: VideoReplicaPlan | undefined;
  if (result && !stale && node.replicaPlan) {
    try { plan = validateVideoReplicaPlan(node.replicaPlan, result, settings, projectId, true); } catch { /* Changed inputs require an explicit new plan. */ }
  }
  const runner = useShotAnalysisRun({ node, allNodes, projectId, documentEpoch, readOnly, patch,
    saveBeforePrepare: props.onSaveBeforeShotAnalysis as (() => Promise<boolean>) | undefined,
    onAnalysisSuccess: () => setStep('analysis') });
  const upload = useReplicaUpload({ projectId, nodeId: node.id, documentEpoch, readOnly, failed: setError,
    uploaded: (url, target) => {
      const data = latest.current.data;
      if (target === 'video') patch({ parameters: { ...data.parameters, video: url }, pluginResult: undefined, replicaPlan: undefined,
        replicaReplacements: {}, replicaAssetResultId: undefined, nodeRunId: undefined, nodeRequestId: undefined, nodeDirectRunRequestId: undefined, nodeAnalysisRunId: undefined, status: 'idle', errorMessage: undefined });
      else {
        const active = (data.pluginResult as { analysis?: { id?: string } } | undefined)?.analysis;
        if (active?.id !== uploadingResult.current) { setError('分析结果已变化，请为新资产重新上传图片。'); return; }
        const previous = data.replicaAssetResultId === active?.id ? data.replicaReplacements as NonNullable<VideoReplicaSettings['replacements']> : {};
        patch({ replicaAssetResultId: active?.id, replicaReplacements: { ...previous, [target]: { ...previous?.[target], url, description: previous?.[target]?.description || '' } }, replicaPlan: undefined });
      }
    } });
  const disabled = readOnly || runner.active || Boolean(upload.uploading);
  const changeSettings = (value: VideoReplicaSettings) => {
    if (disabled || stale || !result) return;
    patch({ replicaAssetResultId: result.id, replicaReplacements: value.replacements ?? settings.replacements,
      replicaRequirements: value.requirements ?? settings.requirements, replicaAspectRatio: value.aspectRatio ?? settings.aspectRatio,
      replicaResolution: value.resolution ?? settings.resolution, replicaPlan: undefined });
  };
  const buildPlan = () => {
    if (disabled || stale || !result) return;
    try { patch({ replicaPlan: createVideoReplicaPlan(result, settings, crypto.randomUUID()) }); setError(''); setStep('plan'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '生成复刻计划失败。'); }
  };
  const insert = (generate: boolean) => {
    if (disabled || stale || !result || !plan) return;
    try {
      const action = props.onCreateVideoReplica as ((input: VideoReplicaInsertion) => string[]) | undefined;
      if (!action) throw canvasError('当前画布暂时无法创建复刻节点。', 'videoReplica.insert');
      action({ projectId, nodeId: node.id, resultId: result.id, planId: plan.id, documentEpoch, generate });
      setError(''); setStep(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '创建复刻节点失败。'); }
  };
  const created = Boolean(plan && plan.shots.every(shot => allNodes.some(item => item.type === 'Video' && item.replicaSourceNodeId === node.id && item.replicaPlanId === plan.id && item.replicaShotId === shot.shotId)));
  const failure = error || runner.error || String(node.errorMessage || '') || (saved && !result ? '复刻分析损坏，请重新分析。' : '');
  return createElement(dependencies.Frame, { ...props, data: node, cardClassName: 'shot-analysis-card replica-card' },
    createElement(dependencies.Header, { data: node, selected: props.selected, readOnly, onUpdate: props.onUpdate }),
    <div className="shot-analysis-content replica-content" onPointerDown={event => {
      if (event.target instanceof Element && event.target.closest('button,input,select,textarea,label,video,summary,a')) event.stopPropagation();
    }} onWheel={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <div className="shot-analysis-heading"><Clapperboard/><strong>视频复刻</strong></div>
      <div className="shot-analysis-source">
        {url ? <video key={url} controls preload="metadata" src={url} className="shot-analysis-video"/> :
          <div className="shot-analysis-empty"><Clapperboard/><span>{link ? '等待上游视频' : '上传视频或连接视频节点'}</span><small>分析分镜与资产，替换后复刻生成</small></div>}
        {!readOnly && !link && <label className="shot-analysis-upload" aria-disabled={disabled}>
          {upload.uploading === 'video' ? '正在上传…' : url ? '更换视频' : '选择视频'}
          <input hidden type="file" accept="video/*,.mp4,.mov,.mkv,.avi,.webm" disabled={disabled} onChange={event => { void upload.upload(event.target.files?.[0], 'video', 'video'); event.target.value = ''; }}/>
        </label>}
        {link && <small className="shot-analysis-source-hint">已连接画布视频</small>}
      </div>
      {stale && <p className="replica-notice">源视频已变化，请重新分析后设置替换资产。</p>}
      {result && <div className="replica-overview"><strong>{result.shots.length} 个分镜 · {result.assets.length} 个资产</strong><p>{result.analysis.summary}</p>
        <button type="button" onClick={() => setStep('analysis')}>查看分镜与资产 <ArrowRight size={14}/></button></div>}
      {!readOnly && <div className="shot-analysis-actions">
        <button className={result && !stale ? 'shot-analysis-secondary' : 'shot-analysis-start'} disabled={disabled || !url} onClick={() => { setError(''); void runner.start(false); }}>{runner.active ? '正在分析…' : result ? '重新分析视频' : '开始分析视频'}</button>
        {result && !stale && <button className="shot-analysis-start" disabled={disabled} onClick={() => setStep(plan ? 'plan' : 'assets')}>{created ? '查看复刻计划' : plan ? '确认复刻计划' : '设置资产替换'}</button>}
        {runner.active && runner.run && <button className="shot-analysis-secondary" disabled={runner.submitting} onClick={() => void runner.cancel()}>停止分析</button>}
      </div>}
      {runner.active && <p role="status" className="shot-analysis-progress"><LoaderCircle size={14} className="animate-spin"/>{runner.progress || '正在准备分析…'}</p>}
      {failure && <div role="alert" className="shot-analysis-error">{failure}{Boolean(node.nodeRequestId) && !readOnly && <button onClick={runner.query}>重新查询原任务</button>}</div>}
      {step && result && <VideoReplicaDialog result={result} step={step} onStep={setStep} onClose={() => setStep(undefined)}
        settings={settings} plan={plan} readOnly={readOnly || stale} busy={disabled && !readOnly} uploading={upload.uploading} error={failure} created={created}
        onSettings={changeSettings} onUpload={(file, id) => { if (!disabled && !stale) { uploadingResult.current = result.id; void upload.upload(file, id, 'image'); } }}
        onPlan={buildPlan} onInsert={insert} onEditPlan={value => { if (!disabled && !stale) patch({ replicaPlan: value }); }}/>}
    </div>);
}

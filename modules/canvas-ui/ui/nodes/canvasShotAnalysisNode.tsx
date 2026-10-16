import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasComponent } from '../app/canvasComponentType';
import { mediaCanvas } from '../../../kernel/browser';
import { parseShotAnalysisResult, type ShotAnalysisInsertion } from '../../../contracts/shotAnalysis.js';
import { canvasError } from '../../../contracts/canvasErrors.js';
import { nodeLinks, nodeOutput, type NodeValue } from './nodeGraphSnapshot';
import { useShotAnalysisRun } from './useShotAnalysisRun';
import { ShotAnalysisResults } from './shotAnalysisResults';
import './shotAnalysisNode.css';

export function CanvasShotAnalysisNode(props: Record<string, unknown> & {
  data: NodeValue; allNodes?: NodeValue[]; dependencies: { Frame: CanvasComponent; Header: CanvasComponent };
}) {
  const { data: node, dependencies } = props, allNodes = props.allNodes || [];
  const projectId = String(props.projectId || node.projectId || ''), documentEpoch = Number(props.documentEpoch || 0), readOnly = Boolean(props.readOnly);
  const update = useRef(props.onUpdate); update.current = props.onUpdate;
  const patch = (value: Record<string, unknown>) => (update.current as ((id: string, value: Record<string, unknown>) => void) | undefined)?.(node.id, value);
  const [uploading, setUploading] = useState(false), [videoMeta, setVideoMeta] = useState(''), [insertionError, setInsertionError] = useState(''),
    upload = useRef<AbortController>();
  useEffect(() => {
    upload.current = undefined; setUploading(false);
    return () => { upload.current?.abort(); upload.current = undefined; };
  }, [projectId, documentEpoch, node.id, readOnly]);
  const link = nodeLinks(node, allNodes).find(item => item.targetPortId === 'video');
  const parent = link && allNodes.find(item => item.id === link.sourceNodeId);
  const connected = parent && link ? nodeOutput(parent, link.sourcePortId) : undefined;
  const source = link ? connected : node.parameters?.video;
  const url = typeof source === 'string' ? source : source && typeof source === 'object' && 'url' in source ? String(source.url || '') : '';
  const savedResult = (node.pluginResult as { analysis?: unknown } | undefined)?.analysis;
  const result = useMemo(() => { try { return savedResult ? parseShotAnalysisResult(savedResult) : undefined; } catch { return undefined; } }, [savedResult]);
  const insertResult = (value?: typeof result) => {
    try {
      const action = props.onInsertShotAnalysis as ((input: ShotAnalysisInsertion) => void) | undefined;
      if (!action || !value) throw canvasError('拉片结果尚未就绪，请稍后重试。', 'shotAnalysis.insert');
      action({ projectId, nodeId: node.id, resultId: value.id, documentEpoch });
      setInsertionError('');
    } catch (cause) { setInsertionError(cause instanceof Error ? cause.message : '结果进入画布失败。'); }
  };
  const runner = useShotAnalysisRun({ node, allNodes, projectId, documentEpoch, readOnly, patch,
    saveBeforePrepare: props.onSaveBeforeShotAnalysis as (() => Promise<boolean>) | undefined,
    onAnalysisSuccess: value => insertResult(value) });
  useEffect(() => setVideoMeta(''), [url]);
  const disabled = readOnly || uploading || runner.active;
  const uploadVideo = async (file?: File) => {
    if (!file || disabled || upload.current) return;
    const controller = new AbortController(); upload.current = controller;
    setUploading(true); runner.setError('');
    try {
      if (mediaCanvas().classify(file) !== 'video') throw canvasError('请选择视频文件。', 'shotAnalysis.upload');
      const video = await mediaCanvas().uploadFile(file, projectId, node.id, controller.signal);
      if (controller.signal.aborted) return;
      patch({ parameters: { ...node.parameters, video }, nodeRunId: undefined, nodeRequestId: undefined, nodeDirectRunRequestId: undefined, nodeAnalysisRunId: undefined, pluginResult: undefined, status: 'idle', errorMessage: undefined });
    } catch (cause) {
      if (!controller.signal.aborted) runner.setError(cause && typeof cause === 'object' && 'code' in cause ? String((cause as { message: string }).message) : '视频上传失败，请重试。');
    } finally { if (!controller.signal.aborted) { setUploading(false); upload.current = undefined; } }
  };
  const start = (reuse = false, analysis?: string) => {
    if (!url) { runner.setError(link ? '上游节点尚无可用视频。' : '请上传视频或连接画布中的视频节点。'); return; }
    if (['storyboard', 'motion', 'sound'].every(key => node.parameters?.[key] === false)) { runner.setError('请至少选择一项拉片内容。'); return; }
    void runner.start(reuse, analysis);
  };
  const alreadyInserted = Boolean(result && allNodes.some(item => item.shotAnalysisResultId === result.id && item.shotAnalysisNodeId === node.id));
  const failure = runner.error || insertionError || String(node.errorMessage || '') || (savedResult && !result ? '拉片结果损坏，请重新分析。' : '');
  return createElement(dependencies.Frame, { ...props, data: node, cardClassName: 'shot-analysis-card' },
    createElement(dependencies.Header, { data: node, selected: props.selected, readOnly, onUpdate: props.onUpdate }),
    <div className="shot-analysis-content"
      onPointerDown={event => {
        if (event.target instanceof Element && event.target.closest('button,input,select,textarea,label,video,audio,summary,a,[contenteditable]')) event.stopPropagation();
      }} onWheel={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <div className="shot-analysis-heading"><ShotAnalysisIcon kind="reel"/><strong>逐帧拉片</strong></div>
      <div className="shot-analysis-source">
        <div className="shot-analysis-source-label"><span>视频素材</span><span aria-label="视频信息">{url && videoMeta}</span></div>
        {url ? <video key={url} controls preload="metadata" src={url} className="shot-analysis-video"
          onLoadedMetadata={event => {
            const video = event.currentTarget;
            setVideoMeta(formatVideoMeta(video.duration, video.videoWidth, video.videoHeight));
          }} /> : <div className="shot-analysis-empty"><ShotAnalysisIcon kind="motion"/><span>{link ? '等待上游视频' : '上传视频或连接视频节点'}</span><small>支持最长 20 分钟</small></div>}
        {!readOnly && !link && <label className="shot-analysis-upload" aria-disabled={disabled}>
          {uploading ? '正在上传视频…' : url ? '更换视频' : '选择视频'}
          <input type="file" accept="video/*,.mp4,.mov,.mkv,.avi,.webm" disabled={disabled} className="hidden" onChange={event => { void uploadVideo(event.target.files?.[0]); event.target.value = ''; }} />
        </label>}
        {link && url && <small className="shot-analysis-source-hint">已连接上游视频</small>}
      </div>
      <div className="shot-analysis-dimensions">
        <span className="shot-analysis-label">拆解维度</span>
        <div className="shot-analysis-options">{([['storyboard', '分镜'], ['motion', '动态'], ['sound', '声音']] as const).map(([key, title]) => {
          const selected = node.parameters?.[key] !== false;
          return <button key={key} type="button" aria-pressed={selected} disabled={disabled}
            onClick={() => patch({ parameters: { ...node.parameters, [key]: !selected } })}>
            <ShotAnalysisIcon kind={key}/>{title}
          </button>;
        })}</div>
      </div>
      {!readOnly && <div className="shot-analysis-actions">
        <button type="button" disabled={disabled || !url} className="shot-analysis-start" onClick={() => { setInsertionError(''); start(); }}>
          {runner.active ? '正在拉片…' : '开始拉片'}
        </button>
        {runner.active && runner.run && <button type="button" className="shot-analysis-secondary" disabled={runner.submitting} onClick={() => void runner.cancel()}>停止拉片</button>}
      </div>}
      {runner.active && <p role="status" className="shot-analysis-progress"><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{runner.progress || '正在准备拉片…'}</p>}
      {failure && <div role="alert" className="shot-analysis-error"><p>{failure}</p>{!readOnly && Boolean(node.nodeRequestId) && <button onClick={runner.query}>重新查询原任务</button>}</div>}
      {result && <details className="shot-analysis-details"><summary>{result.shots.length} 个分镜 · {alreadyInserted ? '已加入画布' : '查看拉片结果'}</summary>
        <ShotAnalysisResults result={result} readOnly={readOnly} active={runner.active} canExtract={Boolean(node.nodeAnalysisRunId)} inserted={alreadyInserted} onExtract={analysis => start(true, analysis)} onInsert={() => insertResult(result)} />
      </details>}
    </div>);
}

function formatVideoMeta(duration: number, width: number, height: number) {
  const time = Number.isFinite(duration) ? `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '';
  return [time, width && height ? `${width}×${height}` : ''].filter(Boolean).join(' · ');
}

function ShotAnalysisIcon({ kind }: { kind: string }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'reel' ? <><path d="M20.5 12a8.5 8.5 0 1 1-4.3-7.4M12 20.5h8.5M19 2v6m-3-3h6"/><circle cx="8.5" cy="9" r="1.5"/><circle cx="8.5" cy="15" r="1.5"/><circle cx="14.5" cy="14" r="1.5"/></>
      : kind === 'storyboard' ? <><rect x="8" y="3" width="8" height="8" rx="3"/><rect x="3" y="12" width="8" height="8" rx="3"/><rect x="13" y="12" width="8" height="8" rx="3"/></>
      : kind === 'motion' ? <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4M17 9h4m-4 6h4"/></>
      : <path d="M4 10v4m4-7v10m4-13v16m4-12v8m4-5v2"/>}
  </svg>;
}

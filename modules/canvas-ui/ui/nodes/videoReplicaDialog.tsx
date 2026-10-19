import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Clapperboard, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { activateModal } from '../../../kernel/ui/modalFocus';
import { VIDEO_REPLICA_RATIOS, VIDEO_REPLICA_RESOLUTIONS, type VideoReplicaResult, type VideoReplicaSettings, type VideoReplicaPlan, type ReplicaReplacement } from '../../../contracts/videoReplica.js';

type Step = 'analysis' | 'assets' | 'plan';
interface Props {
  result: VideoReplicaResult; step: Step; settings: VideoReplicaSettings; plan?: VideoReplicaPlan;
  readOnly: boolean; busy: boolean; uploading: string; error: string; created: boolean;
  onStep(step: Step): void; onClose(): void; onSettings(settings: VideoReplicaSettings): void;
  onUpload(file: File | undefined, assetId: string): void; onPlan(): void; onInsert(generate: boolean): void;
  onEditPlan(plan: VideoReplicaPlan): void;
}
const kinds = { character: '角色', scene: '场景', element: '元素' };
export function VideoReplicaDialog(props: Props) {
  const root = useRef<HTMLDivElement>(null), close = useRef(props.onClose), titleId = useId(); close.current = props.onClose;
  useEffect(() => { if (root.current) return activateModal(root.current, () => close.current()); }, []);
  const { result, step, readOnly, busy, onStep, onClose } = props;
  return createPortal(<div className="replica-backdrop" onPointerDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
    onWheel={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} className="replica-dialog">
      <header className="replica-dialog-header"><div><Clapperboard size={22}/><h2 id={titleId}>视频复刻</h2><span>从灵感到新作品</span></div><button aria-label="关闭视频复刻" onClick={onClose}><X size={20}/></button></header>
      <nav className="replica-tabs" aria-label="复刻步骤">{([['analysis', '分镜分析'], ['assets', '资产替换'], ['plan', '复刻计划']] as const).map(([key, label], i) =>
        <button key={key} aria-current={step === key ? 'step' : undefined} onClick={() => onStep(key)}><span>{i + 1}</span>{label}</button>)}</nav>
      <div className="replica-dialog-body">
        {step === 'analysis' ? <ReplicaAnalysis {...props}/> : step === 'assets' ? <ReplicaAssets {...props}/> : <ReplicaPlan {...props}/>}
      </div>
      {props.error && <div className="shot-analysis-error replica-dialog-error" role="alert">{props.error}</div>}
      {busy && <p className="replica-dialog-status" role="status"><LoaderCircle size={14} className="animate-spin"/>{props.uploading ? '正在上传素材…' : '正在处理分镜…'}</p>}
      <footer className="replica-dialog-footer"><span>{result.shots.length} 个分镜 · {result.assets.length} 个资产{readOnly ? ' · 仅查看' : ''}</span><div>
        {step === 'analysis' && <button className="replica-primary" onClick={() => onStep('assets')}>{readOnly ? '查看资产' : '下一步 · 资产替换'}<ArrowRight size={15}/></button>}
        {step === 'assets' && !readOnly && <button className="replica-primary" disabled={busy} onClick={props.onPlan}>生成复刻计划<ArrowRight size={15}/></button>}
        {step === 'plan' && !readOnly && props.plan && <>
          <button disabled={busy || props.created} onClick={() => props.onInsert(false)}>{props.created ? '已创建生成节点' : '创建节点，逐个生成'}</button>
          <button className="replica-primary" disabled={busy || props.created} onClick={() => props.onInsert(true)}><Check size={16}/>确认并全部生成</button>
        </>}
      </div></footer>
    </div>
  </div>, document.body);
}

function ReplicaAnalysis({ result }: Props) {
  return <div className="replica-analysis"><p className="replica-intro">{result.analysis.summary}</p>
    {result.analysis.audioStatus !== 'analyzed' && <p className="replica-notice">{result.analysis.audioStatus === 'silent' ? '视频无音轨。' : '未能分析声音，声音描述已留空，可直接播放参考片段试听。'}</p>}
    <div className="replica-shot-grid">{result.shots.map((shot, index) => <article className="replica-shot" key={shot.id}>
      {shot.clip ? <video controls preload="none" src={shot.clip.url} poster={shot.frames[0]?.url}/> : shot.frames[0] && <img src={shot.frames[0].url} alt={`分镜 ${index + 1}`}/>}
      <div><h3>分镜 {index + 1}<span>{shot.start.toFixed(2)}–{shot.end.toFixed(2)} 秒</span></h3><p>{shot.description}</p>
        <details><summary>镜头、动作与声音详情</summary>{[['构图', shot.framing], ['运镜', shot.camera], ['动作', shot.motion], ['对白', shot.dialogue], ['音乐', shot.music], ['音效', shot.soundEffects]].map(([label, value]) => value && <p key={label}><b>{label}：</b>{value}</p>)}</details>
        <div className="replica-tags">{result.assets.filter(asset => asset.shotIds.includes(shot.id)).map(asset => <span key={asset.id}>{kinds[asset.kind]} · {asset.name}</span>)}</div>
      </div>
    </article>)}</div>
  </div>;
}

function ReplicaAssets({ result, settings, readOnly, busy, uploading, onSettings, onUpload }: Props) {
  const [filter, setFilter] = useState<'all' | keyof typeof kinds>('all');
  const replacements = settings.replacements || {};
  const change = (id: string, value: ReplicaReplacement) => onSettings({ replacements: { ...replacements, [id]: value } });
  const assets = result.assets.filter(asset => filter === 'all' || asset.kind === filter);
  return <div className="replica-assets"><div className="replica-section-heading"><div><h3>替换资产</h3><p>上传新形象或填写替换描述；未替换的资产沿用原视频。缩略图为资产出现的原分镜参考。</p></div>
    <div className="replica-filter">{([['all', '全部'], ...Object.entries(kinds)] as Array<['all' | keyof typeof kinds, string]>).map(([key, name]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{name}</button>)}</div></div>
    {!assets.length && <div className="replica-empty">{result.assets.length ? '此分类没有资产。' : '没有识别出独立资产，可直接填写整体复刻要求。'}</div>}
    <div className="replica-asset-grid">{assets.map(asset => {
      const shot = result.shots.find(shot => asset.shotIds.includes(shot.id)), replacement = replacements[asset.id] || { description: '' };
      return <article key={asset.id} className="replica-asset"><div className="replica-asset-title"><strong>{asset.name}</strong><span>{kinds[asset.kind]}</span></div>
        <div className="replica-asset-visuals"><div>{shot?.frames[0] ? <img loading="lazy" src={shot.frames[0].url} alt={`${asset.name}原分镜参考`}/> : <Clapperboard/>}<small>原分镜参考</small></div><ArrowRight size={18}/>
          <label className="replica-replacement" aria-disabled={readOnly || busy}>
            {replacement.url ? <img src={replacement.url} alt={`${asset.name}替换图片`}/> : <ImagePlus size={26}/>}
            <small>{uploading === asset.id ? '正在上传…' : replacement.url ? '更换替换图片' : readOnly ? '未替换图片' : '上传替换图片'}</small>
            {!readOnly && <input hidden type="file" accept="image/*" disabled={busy} onChange={event => { onUpload(event.target.files?.[0], asset.id); event.target.value = ''; }}/>}
          </label>
        </div><p className="replica-asset-description">{asset.description}</p><small>出现于 {asset.shotIds.map(id => result.shots.findIndex(shot => shot.id === id) + 1).join('、')} 号分镜</small>
        <textarea aria-label={`${asset.name}替换要求`} readOnly={readOnly || busy} maxLength={2000} placeholder="填写新的形象、场景或元素要求（可选）" value={replacement.description} onChange={event => change(asset.id, { ...replacement, description: event.target.value })}/>
        {!readOnly && (replacement.url || replacement.description) && <button disabled={busy} className="replica-remove" onClick={() => change(asset.id, { description: '' })}>恢复原资产</button>}
      </article>;
    })}</div>
    <label className="replica-requirements"><strong>整体复刻要求</strong><textarea aria-label="整体复刻要求" maxLength={4000} readOnly={readOnly || busy} value={settings.requirements || ''} placeholder="例如：保持运镜和故事节奏，改为暖色电影质感，角色全程保持一致。" onChange={event => onSettings({ requirements: event.target.value })}/></label>
  </div>;
}

function ReplicaPlan({ result, settings, plan, readOnly, busy, onSettings, onPlan, onEditPlan, created }: Props) {
  return <div className="replica-plan"><div className="replica-section-heading"><div><h3>复刻生成计划</h3></div>
    <div className="replica-output-options"><label>比例<select aria-label="复刻视频比例" disabled={readOnly || busy} value={settings.aspectRatio} onChange={event => onSettings({ aspectRatio: event.target.value })}>{VIDEO_REPLICA_RATIOS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>分辨率<select aria-label="复刻视频分辨率" disabled={readOnly || busy} value={settings.resolution} onChange={event => onSettings({ resolution: event.target.value })}>{VIDEO_REPLICA_RESOLUTIONS.map(value => <option key={value}>{value}</option>)}</select></label></div></div>
    {!plan ? <div className="replica-empty">{readOnly ? '尚未保存复刻计划。' : <>请在替换资产后生成计划。设置变化时需要重新确认。<button className="replica-primary" disabled={busy} onClick={onPlan}>生成复刻计划</button></>}</div> : <>
      <div className="replica-plan-summary"><span>{plan.shots.length} 个生成任务</span><span>总输出 {plan.shots.reduce((sum, shot) => sum + shot.duration, 0)} 秒</span><span>{plan.aspectRatio} · {plan.resolution}</span>{created && <span>已加入画布</span>}</div>
      <p className="replica-notice">短分镜按模型最短 4 秒输出；长镜头已拆段。点击“确认并全部生成”会调用视频模型并产生相应费用，结果分别保存在画布节点中。</p>
      {plan.shots.map((shot, index) => {
        const reference = result.shots.find(item => item.id === shot.shotId);
        return <article className="replica-plan-shot" key={shot.shotId}><div className="replica-plan-media"><video controls preload="none" src={shot.referenceUrl} poster={reference?.frames[0]?.url}/>
          <div className="replica-plan-images">{shot.images.map(image => <img key={image.url} src={image.url} alt={`替换 ${image.name}`} title={image.name}/>)}</div></div>
          <div><h3>分镜 {index + 1}<span>{reference?.start.toFixed(2)}–{reference?.end.toFixed(2)} 秒 → 输出 {shot.duration} 秒</span></h3>
            <textarea aria-label={`分镜 ${index + 1}复刻提示词`} maxLength={20480} readOnly={readOnly || busy || created} value={shot.prompt} onChange={event => onEditPlan({ ...plan, shots: plan.shots.map((value, position) => position === index ? { ...value, prompt: event.target.value } : value) })}/>
          </div></article>;
      })}
    </>}
  </div>;
}

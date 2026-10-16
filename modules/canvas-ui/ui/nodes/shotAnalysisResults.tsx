import { useEffect, useState } from 'react';
import type { ShotAnalysisResult } from '../../../contracts/shotAnalysis.js';

export function ShotAnalysisResults({ result, readOnly, active, canExtract, inserted, onExtract, onInsert }: {
  result: ShotAnalysisResult; readOnly: boolean; active: boolean; canExtract: boolean; inserted: boolean;
  onExtract(analysis: string): void; onInsert(): void;
}) {
  const [draft, setDraft] = useState('');
  useEffect(() => { setDraft(JSON.stringify(result.analysis, null, 2)); }, [result]);
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <strong>{result.shots.length} 个分镜</strong>
      {!readOnly && !inserted && <button disabled={active} className="rounded border border-[var(--nk-border)] px-3 py-1 text-[var(--nk-text-secondary)] disabled:opacity-40" onClick={onInsert}>添加到画布</button>}
    </div>
    <p className="whitespace-pre-wrap">{result.analysis.summary}</p>
    {result.analysis.audioStatus !== 'analyzed' && <p className="text-amber-400">{result.analysis.audioStatus === 'silent' ? '源视频无音轨。' : '模型未能分析声音，声音描述留空；原声片段仍可试听。'}</p>}
    {result.shots.map((shot, index) => <details key={shot.id} className="rounded border border-[var(--nk-border)] p-2" open={index === 0}>
      <summary className="cursor-pointer">镜头 {index + 1} · {shot.start.toFixed(3)}–{shot.end.toFixed(3)} 秒</summary>
      <div className="mt-2 space-y-2">
        {shot.frames.map(frame => <figure key={frame.url}>
          <img loading="lazy" src={frame.url} alt={`镜头 ${index + 1}，${frame.time} 秒`} className="w-full rounded object-contain" />
          <figcaption>{frame.time?.toFixed(3)} 秒</figcaption>
        </figure>)}
        {shot.clip && <video controls preload="none" src={shot.clip.url} className="w-full rounded" />}
        {shot.audio && <div>原声参考（混合音轨）<audio controls preload="none" src={shot.audio.url} className="w-full" /></div>}
        {([['画面', shot.description], ['景别与构图', shot.framing], ['机位与镜头', shot.camera], ['动态', shot.motion], ['对白', shot.dialogue], ['音乐', shot.music], ['音效', shot.soundEffects]]).map(([label, value]) => value && <p key={label} className="whitespace-pre-wrap break-words"><b>{label}：</b>{value}</p>)}
      </div>
    </details>)}
    <details>
      <summary className="cursor-pointer">查看 / 调整分镜 JSON</summary>
      <p className="my-2">时间由模型估计，可校正 start、end 和 keyframes 后仅重新提取本地素材。</p>
      <textarea aria-label="分镜 JSON" readOnly={readOnly || active} value={draft} onChange={event => setDraft(event.target.value)} className="h-52 w-full rounded bg-[var(--nk-input)] p-2 font-mono text-xs" />
      {!readOnly && canExtract && <button disabled={active} className="mt-2 rounded border border-[var(--nk-border)] px-3 py-1 disabled:opacity-40" onClick={() => onExtract(draft)}>保存调整并重新提取（不调用模型）</button>}
    </details>
  </div>;
}

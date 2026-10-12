import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import * as React from 'react';
import { ArrowRight, Images, LoaderCircle, X } from 'lucide-react';
import { canvasProjectUi } from '../projectUiServices';
import { showcaseArchiveSource } from '../../../contracts/showcaseArchive.js';
import { showcaseVideoSource } from '../../../contracts/showcaseVideo.js';
import { useShowcaseVideo } from './shareShowcaseVideo';
import './shareShowcase.css';

interface ShowcaseCase {
  id: string;
  title: string;
  description: string;
  category: string;
  cover: string;
  video?: string;
  archive: string;
}

function localSharePath(value: unknown, extension: string) {
  return typeof value === 'string' && value.startsWith('/share/') &&
    !value.includes('..') && !value.includes('\\') && value.endsWith(extension) ? value : '';
}

function parseCases(value: unknown): ShowcaseCase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ShowcaseCase[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const cover = localSharePath(candidate.cover, '.png');
    const archive = showcaseArchiveSource(candidate.archive);
    if (!cover || !archive || typeof candidate.id !== 'string' || typeof candidate.title !== 'string')
      return [];
    return [{
      id: candidate.id,
      title: candidate.title,
      description: typeof candidate.description === 'string' ? candidate.description : '',
      category: typeof candidate.category === 'string' ? candidate.category : '创作案例',
      cover,
      video: showcaseVideoSource(candidate.video) || undefined,
      archive,
    }];
  });
}

function useShowcaseCases() {
  const [cases, setCases] = React.useState<ShowcaseCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    const controller = new AbortController();
    void fetch('/share/index.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new ProjectError(PROJECT_ERRORS.request, '案例列表读取失败。', { status: response.status, context: { operation: 'listShowcaseCases' } });
        return parseCases(await response.json());
      })
      .then(setCases)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '案例列表读取失败。');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return { cases, loading, error };
}

function ShowcaseDetail({ item, onClose, onPreview }: {
  item: ShowcaseCase;
  onClose(): void;
  onPreview(archive: string): Promise<void>;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const player = React.useRef<HTMLVideoElement>(null);
  const video = useShowcaseVideo(item.video);
  const [opening, setOpening] = React.useState(false);
  const [error, setError] = React.useState('');
  const [videoFailed, setVideoFailed] = React.useState(false);
  React.useEffect(() => root.current ? canvasProjectUi().activateModal(root.current, onClose) : undefined, [onClose]);
  React.useEffect(() => {
    const element = player.current;
    return () => { if (element) { element.pause(); element.removeAttribute('src'); element.load(); } };
  }, [video.url, videoFailed]);
  return (
    <div className="nako-share-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={root} className="nako-share-detail" role="dialog" aria-modal="true" aria-label={item.title}>
        <div className={`nako-share-detail-cover${video.url && !videoFailed ? ' has-video' : ''}`}>
          {video.url && !videoFailed ? (
            <video ref={player} src={video.url} poster={item.cover} controls playsInline preload="none"
              aria-label={`${item.title}视频`} onError={() => setVideoFailed(true)} />
          ) : <img src={item.cover} alt="" />}
          {video.loading && <span className="nako-share-video-status" role="status" aria-label="视频加载中">
            <LoaderCircle size={32} className="animate-spin" aria-hidden="true" />
          </span>}
          <button type="button" aria-label="关闭案例" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="nako-share-detail-body">
          <span className="nako-share-category">{item.category}</span>
          <h2>{item.title}</h2>
          <p>{item.description || '精选创作案例'}</p>
          {(videoFailed || video.error) && <p className="nako-share-error" role="alert">
            {video.error || '视频暂时无法播放，请稍后重试。'}
            <button type="button" className="nako-share-preview" onClick={() => { setVideoFailed(false); video.retry(); }}>重试播放</button>
          </p>}
          {error && <p className="nako-share-error" role="alert">{error}</p>}
          <div className="nako-share-detail-actions">
            <button type="button" className="nako-share-preview" disabled={opening} onClick={async () => {
              setOpening(true); setError('');
              try { await onPreview(item.archive); onClose(); }
              catch (cause) { setError(cause instanceof Error ? cause.message : '打开案例失败'); setOpening(false); }
            }}>
              {opening ? '正在打开…' : '查看制作过程'} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShareShowcase({ onPreview }: { onPreview(archive: string): Promise<void> }) {
  const { cases, loading, error } = useShowcaseCases();
  const [selected, setSelected] = React.useState<ShowcaseCase | null>(null);
  const close = React.useCallback(() => setSelected(null), []);
  return (
    <section className="nako-home-section nako-share-showcase" aria-labelledby="nako-share-title">
      <div className="nako-home-section-head">
        <div>
          <h2 id="nako-share-title"><Images size={17} />作品展示</h2>
          <p>从精选案例中发现新的创作方式。</p>
        </div>
      </div>
      {error ? <p className="nako-home-empty" role="alert">{error}</p> : loading ? (
        <p className="nako-home-empty" role="status">正在读取作品案例…</p>
      ) : !cases.length ? <p className="nako-home-empty">暂无作品案例</p> : (
        <div className="nako-share-grid">
          {cases.map((item) => (
            <button key={item.id} type="button" className="nako-share-card" onClick={() => setSelected(item)}>
              <span className="nako-share-card-cover">
                <img src={item.cover} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="nako-share-card-copy">
                <span className="nako-share-category">{item.category}</span>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && <ShowcaseDetail key={selected.id} item={selected} onClose={close} onPreview={onPreview} />}
    </section>
  );
}

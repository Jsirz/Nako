import { promptAssetIndex, promptAssetLabel } from '../../../agent/api/ui/prompt/promptDocument';
import type * as ReactTypes from 'react';
import { createPortal } from 'react-dom';
import { disconnectCanvasNodes, type CanvasConnectionNode } from '../canvas/canvasConnections';

export interface ConnectedAsset {
  id: string;
  type?: string;
  url?: string;
  lastFrame?: string;
  [key: string]: unknown;
}
export interface ConnectedAssetsProps {
  node: CanvasConnectionNode;
  connectedImageNodes?: ConnectedAsset[];
  disabled?: boolean;
  onUpdate(id: string, patch: Partial<CanvasConnectionNode>): void;
}
type Icon = ReactTypes.ComponentType<{ size: number; className?: string }>;
interface Components {
  ImageIcon: Icon;
  VideoIcon: Icon;
  AudioIcon: Icon;
  RemoveIcon: Icon;
}

export function CanvasConnectedAssets(
  React: Pick<typeof ReactTypes, 'createElement' | 'useState' | 'useRef' | 'useEffect'>,
  { node, connectedImageNodes = [], disabled = false, onUpdate }: ConnectedAssetsProps,
  { ImageIcon, VideoIcon, AudioIcon, RemoveIcon }: Components,
) {
  const [focused, setFocused] = React.useState<string | null>(null);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('all');
  const [hover, setHover] = React.useState<{ id: string; left: number; top: number } | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keepHover = () => clearTimeout(closeTimer.current);
  const closeHover = () => {
    keepHover();
    closeTimer.current = setTimeout(() => setHover(null), 160);
  };
  const showHover = (id: string, target: HTMLElement) => {
    keepHover();
    const box = target.getBoundingClientRect();
    const height = Math.min(300, window.innerHeight - 24);
    setHover({
      id,
      left: Math.max(12, Math.min(box.left, window.innerWidth - 252)),
      top:
        box.top >= height + 12
          ? box.top - height - 8
          : Math.max(12, Math.min(box.bottom + 8, window.innerHeight - height - 12)),
    });
  };
  React.useEffect(() => {
    const dismiss = (event?: Event) => {
      if (event?.target instanceof Element && event.target.closest('[data-nako-asset-preview]')) return;
      clearTimeout(closeTimer.current);
      setHover(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
        setPreviewId(null);
      }
    };
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('keydown', escape);
    return () => {
      clearTimeout(closeTimer.current);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  const index = promptAssetIndex(connectedImageNodes);
  const preview = previewId ? index.byId.get(previewId) : undefined;
  const hovered = hover ? index.byId.get(hover.id) : undefined;
  const assets = [...index.byId.values()].filter(
    (entry) => filter === 'all' || entry.type === filter,
  );
  const remove = (assetId: string) => {
    if (disabled) return;
    const nodes: CanvasConnectionNode[] = [
      ...connectedImageNodes.map((asset) => ({ ...asset, type: asset.type || 'Image' })),
      node,
    ];
    const updated = disconnectCanvasNodes(nodes, { childId: node.id, parentId: assetId }).find(
      (candidate) => candidate.id === node.id,
    );
    if (!updated || updated === node) return;
    const patch: Partial<CanvasConnectionNode> = { parentIds: updated.parentIds };
    for (const key of ['sourcePortIndices', 'imageMode', 'midjourneyReferenceNodeIds'] as const) {
      if (updated[key] !== node[key]) Object.assign(patch, { [key]: updated[key] });
    }
    onUpdate(node.id, patch);
  };
  return (
    <div
      data-nako-connected-asset-strip="true"
      className="mb-3 pb-3 border-b border-[var(--nk-border)] relative group/assets"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        data-nako-reference-tabs
        role="group"
        aria-label="参考素材分类"
        className="flex items-center gap-4 mb-2"
      >
        {(['all', 'image', 'video', 'audio', 'text'] as const).map((kind) => (
          <button
            type="button"
            key={kind}
            aria-pressed={filter === kind}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              setFilter(kind);
            }}
            style={{
              color: filter === kind ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
              borderBottom: filter === kind ? '2px solid var(--nk-text)' : '2px solid transparent',
              padding: '6px 0',
              fontSize: 13,
            }}
          >
            {{ all: '全部', image: '图片', video: '视频', audio: '音频', text: '文本' }[kind]}{' '}
            {kind === 'all' ? index.byId.size : index.byType[kind].length}
          </button>
        ))}
      </div>
      <div className="flex items-center min-w-0">
        <div className="flex items-center gap-2 nodrag min-w-0 flex-1">
          <div className="min-w-0 flex-1 relative">
            <div
              className="flex items-center gap-2 overflow-x-auto py-1 pr-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {assets.length ? (
                assets.map(({ asset, type: kind, number }) => {
                  const label = promptAssetLabel(kind, number);
                  const thumbnail =
                    kind === 'video'
                      ? asset.lastFrame
                      : kind === 'image' && asset.url && !asset.url.endsWith('-node-placeholder')
                        ? asset.url
                        : undefined;
                  const Placeholder =
                    kind === 'video' ? VideoIcon : kind === 'audio' ? AudioIcon : ImageIcon;
                  return (
                    <div
                      key={asset.id}
                      className="relative group/frame shrink-0"
                      draggable={false}
                      onMouseEnter={(event) => showHover(asset.id, event.currentTarget)}
                      onMouseLeave={closeHover}
                      onFocus={(event) => showHover(asset.id, event.currentTarget)}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node))
                          closeHover();
                      }}
                      onDragStart={(event) => event.preventDefault()}
                    >
                      <button
                        type="button"
                        aria-label={`插入引用${label}`}
                        disabled={disabled}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          event.currentTarget
                            .closest('[data-nako-generation-composer]')
                            ?.dispatchEvent(
                              new CustomEvent('nako:insert-prompt-reference', {
                                detail: asset.id,
                              }),
                            );
                        }}
                      >
                        {thumbnail ? (
                          <div
                            className="rounded-[10px] border border-[var(--nk-border)] overflow-hidden relative shadow-sm bg-[var(--nk-surface)]"
                            style={{ width: '64px', height: '64px' }}
                          >
                            <img
                              src={String(thumbnail)}
                              alt={label}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                            <span
                              data-nk-media-chrome
                              data-nako-connected-asset-label="true"
                              className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 bg-black/70 text-[10px] font-semibold text-[var(--nk-media-text)] text-center truncate"
                            >
                              {label}
                            </span>
                          </div>
                        ) : (
                          <div data-asset-kind={kind} className="w-16 h-16 flex flex-col items-center justify-center rounded-[10px] border border-[var(--nk-border)] bg-[var(--nk-surface)] text-[var(--nk-text-secondary)]"
                            style={kind === 'text' ? { background: '#17232f', borderColor: '#416280', color: '#b9dcff' } : undefined}>
                            {kind === 'text' ? <span aria-hidden="true" style={{ fontSize: 23, lineHeight: 1, fontWeight: 600 }}>T</span> : <Placeholder size={16} />}
                            <span className="text-[8px] font-bold leading-none mt-1">{label}</span>
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        data-nk-media-chrome
                        aria-label={`预览${label}`}
                        className="absolute top-1 left-1 w-5 h-5 rounded bg-black/70 text-[var(--nk-media-text)] text-xs opacity-0 group-hover/frame:opacity-100 focus-visible:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewId(asset.id);
                        }}
                      >
                        ↗
                      </button>
                      <button
                        type="button"
                        data-nk-media-chrome
                        aria-label={`移除引用${label}`}
                        disabled={disabled}
                        style={{ opacity: focused === asset.id ? 1 : undefined }}
                        onFocus={() => setFocused(asset.id)}
                        onBlur={() => setFocused(null)}
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(asset.id);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center opacity-0 group-hover/frame:opacity-100 focus-visible:opacity-100 transition-opacity z-10 border border-[var(--nk-border)] hover:bg-red-600"
                      >
                        <RemoveIcon size={12} className="text-[var(--nk-media-text)]" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-[10px] text-[var(--nk-text-muted)] italic px-1 flex items-center gap-1.5 h-[42px]">
                  <div className="w-8 h-8 rounded-md border border-dashed border-[var(--nk-border)] flex items-center justify-center text-[var(--nk-text-muted)]">
                    <ImageIcon size={14} />
                  </div>
                  <span>无引用素材</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {hover &&
        hovered &&
        !preview &&
        createPortal(
          <div
            role="region"
            aria-label="悬停素材预览"
            data-nako-asset-preview="hover"
            onWheel={(event) => event.stopPropagation()}
            onMouseEnter={keepHover}
            onMouseLeave={closeHover}
            onFocus={keepHover}
            onBlur={closeHover}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              left: hover.left,
              top: hover.top,
              width: 'min(240px, calc(100vw - 24px))',
              height: 'min(300px, calc(100vh - 24px))',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--nk-surface-raised)',
              border: '1px solid var(--nk-border-control)',
              fontSize: 16, lineHeight: 1.65,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'var(--nk-shadow)',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: hovered.type === 'text' ? 'block' : 'flex',
                overscrollBehavior: 'contain',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
              }}
            >
              {hovered.type === 'image' || (hovered.type === 'video' && hovered.asset.lastFrame) ? (
                <img
                  src={String(
                    hovered.type === 'image' ? hovered.asset.url : hovered.asset.lastFrame,
                  )}
                  alt={promptAssetLabel(hovered.type, hovered.number)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ display: 'block', color: 'var(--nk-text-secondary)', padding: 16, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {hovered.type === 'text'
                    ? String(hovered.asset.textContent || hovered.asset.prompt || '')
                    : promptAssetLabel(hovered.type, hovered.number)}
                </span>
              )}
            </div>
            <button
              type="button"
              style={{ padding: 10, color: 'var(--nk-text)', fontSize: 12 }}
              onClick={() => {
                setPreviewId(hover.id);
                setHover(null);
              }}
            >
              {hovered.type === 'image' ? '查看原图' : '查看素材'}
            </button>
          </div>,
          document.body,
        )}
      {preview &&
        createPortal(
          <div
            role="dialog"
            aria-label="素材预览"
            data-nako-asset-preview="expanded"
            onWheel={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              top: '10vh',
              left: '15vw',
              right: '15vw',
              zIndex: 10001,
              background: 'var(--nk-surface)',
              color: 'var(--nk-text)',
              padding: 16,
              border: '1px solid var(--nk-border)',
              borderRadius: 12,
            }}
          >
            <button type="button" onClick={() => setPreviewId(null)} style={{ float: 'right' }}>
              关闭预览
            </button>
            <div style={{ clear: 'both', maxHeight: '70vh', overflow: 'auto', overscrollBehavior: 'contain', fontSize: 16, lineHeight: 1.65 }}>
              {preview.type === 'image' ? (
                <img
                  src={preview.asset.url}
                  alt={promptAssetLabel(preview.type, preview.number)}
                  style={{ maxHeight: '65vh', maxWidth: '100%', margin: 'auto' }}
                />
              ) : preview.type === 'video' ? (
                <video
                  src={preview.asset.url}
                  controls
                  style={{ maxHeight: '65vh', maxWidth: '100%' }}
                />
              ) : preview.type === 'audio' ? (
                <audio src={preview.asset.url} controls />
              ) : (
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0, padding: '12px 4px', color: '#ddd' }}>
                  {String(preview.asset.textContent || preview.asset.prompt || '')}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

import type { Runtime } from './canvasMiniMaxNodeTypes';
import type { MiniMaxNodeState } from './useCanvasMiniMaxNodeState';
import { inputStyle, triggerStyle } from './canvasMiniMaxNodeStyles';
import { renderMiniMaxQuickMenu } from './renderMiniMaxQuickMenu';

function renderGenerationControls(React: Runtime, state: MiniMaxNodeState) {
  const { node, menu, openMenu, stop, update, settingsOpen, busy, props } = state;
  const onGenerate = props.onMiniMaxH3T2VAGenerate;
  return (
    <>
      <button
        type="button"
        aria-label="生成设置"
        aria-expanded={settingsOpen}
        onClick={() => update({ isMiniMaxSettingsOpen: !settingsOpen })}
        onPointerDown={stop}
        style={{
          width: '36px',
          height: '36px',
          display: 'grid',
          placeItems: 'center',
          ...inputStyle,
          cursor: 'pointer',
          color: settingsOpen ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        data-nako-minimax-parameter="duration"
        aria-label={'时长，当前 ' + String(node.duration ?? 5) + ' 秒'}
        aria-expanded={menu === 'duration'}
        aria-controls={'minimax-quick-menu-' + node.id}
        onClick={(event) => openMenu(event, 'duration')}
        onPointerDown={stop}
        style={{
          ...triggerStyle,
          color: menu === 'duration' ? 'var(--nk-text)' : 'var(--nk-text-muted)',
          minWidth: '32px',
          textAlign: 'right',
        }}
      >
        {String(node.duration ?? 5) + 's'}
      </button>
      <button
        type="button"
        aria-label="生成视频"
        disabled={busy}
        onClick={() => onGenerate && onGenerate(node.id)}
        onPointerDown={stop}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '9999px',
          border: '1px solid ' + (busy ? 'var(--nk-border)' : 'var(--nk-text-secondary)'),
          background: busy ? 'var(--nk-surface-raised)' : 'var(--nk-primary)',
          color: busy ? 'var(--nk-text-muted)' : 'var(--nk-on-primary)',
          display: 'grid',
          placeItems: 'center',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontSize: '22px',
          fontWeight: 700,
        }}
      >
        {busy ? '…' : '↑'}
      </button>
    </>
  );
}

export function renderMiniMaxToolbar(React: Runtime, state: MiniMaxNodeState) {
  const { node, menu, menuRoot, menuKeyDown, modeLabel, dimensions, openMenu, stop } = state;
  return (
    <div
      ref={menuRoot}
      onKeyDown={(event) => {
        if (menu) menuKeyDown(event);
      }}
      style={{
        position: 'relative',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderTop: '1px solid var(--nk-border)',
        paddingTop: '12px',
      }}
    >
      {renderMiniMaxQuickMenu(React, state)}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: '142px' }}>
        <img src="/Nako-mark-white.svg" alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
        <strong style={{ fontSize: '14px', fontWeight: 600 }}>MiniMax H3</strong>
      </div>
      <div style={{ width: '1px', height: '22px', background: 'var(--nk-border)' }} />
      <button
        type="button"
        data-nako-minimax-parameter="mode"
        aria-label={'生成模式，当前 ' + modeLabel}
        aria-expanded={menu === 'mode'}
        aria-controls={'minimax-quick-menu-' + node.id}
        onClick={(event) => openMenu(event, 'mode')}
        onPointerDown={stop}
        style={{
          ...triggerStyle,
          color: menu === 'mode' ? 'var(--nk-info)' : 'var(--nk-focus)',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        {modeLabel}
      </button>
      <button
        type="button"
        data-nako-minimax-parameter="ratio"
        aria-label={'画面比例，当前 ' + (node.aspectRatio || '16:9')}
        aria-expanded={menu === 'ratio'}
        aria-controls={'minimax-quick-menu-' + node.id}
        onClick={(event) => openMenu(event, 'ratio')}
        onPointerDown={stop}
        style={{
          ...triggerStyle,
          marginLeft: 'auto',
          color: menu === 'ratio' ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
        }}
      >
        {node.aspectRatio || '16:9'}
      </button>
      <button
        type="button"
        data-nako-minimax-parameter="resolution"
        aria-label={'像素规模，当前 ' + dimensions(node.megapixels ?? 0.2)}
        aria-expanded={menu === 'resolution'}
        aria-controls={'minimax-quick-menu-' + node.id}
        onClick={(event) => openMenu(event, 'resolution')}
        onPointerDown={stop}
        style={{
          ...triggerStyle,
          color: menu === 'resolution' ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
        }}
      >
        {dimensions(node.megapixels ?? 0.2)}
      </button>
      <button
        type="button"
        data-nako-minimax-parameter="audio"
        aria-label="音频模式，当前原生音频"
        aria-expanded={menu === 'audio'}
        aria-controls={'minimax-quick-menu-' + node.id}
        onClick={(event) => openMenu(event, 'audio')}
        onPointerDown={stop}
        title="声音由提示词原生生成，无需连接音频素材"
        style={{
          ...triggerStyle,
          color: menu === 'audio' ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <React.Fragment>
            <path
              d="M11 5L6 9H3v6h3l5 4V5z"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <path
              d="M15 9a4 4 0 010 6M18 6a8 8 0 010 12"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </React.Fragment>
        </svg>
        原生音频
      </button>
      {renderGenerationControls(React, state)}
    </div>
  );
}

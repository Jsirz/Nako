import { MINIMAX_H3_DURATION, describeMiniMaxH3Duration } from '../../../asset-media/api/ui/media/minimaxH3';
import type { Runtime } from './canvasMiniMaxNodeTypes';
import type { MiniMaxNodeState } from './useCanvasMiniMaxNodeState';

function renderDurationSlider(_React: Runtime, { node, update, closeMenu }: MiniMaxNodeState) {
  const durationConfig = MINIMAX_H3_DURATION,
    seconds = Number(node.duration ?? durationConfig.defaultSeconds),
    durationInfo = describeMiniMaxH3Duration(seconds);
  return (
    <div style={{ padding: '2px 4px 4px' }}>
      <input
        type="range"
        min={durationConfig.minSeconds}
        max={durationConfig.maxSeconds}
        step={1}
        value={seconds}
        aria-label="视频时长（秒）"
        data-nako-minimax-duration="true"
        onChange={(event) => update({ duration: Number(event.target.value) })}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu(true);
            return;
          }
          const currentSeconds = Number(event.currentTarget.value);
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            update({ duration: Math.min(durationConfig.maxSeconds, currentSeconds + 1) });
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            update({ duration: Math.max(durationConfig.minSeconds, currentSeconds - 1) });
          }
        }}
        style={{ width: '100%', accentColor: 'var(--nk-focus)', cursor: 'pointer' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '8px',
          marginTop: '8px',
        }}
      >
        <span
          style={{
            color: 'var(--nk-text)',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {seconds + ' 秒'}
        </span>
        <span style={{ color: 'var(--nk-text-secondary)', fontSize: '11px', textAlign: 'right' }}>
          {durationInfo.summary}
        </span>
      </div>
      {durationInfo.warning ? (
        <div
          style={{
            marginTop: '6px',
            fontSize: '11px',
            lineHeight: 1.5,
            color: 'var(--nk-warning)',
          }}
        >
          {durationInfo.warning}
        </div>
      ) : null}
    </div>
  );
}
function renderMenuOptions(_React: Runtime, { menuOptions, currentValue, choose }: MiniMaxNodeState) {
  return (
    <div style={{ display: 'grid', gap: '4px' }}>
      {menuOptions.map((value) => {
        const selected = String(currentValue) === String(value[0]);
        return (
          <button
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            onClick={() => choose(value[0])}
            key={String(value[0])}
            style={{
              width: '100%',
              minHeight: '34px',
              display: 'flex',
              alignItems: value[2] ? 'flex-start' : 'center',
              gap: '9px',
              padding: value[2] ? '9px 10px' : '0 10px',
              border: 0,
              borderRadius: '7px',
              background: selected ? 'var(--nk-surface-raised)' : 'transparent',
              color: selected ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
              fontSize: '12px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                flex: 'none',
                marginTop: value[2] ? '5px' : '0',
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                background: selected ? 'var(--nk-focus)' : 'transparent',
                boxShadow: selected ? '0 0 0 3px rgba(96,165,250,.14)' : 'none',
              }}
            />
            {value[2] ? (
              <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: selected ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
                  }}
                >
                  {value[1]}
                </span>
                <span style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--nk-text-muted)' }}>
                  {value[2]}
                </span>
              </span>
            ) : (
              <span>{value[1]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
export function renderMiniMaxQuickMenu(React: Runtime, state: MiniMaxNodeState) {
  const { menu, node, stop, menuKeyDown, closeMenu } = state;
  if (!menu) return null;
  const labels = {
    mode: ['生成模式菜单', '生成方式'],
    ratio: ['画面比例菜单', '画面比例'],
    resolution: ['像素规模菜单', '像素规模'],
    audio: ['音频模式菜单', '音频模式'],
    duration: ['时长菜单', '视频时长'],
  };
  return (
    <div
      id={'minimax-quick-menu-' + node.id}
      role="menu"
      aria-label={labels[menu][0]}
      onPointerDown={stop}
      onKeyDown={menuKeyDown}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          closeMenu();
      }}
      style={{
        position: 'absolute',
        right: '58px',
        bottom: '58px',
        zIndex: 30,
        width: menu === 'audio' || menu === 'mode' ? '304px' : '252px',
        padding: '10px',
        background: 'var(--nk-surface)',
        border: '1px solid var(--nk-border-control)',
        borderRadius: '10px',
        boxShadow: 'var(--nk-shadow)',
      }}
    >
      <div
        style={{
          padding: '2px 4px 9px',
          color: 'var(--nk-text-muted)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {labels[menu][1]}
      </div>
      {menu === 'duration' ? (
        renderDurationSlider(React, state)
      ) : menu === 'audio' ? (
        <button
          type="button"
          role="menuitemradio"
          aria-checked={true}
          onClick={() => closeMenu(true)}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '5px',
            padding: '10px',
            border: '1px solid var(--nk-border)',
            borderRadius: '8px',
            background: 'var(--nk-surface-raised)',
            color: 'var(--nk-text)',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <strong style={{ fontSize: '13px', fontWeight: 600 }}>原生音频</strong>
          <span style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--nk-text-secondary)' }}>
            声音随画面同步生成，无需额外连接音频素材。
          </span>
        </button>
      ) : (
        renderMenuOptions(React, state)
      )}
    </div>
  );
}

import { MINIMAX_H3_DURATION } from '../../../asset-media/api/ui/media/minimaxH3';
import type { Components, Runtime } from './canvasMiniMaxNodeTypes';
import type { MiniMaxNodeState } from './useCanvasMiniMaxNodeState';
import { settingControlStyle, settingLabelStyle } from './canvasMiniMaxNodeStyles';
import { renderMiniMaxToolbar } from './renderMiniMaxToolbar';

export function renderMiniMaxPreview(React: Runtime, state: MiniMaxNodeState) {
  const { node, ports, connectInput, connectOutput, props } = state;
  return (
    <div
      data-nako-minimax-preview="true"
      style={{
        position: 'relative',
        height: '402px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 32px 16px',
      }}
    >
      {ports.map((value) => (
        <div
          key={value.id}
          style={{
            position: 'absolute',
            left: 'calc(50% - 262px)',
            top: value.y + 'px',
            transform: 'translateY(-50%)',
            zIndex: 12,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            type="button"
            aria-label={'连接' + value.label}
            data-nako-connector-node-id={node.id}
            data-nako-connector-side="left"
            data-nako-connector-port-index={value.portIndex}
            onPointerDown={(event) => connectInput(event, value.portIndex)}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '9999px',
              border: '1px solid ' + (value.connected > 0 ? 'var(--nk-focus)' : 'var(--nk-border)'),
              background: 'var(--nk-input)',
              color: value.connected > 0 ? 'var(--nk-info)' : 'var(--nk-text-secondary)',
              fontSize: '30px',
              fontWeight: 300,
              lineHeight: '38px',
              cursor: 'crosshair',
            }}
          >
            +
          </button>
          <span style={{
            position: 'absolute',
            right: '50px',
            color: value.connected > 0 ? 'var(--nk-text-secondary)' : 'var(--nk-text-muted)',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {value.label + (value.maximum > 1 && value.connected > 0 ? ` ${value.connected}/${value.maximum}` : '')}
          </span>
        </div>
      ))}
      <div style={{
        width: '438px',
        height: '352px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--nk-surface)',
        border: '1px solid var(--nk-border)',
        borderRadius: '12px',
        boxShadow: props.selected ? '0 0 0 2px var(--nk-focus)' : 'none',
      }}>
        <svg
          width={58}
          height={58}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ color: 'var(--nk-text-muted)' }}
        >
          <React.Fragment>
            <rect x={3} y={5} width={18} height={14} rx={2} stroke="currentColor" strokeWidth={2} />
            <path
              d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"
              stroke="currentColor"
              strokeWidth={2}
            />
          </React.Fragment>
        </svg>
      </div>
      <button
        type="button"
        aria-label="连接输出视频"
        data-nako-connector-node-id={node.id}
        data-nako-connector-side="right"
        onPointerDown={connectOutput}
        style={{
          position: 'absolute',
          right: 'calc(50% - 262px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '42px',
          height: '42px',
          borderRadius: '9999px',
          border: '1px solid var(--nk-border)',
          background: 'var(--nk-input)',
          color: 'var(--nk-text-secondary)',
          fontSize: '30px',
          fontWeight: 300,
          lineHeight: '38px',
          cursor: 'crosshair',
        }}
      >
        +
      </button>
    </div>
  );
}
function renderMiniMaxPrompt(_React: Runtime, state: MiniMaxNodeState, { PromptEditor }: Components) {
  const { node, prompt, update, connectedNodes, stop, focusPrompt } = state;
  const count = (connectedNodes || []).filter(Boolean).length;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
      }}
    >
      <label
        htmlFor={'minimax-prompt-' + node.id}
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        提示词
      </label>
      <div
        id={'minimax-prompt-' + node.id}
        aria-label="提示词"
        data-nako-minimax-prompt-surface="true"
        style={{
          position: 'relative',
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          padding: '10px 12px',
          cursor: 'text',
        }}
        onPointerDown={stop}
        onClick={focusPrompt}
      >
        <PromptEditor
          value={prompt}
          onChange={(value) => update({ inlinePrompt: value })}
          connectedAssets={(connectedNodes || []).filter(
            (value) =>
              value.type === 'Text' ||
              value.type === 'Image' ||
              value.type === 'Upload Image' ||
              value.type === 'Video' ||
              value.type === 'Upload Video' ||
              value.type === 'Audio' ||
              value.type === 'Upload Audio',
          )}
          placeholder="输入提示词，按 @ 引用已连接素材"
          type="video"
          isDark={true}
        />
      </div>
      <div
        style={{
          order: -1,
          flex: 'none',
          fontSize: '11px',
          lineHeight: '16px',
          color: 'var(--nk-text-muted)',
          textAlign: 'right',
          paddingRight: '2px',
          marginBottom: count ? '6px' : '0',
        }}
      >
        {count ? `已连接 ${count} 个素材` : ''}
      </div>
    </div>
  );
}
function renderMiniMaxSettings(_React: Runtime, { node, settingsOpen, update, stop, dimensions }: MiniMaxNodeState) {
  if (!settingsOpen) return null;
  return (
    <div
      style={{
        height: '58px',
        display: 'grid',
        gridTemplateColumns: '1.25fr 1.25fr 1fr 1fr',
        gap: '8px',
        padding: '8px 0',
        borderTop: '1px solid var(--nk-border)',
      }}
    >
      <label style={settingLabelStyle}>
        画面比例
        <select
          aria-label="画面比例"
          value={node.aspectRatio || '16:9'}
          onChange={(event) => update({ aspectRatio: event.target.value })}
          onPointerDown={stop}
          style={settingControlStyle}
        >
          <option value="16:9">横屏 16:9</option>
          <option value="9:16">竖屏 9:16</option>
          <option value="1:1">方形 1:1</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
          <option value="21:9">21:9</option>
        </select>
      </label>
      <label style={settingLabelStyle}>
        像素规模
        <select
          aria-label="像素规模"
          value={String(node.megapixels ?? 0.2)}
          onChange={(event) => update({ megapixels: Number(event.target.value) })}
          onPointerDown={stop}
          style={settingControlStyle}
        >
          {[0.1, 0.2, 0.4, 0.6, 1].map((value) => (
            <option key={value} value={String(value)}>{dimensions(value)}</option>
          ))}
        </select>
      </label>
      <label style={settingLabelStyle}>
        时长
        <input
          aria-label="时长（秒）"
          type="number"
          min={MINIMAX_H3_DURATION.minSeconds}
          max={MINIMAX_H3_DURATION.maxSeconds}
          value={node.duration ?? 5}
          onChange={(event) =>
            update({
              duration: Math.min(
                MINIMAX_H3_DURATION.maxSeconds,
                Math.max(
                  MINIMAX_H3_DURATION.minSeconds,
                  Number(event.target.value) || MINIMAX_H3_DURATION.defaultSeconds,
                ),
              ),
            })
          }
          onPointerDown={stop}
          style={{ ...settingControlStyle, width: '100%' }}
        />
      </label>
      <label style={settingLabelStyle}>
        种子
        <input
          aria-label="随机种子"
          type="number"
          min={0}
          value={node.seed ?? 1}
          onChange={(event) => update({ seed: Number(event.target.value) })}
          onPointerDown={stop}
          style={{ ...settingControlStyle, width: '100%' }}
        />
      </label>
    </div>
  );
}
export function renderMiniMaxDeck(React: Runtime, state: MiniMaxNodeState, components: Components) {
  const { node } = state;
  return (
    <div
      data-nako-minimax-deck="true"
      style={{
        height: '278px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--nk-surface-raised)',
        borderTop: '1px solid var(--nk-border)',
        borderRadius: '12px 12px 8px 8px',
        padding: '18px 20px 14px',
        boxShadow: '0 -14px 40px rgba(0,0,0,.18)',
      }}
    >
      {renderMiniMaxPrompt(React, state, components)}
      {renderMiniMaxSettings(React, state)}
      {renderMiniMaxToolbar(React, state)}
      {node.status === 'error' && node.errorMessage ? (
        <div
          role="alert"
          style={{
            position: 'absolute',
            left: '20px',
            right: '76px',
            bottom: '70px',
            padding: '7px 10px',
            border: '1px solid var(--nk-danger)',
            background: 'var(--nk-danger-bg)',
            color: 'var(--nk-danger)',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          {node.errorMessage}
        </div>
      ) : null}
    </div>
  );
}

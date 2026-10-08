import type { Components, Props, Runtime } from './canvasMiniMaxNodeTypes';
import { useCanvasMiniMaxNodeState } from './useCanvasMiniMaxNodeState';
import { renderMiniMaxPreview, renderMiniMaxDeck } from './renderMiniMaxNodeBody';

export function CanvasMiniMaxNode(React: Runtime, props: Props, components: Components) {
  const state = useCanvasMiniMaxNodeState(React, props);
  const { Frame } = components;
  return (
    <Frame
      data={state.node}
      selected={props.selected}
      isBareCard={true}
      onNodePointerDown={props.onNodePointerDown}
      onContextMenu={props.onContextMenu}
      onConnectorDown={props.onConnectorDown}
      zoom={props.zoom}
      isHoveredForConnection={props.isHoveredForConnection}
      isInvalidHover={props.isInvalidHover}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <div
        data-nako-minimax-generator="true"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'transparent',
          borderRadius: '8px',
          color: 'var(--nk-text)',
          fontFamily: "Inter, 'Microsoft YaHei UI', system-ui, sans-serif",
        }}
      >
        <div style={{
          position: 'absolute',
          left: '8px',
          bottom: 'calc(100% + 10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '-.01em',
          whiteSpace: 'nowrap',
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>视频生成</span>
        </div>
        {renderMiniMaxPreview(React, state)}
        {renderMiniMaxDeck(React, state, components)}
      </div>
    </Frame>
  );
}

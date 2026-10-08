/** @jsxRuntime classic */
/** @jsx React.createElement */
import './agentActivity.css';
import './agentWorkspace.css';
import type { AgentModel, Icons, Props, Runtime } from './canvasAgentPanelTypes';
import { useCanvasAgentPanelState } from './useCanvasAgentPanelState';
import { agentPanelActions } from './agentPanelActions';
import { agentPanelWidthLimits, clampAgentPanelWidth } from './agentPanelWidth';
import { renderAgentPanelHistory, renderAgentPanelHeader, renderAgentHarnessControls } from './renderAgentPanelShell';
import { renderAgentPanelConversation } from './renderAgentPanelConversation';
import { renderAgentPanelComposer } from './renderAgentPanelComposer';

export function CanvasAgentPanel(React: Runtime, props: Props, components: Icons, models: AgentModel[]) {
  const state = useCanvasAgentPanelState(React, props, models);
  const actions = agentPanelActions(state);
  const { ImageIcon } = components;
  const { resizing, displayedWidth, viewportWidth, resizeStartX, resizeStartWidth, scroll, hasMessages } = state;
  if (!props.isOpen) return null;
  const dropHighlight = props.isDraggingNode || state.dragOver;
  return (
    <div
      data-nako-agent-panel="true"
      className={`nako-agent-workspace fixed top-0 right-0 h-full border-l flex flex-col z-40 ${resizing ? '' : 'transition-all duration-300'} ${dropHighlight ? 'border-[var(--nk-info)] border-2' : 'border-[var(--nk-border)]'}`}
      style={{
        width: `${displayedWidth}px`,
        containerType: 'inline-size',
        background: 'var(--nk-surface)',
        boxShadow: 'var(--nk-shadow)',
      }}
      onDragEnter={actions.onDragEnter}
      onDragLeave={actions.onDragLeave}
      onDragOver={actions.onDragOver}
      onDrop={actions.onDrop}
    >
      <div
        role="separator"
        tabIndex={0}
        aria-label="调整 Nako Agent 面板宽度"
        aria-orientation="vertical"
        aria-valuemin={agentPanelWidthLimits(viewportWidth).min}
        aria-valuemax={agentPanelWidthLimits(viewportWidth).max}
        aria-valuenow={displayedWidth}
        className="absolute left-0 top-0 h-full w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-cyan-500/40"
        onMouseDown={(event) => {
          event.preventDefault();
          resizeStartX.current = event.clientX;
          resizeStartWidth.current = displayedWidth;
          state.setResizing(true);
        }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const limits = agentPanelWidthLimits(viewportWidth);
          const next =
            event.key === 'Home'
              ? limits.min
              : event.key === 'End'
                ? limits.max
                : displayedWidth + (event.key === 'ArrowLeft' ? 40 : -40);
          props.onResizeWidth?.(clampAgentPanelWidth(next, viewportWidth));
        }}
        title="拖拽调整 Nako Agent 面板宽度"
      />
      {dropHighlight && (
        <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none z-10 flex items-center justify-center">
          <div className="bg-cyan-500/20 border-2 border-dashed border-cyan-400 rounded-lg px-8 py-6 text-center">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 text-cyan-400" />
            <p className="text-cyan-300 font-medium">仅支持图片参考</p>
          </div>
        </div>
      )}
      {renderAgentPanelHistory(React, state, actions, components)}
      {renderAgentPanelHeader(React, state, actions, components)}
      {renderAgentHarnessControls(React, state)}
      {renderAgentPanelConversation(React, state, components)}
      {hasMessages && scroll.showLatest && (
        <button
          type="button"
          onClick={scroll.followLatest}
          className="self-center px-3 py-1 mb-2 rounded-full bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] text-xs"
        >
          ↓ 回到最新消息
        </button>
      )}
      {renderAgentPanelComposer(React, state, actions, components)}
    </div>
  );
}

/** @jsxRuntime classic */
/** @jsx React.createElement */
import { Undo2 } from 'lucide-react';
import type { Icons, Runtime } from './canvasAgentPanelTypes';
import type { AgentPanelState } from './useCanvasAgentPanelState';
import type { AgentPanelActions } from './agentPanelActions';

function formatHistoryDate(input: string) {
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  return days === 0
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : days === 1
      ? '昨天'
      : days < 7
        ? `${days} 天前`
        : date.toLocaleDateString();
}

export function renderAgentPanelHistory(
  React: Runtime,
  state: AgentPanelState,
  actions: AgentPanelActions,
  { Tooltip, BackIcon, Spinner, ChatIcon, DeleteIcon, AddIcon }: Icons,
) {
  const { showHistory, setShowHistory, sessions, chat } = state;
  const { newChat, openHistory, removeHistory } = actions;
  if (!showHistory) return null;
  return (
    <div
      data-nako-agent-history="true"
      className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[#1a1a1a] text-[var(--nk-text)]"
    >
      <div className="flex shrink-0 items-center gap-3 px-4 py-3 border-b border-[var(--nk-border-control)]">
        <button
          type="button"
          aria-label="返回当前对话"
          onClick={() => setShowHistory(false)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]"
        >
          <BackIcon size={18} />
        </button>
        <span className="font-medium text-sm text-[var(--nk-text)]">对话历史</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {chat.isLoadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <ChatIcon className="w-12 h-12 mx-auto mb-3 text-[var(--nk-text-muted)]" />
            <p className="text-[var(--nk-text-muted)] text-sm">暂无对话历史</p>
            <p className="text-[var(--nk-text-muted)] text-xs mt-1">开始一段对话，它们会出现在这里</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => openHistory(session.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    void openHistory(session.id);
                  }
                }}
                className="w-full text-left p-3 rounded-xl transition-colors group cursor-pointer bg-[var(--nk-surface)]/50 hover:bg-[var(--nk-surface)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate text-[var(--nk-text)]"
                      title={session.topic || '新对话'}
                    >
                      {session.topic?.trim() || '新对话'}
                    </p>
                    <p className="text-xs mt-1 text-[var(--nk-text-muted)]">
                      {`${session.messageCount} 条消息 · ${formatHistoryDate(session.updatedAt || session.createdAt)}`}
                    </p>
                  </div>
                  <Tooltip text="删除对话" position="left">
                    <button
                      type="button"
                      aria-label="删除对话"
                      onClick={(event) => removeHistory(event, session.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all text-[var(--nk-text-muted)] hover:text-red-400"
                    >
                      <DeleteIcon size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 p-4 border-t border-[var(--nk-border-control)]">
        <button
          type="button"
          onClick={newChat}
          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-[var(--nk-text)] font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          <AddIcon size={16} />
          开启新对话
        </button>
      </div>
    </div>
  );
}

export function renderAgentPanelHeader(
  React: Runtime,
  state: AgentPanelState,
  { newChat }: AgentPanelActions,
  { Tooltip, AddIcon, HistoryIcon, CloseIcon }: Icons,
) {
  const { chat, hasMessages, isLoading, setShowHistory, props } = state;
  return (
    <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 py-3 border-b border-[var(--nk-border-control)]">
      <div data-nako-agent-header="true" className="flex items-center gap-3 min-w-0">
        <img src="/nako-logo.png" alt="" className="w-5 h-6 object-contain shrink-0" />
        <div className="min-w-0">
          <span className="block font-semibold text-sm truncate max-w-[180px] text-[var(--nk-text)]">
            {chat.topic || (hasMessages ? '新对话' : 'Nako Agent')}
          </span>
          {!chat.topic && !hasMessages && (
            <span
              className="block text-[9px] uppercase text-[var(--nk-text-muted)] mt-0.5"
            >
              纳科画布智能体
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {hasMessages && (
          <Tooltip text="开启新对话" position="bottom">
            <button
              type="button"
              aria-label="开启新对话"
              onClick={newChat}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]"
            >
              <AddIcon size={18} />
            </button>
          </Tooltip>
        )}
        <Tooltip text="对话历史" position="bottom">
          <button
            type="button"
            aria-label="对话历史"
            disabled={isLoading}
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]"
          >
            <HistoryIcon size={18} />
          </button>
        </Tooltip>
        {!hasMessages && state.inspirationSource && (
          <Tooltip text="返回灵感来源" position="bottom">
            <button
              type="button"
              aria-label="返回灵感来源"
              disabled={isLoading}
              onClick={() => state.setInspirationSource(null)}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)] disabled:opacity-40"
            >
              <Undo2 size={18} aria-hidden="true" />
            </button>
          </Tooltip>
        )}
        <button
          type="button"
          aria-label="收起 Nako Agent"
          title="收起 Nako Agent"
          onClick={props.onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]"
        >
          <CloseIcon size={18} />
        </button>
      </div>
    </div>
  );
}

export function renderAgentHarnessControls(React: Runtime, state: AgentPanelState) {
  const { chat, isLoading, modelId } = state;
  if (!chat.sessionId) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-2 px-6 py-2 text-xs text-[var(--nk-text-secondary)]"
      data-agent-harness-controls="true"
    >
      <label>
        对话分支{' '}
        <select
          aria-label="对话分支"
          value={chat.branch || 'main'}
          disabled={isLoading}
          onChange={(event) => void chat.switchBranch(event.target.value)}
          className="bg-[var(--nk-input)] rounded px-1 py-1"
        >
          {(chat.branches || [{ id: 'main', tipId: null }]).map((branch, index) => (
            <option key={branch.id} value={branch.id}>
              {branch.id === 'main' ? '主分支' : '分支 ' + (index + 1)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={isLoading || !modelId || !chat.messages.length}
        onClick={() => void chat.compact(modelId)}
        title="调用当前文本模型生成摘要，保留原消息和操作回执"
        className="rounded px-2 py-1 hover:bg-[var(--nk-hover)] disabled:opacity-40"
      >
        压缩上下文
      </button>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => void chat.loadSession(chat.sessionId!)}
        className="rounded px-2 py-1 hover:bg-[var(--nk-hover)] disabled:opacity-40"
      >
        刷新运行状态
      </button>
    </div>
  );
}

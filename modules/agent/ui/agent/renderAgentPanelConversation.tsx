/** @jsxRuntime classic */
/** @jsx React.createElement */
import { AgentAttachmentPreview } from './AgentAttachmentPreview';
import { AgentCanvasActions } from './AgentCanvasActions';
import { AgentTimelineActivity, AgentUnlinkedActivity } from './AgentTimelineActivity';
import type { Icons, Runtime } from './canvasAgentPanelTypes';
import type { AgentPanelState } from './useCanvasAgentPanelState';

export function renderAgentPanelConversation(
  React: Runtime,
  state: AgentPanelState,
  { Message }: Icons,
) {
  const {
    scroll, hasMessages, messages, timeline, cardControllers, knownCards, isLoading,
    props, chat, project,
  } = state;
  return (
    <div
      ref={scroll.viewportRef}
      data-empty={!hasMessages}
      data-nako-agent-scroll="true"
      className={`flex-1 min-h-0 overflow-y-auto p-6 ${!hasMessages ? 'flex flex-col' : ''}`}
    >
      <div ref={scroll.contentRef} className={!hasMessages ? 'flex-1 flex flex-col' : ''}>
        <AgentUnlinkedActivity controllers={cardControllers} knownCards={knownCards} />
        {hasMessages ? (
          <div className="space-y-1">
            {timeline.map((message) => (
              <div key={message.id} data-agent-message-id={message.id}>
                {message.content || message.media?.length ? (
                  <Message
                    role={message.role}
                    content={message.content}
                    media={message.media}
                    timestamp={message.timestamp}
                    stopped={message.stopped}
                    onLocateNode={props.onLocateNode}
                    onCreateTextNode={props.onCreateTextNode}
                    actionsDisabled={isLoading}
                  />
                ) : null}
                {message.branchable && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void chat.createBranch(message.id)}
                    title="从此回复创建分支，已执行的画布操作和预算记录不会回滚或重跑"
                    className="ml-3 text-xs text-[var(--nk-text-muted)] hover:text-[var(--nk-text)] disabled:opacity-40"
                  >
                    从此处分支
                  </button>
                )}
                {message.actions?.length ? (
                  <AgentCanvasActions
                    actions={message.actions}
                    projectId={project}
                    sessionId={chat.sessionId || ''}
                    execute={props.onCanvasAction}
                    disabled={isLoading}
                  />
                ) : null}
                <AgentTimelineActivity tools={message.tools} controllers={cardControllers} />
              </div>
            ))}
            {isLoading && (
              <div className="af-agent-activity" role="status" aria-live="polite">
                <span className="af-agent-activity-grid" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, index) => (
                    <i key={index} style={{ animationDelay: `${index * 90}ms` }} />
                  ))}
                </span>
                <span>{messages.at(-1)?.content ? '正在回复…' : '正在准备回复…'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full mx-auto" style={{ maxWidth: 760 }}>
            <div data-nako-agent-intro="true" className="mb-6">
              <div
                className="text-[10px] font-semibold uppercase text-[var(--nk-text-muted)] mb-3"
                style={{ letterSpacing: '.22em' }}
              >
                Nako AGENT · CANVAS INTELLIGENCE
              </div>
              <p className="text-[var(--nk-text-secondary)] text-sm mb-2 break-words">
                {state.props.userName?.trim() ? `你好，${state.props.userName.trim()}` : '你好'}
              </p>
              <h1 className="text-2xl font-bold mb-2 text-[var(--nk-text)]">今天一起创作点什么？</h1>
              <p className="nako-agent-intro-note">让灵感成为画面，让想法连接成作品。</p>
            </div>
            <div className="nako-agent-suggestions" aria-label="对话建议">
              {[
                {
                  title: '打磨一个创意',
                  description: '从灵感出发，整理成可用的提示词',
                  prompt: '帮我打磨一个创意，先问我想表达的主题和风格，再整理成图像提示词。',
                },
                {
                  title: '规划一段故事',
                  description: '梳理叙事节奏，构思分镜与画面',
                  prompt: '我想创作一段故事，请先和我讨论主题，再帮我规划分镜和画面。',
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.title}
                  disabled={isLoading}
                  onClick={() => {
                    state.setPrompt(item.prompt);
                    state.composerRef.current?.focus();
                  }}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div data-nako-agent-conversation-content="true" />
        {chat.runStatus && (
          <p
            role="status"
            data-agent-run-status="true"
            className="my-2 text-xs text-[var(--nk-text-muted)]"
          >
            {{
              running: '正在处理',
              compacting: '正在压缩上下文',
              'awaiting-authorization': '请在对应消息的操作卡中确认',
              completed: '本轮完成',
              aborted: '已停止',
              failed: '本轮失败',
              interrupted: '上次运行已中断，操作不会自动重试',
            }[chat.runStatus] || ''}
          </p>
        )}
      </div>
    </div>
  );
}

export function renderAgentPanelAttachments(React: Runtime, state: AgentPanelState) {
  const { attachments, references, isLoading } = state;
  return (
    <>
      {references.length > 0 && (
        <div
          aria-label="待发送附件"
          data-nk-media-chrome="true"
          className="flex gap-1.5 mb-2 overflow-x-auto py-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {references.map((reference, index) => (
            <div
              className="relative shrink-0 w-10 h-10 rounded-md overflow-hidden bg-[var(--nk-media-bg)]"
              key={reference.nodeId}
            >
              <AgentAttachmentPreview type={reference.type} url={reference.url} index={index + 1} />
              <span className="pointer-events-none absolute bottom-0 left-0 rounded-tr bg-[var(--nk-media-overlay)] px-1 text-[8px] leading-3 text-[var(--nk-media-text)]">
                {reference.type === 'video' ? '视频' : reference.type === 'audio' ? '音频' : '图'} {index + 1}
              </span>
              <button
                type="button"
                aria-label={`移除附件 ${index + 1}`}
                onClick={() => attachments.remove(reference.nodeId)}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-[var(--nk-media-overlay)] hover:bg-red-500 rounded-full flex items-center justify-center text-[var(--nk-media-text)] text-[10px]"
              >
                {'×'}
              </button>
            </div>
          ))}
        </div>
      )}
      {attachments.documents.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {attachments.documents.map((document) => (
            <span
              key={document.id}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--nk-border-control)] px-2 py-1 text-xs text-[var(--nk-text-secondary)]"
            >
              <span>{document.name} · {document.text.length.toLocaleString()} 字符</span>
              <button
                type="button"
                aria-label={`移除文档 ${document.name}`}
                disabled={isLoading}
                onClick={() => attachments.removeDocument(document.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}

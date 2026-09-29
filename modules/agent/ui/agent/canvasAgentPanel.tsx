import { browserHost } from '../../../kernel/browser';
import { type DefaultModelsClient } from '../../../contracts/defaultModels.js';
import { agentVisionHints, type AgentVision } from './agentVision';
/** @jsxRuntime classic */
/** @jsx React.createElement */
import type { CanvasComponent } from '../../../canvas-ui/api/ui/app/canvasComponentType';
import type * as ReactTypes from 'react';
import { useEffectEvent } from 'react';
import './agentActivity.css';
import './agentWorkspace.css';
import { useCanvasAgentChat } from './canvasAgentChat';
import { useAgentScroll } from './useAgentScroll';
import { useCanvasAgentReferences } from './canvasAgentReferenceState';
import type { AgentNode } from './agentClient';
import { installAgentModelAvailability } from '../../../generation-core/api/ui/generation/agentModelAvailability';
import { createSourceSettingsClient } from '../../../generation-core/api/ui/generation/sourceSettingsClient';
import type { CanvasProjectControl } from './canvasProjectControl';
import type { CanvasProductControl } from './canvasProductControl';
import type { CanvasBudgetControl } from './canvasBudgetControl';
import type { CanvasCreationControl } from './canvasCreationControl';
import { AgentCanvasActions } from './AgentCanvasActions';
import type { CanvasActionHandler } from '../../../contracts/canvasControlProtocol.js';
import { useAgentWorkspace, type AgentWorkspace } from './agentWorkspace';
import { AgentModelMenu } from './AgentModelMenu';
import { AgentAttachmentPreview } from './AgentAttachmentPreview';
import { agentPanelWidthLimits, clampAgentPanelWidth } from './agentPanelWidth';
import { agentDocumentAccept } from '../../../contracts/shared/agentDocumentFormats.js';
import { agentMessageWithDocuments } from './agentDocuments';
import { agentThinking, isThinkingParameter } from './agentThinking';
import { AgentConversationOptions } from './AgentConversationOptions';
import { withGenerationApproval } from './agentGenerationApproval';
import {
  AgentTimelineActivity,
  AgentUnlinkedActivity,
  timelineActivities,
} from './AgentTimelineActivity';
type Runtime = Pick<
  typeof ReactTypes,
  | 'createElement'
  | 'Fragment'
  | 'useState'
  | 'useEffect'
  | 'useRef'
  | 'useMemo'
  | 'useSyncExternalStore'
  | 'useLayoutEffect'
>;
interface Parameter {
  key: string;
  label: string;
  type: string;
  default?: string | number | boolean;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string | number }>;
}
interface AgentModel {
  vision?: AgentVision;
  id: string;
  label: string;
  advancedParams: Parameter[];
}
interface Props {
  isOpen: boolean;
  onClose(): void;
  userName?: string;
  isDraggingNode?: boolean;
  panelWidth?: number;
  onResizeWidth?(width: number): void;
  nodes?: AgentNode[];
  selectedReferenceNodes?: Array<{
    nodeId: string;
    url: string;
    type?: 'image' | 'video' | 'audio';
  }>;
  onLocateNode?(id: string): void;
  projectId?: string;
  selectedNodeIds?: string[];
  onCreateTextNode?(text: string): string;
  onCanvasAction?: CanvasActionHandler;
  canvasCreation?: CanvasCreationControl;
  canvasProjects?: CanvasProjectControl;
  canvasBudgets?: CanvasBudgetControl;
  canvasProducts?: CanvasProductControl;
}
type Icons = Record<
  | 'Tooltip'
  | 'Message'
  | 'ImageIcon'
  | 'BackIcon'
  | 'Spinner'
  | 'HistoryIcon'
  | 'DeleteIcon'
  | 'AddIcon'
  | 'CloseIcon'
  | 'UploadIcon'
  | 'ChatIcon'
  | 'SettingsIcon'
  | 'ChevronIcon'
  | 'SendIcon',
  CanvasComponent
>;
const EMPTY_NODES: AgentNode[] = [];
const EMPTY_REFERENCES: Array<{ nodeId: string; url: string; type?: 'image' | 'video' | 'audio' }> =
  [];
export function CanvasAgentPanel(
  React: Runtime,
  {
    isOpen,
    onClose,
    userName = '',
    isDraggingNode = false,
    panelWidth = 400,
    onResizeWidth,
    nodes = EMPTY_NODES,
    selectedReferenceNodes = EMPTY_REFERENCES,
    onLocateNode,
    projectId,
    selectedNodeIds,
    onCreateTextNode,
    onCanvasAction,
    canvasCreation,
    canvasProjects,
    canvasBudgets,
    canvasProducts,
  }: Props,
  components: Icons,
  models: AgentModel[],
) {
  const {
    Tooltip,
    Message,
    ImageIcon,
    BackIcon,
    Spinner,
    HistoryIcon,
    DeleteIcon,
    AddIcon,
    CloseIcon,
    ChatIcon,
    SettingsIcon,
    ChevronIcon,
    SendIcon,
  } = components;
  const [draftId] = React.useState(() => `draft-${crypto.randomUUID()}`);
  const project = projectId || draftId;
  const workspace = useAgentWorkspace(project);
  const flushWorkspace = workspace.flush;
  const epoch = React.useRef(0);
  const approvalScope = React.useRef({ active: false, direct: false, project });
  React.useLayoutEffect(() => {
    approvalScope.current = {
      active: isOpen && workspace.ready,
      direct: workspace.value.generationApproval === 'direct',
      project,
    };
    return () => {
      approvalScope.current.active = false;
    };
  }, [isOpen, workspace.ready, workspace.value.generationApproval, project]);
  const executeAction = React.useMemo(
    () =>
      onCanvasAction &&
      withGenerationApproval(onCanvasAction, canvasCreation, (request) => {
        const owner = epoch.current;
        const permitted = () =>
          approvalScope.current.active &&
          approvalScope.current.direct &&
          approvalScope.current.project === request.projectId &&
          Date.now() < request.expiresAt;
        const granted = permitted();
        return () => granted && owner === epoch.current && permitted();
      }),
    [onCanvasAction, canvasCreation],
  );
  const { prompt, modelId: selectedModelId, excludedNodes } = workspace.value;
  const defaults = browserHost.services.optional<DefaultModelsClient>('generation.defaults');
  const [, setDefaultsVersion] = React.useState(0);
  React.useEffect(
    () => defaults?.subscribe(() => setDefaultsVersion((value) => value + 1)),
    [defaults],
  );
  const modelId = selectedModelId || defaults?.get('text') || '';
  const chat = useCanvasAgentChat(React, isOpen && workspace.ready, {
    projectId: project,
    execute: executeAction || (() => ({ ok: false, code: 'UNAVAILABLE' })),
  });
  const setField = <K extends keyof AgentWorkspace>(
    key: K,
    next: AgentWorkspace[K] | ((current: AgentWorkspace[K]) => AgentWorkspace[K]),
  ) => {
    workspace.patch({ [key]: typeof next === 'function' ? next(workspace.value[key]) : next });
  };
  const setPrompt = (next: string) => setField('prompt', next);
  const setModelId = (next: string | ((current: string) => string)) => setField('modelId', next);
  const setExcludedNodes = (next: string[] | ((current: string[]) => string[])) =>
    setField('excludedNodes', next);
  const restoring = React.useRef(false);
  const restoreWorkspace = useEffectEvent(async (alive: () => boolean) => {
    restoring.current = true;
    const saved = workspace.value;
    if (saved.apiSessionId) await chat.loadSession(saved.apiSessionId);
    if (alive()) restoring.current = false;
  });
  React.useEffect(() => {
    if (!isOpen || !workspace.ready) return;
    let alive = true;
    void restoreWorkspace(() => alive);
    return () => {
      alive = false;
      restoring.current = false;
    };
  }, [project, isOpen, workspace.ready]);
  const persistApiSession = useEffectEvent(() => {
    if (
      workspace.ready &&
      !restoring.current &&
      chat.sessionId &&
      chat.sessionId !== workspace.value.apiSessionId
    )
      workspace.patch({ apiSessionId: chat.sessionId });
  });
  React.useEffect(() => {
    persistApiSession();
  }, [workspace.ready, chat.sessionId]);
  const attachments = useCanvasAgentReferences(React, isOpen, selectedReferenceNodes, projectId);
  const { references } = attachments;
  const [dragOver, setDragOver] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [modelParams, setModelParams] = React.useState<
    Record<string, string | number | boolean | undefined>
  >({});
  const [showModelMenu, setShowModelMenu] = React.useState(false);
  const [showParams, setShowParams] = React.useState(false);
  const [resizing, setResizing] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth);
  const displayedWidth = clampAgentPanelWidth(panelWidth, viewportWidth);
  React.useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const [, setAvailabilityVersion] = React.useState(0);
  const availability = React.useMemo(
    () => installAgentModelAvailability(createSourceSettingsClient()),
    [],
  );
  const availableModels = availability.filter(models);
  const activeModel = availableModels.find((model) => model.id === modelId);
  const thinking = agentThinking(activeModel?.advancedParams || [], workspace.value);
  const effectiveModelParams = { ...modelParams, ...thinking.params };
  const advancedParams =
    activeModel?.advancedParams.filter((p) => !isThinkingParameter(p.key)) || [];
  const selectedVision = activeModel?.vision ?? 'unknown';
  const referencedNodes = nodes.filter(
    (node) =>
      !excludedNodes.includes(node.id) &&
      (selectedNodeIds?.includes(node.id) || references.some((ref) => ref.nodeId === node.id)),
  );
  const isLoading = !workspace.ready || chat.isLoading || attachments.pending;
  const error = chat.error;
  const messages = chat.messages;
  const timeline = timelineActivities<(typeof messages)[number]>(messages);
  const cardControllers = {
    sessionId: chat.sessionId || '',
    creation: canvasCreation,
    projects: canvasProjects,
    budgets: canvasBudgets,
    products: canvasProducts,
  };
  const knownCards = [
    ...(chat.knownCards || []),
    ...timeline.flatMap((message) => message.tools?.flatMap((tool) => tool.cards) || []),
  ];
  const topic = chat.topic;
  const hasMessages = messages.length > 0;
  const scroll = useAgentScroll(chat.sessionId || '', messages, isOpen);
  const isLoadingSessions = chat.isLoadingSessions;
  const sessions = [
    ...chat.sessions.map((session) => ({
      id: String(session.id || ''),
      topic: String(session.topic || '新对话'),
      messageCount: Number(session.messageCount || 0),
      createdAt: String(session.createdAt || ''),
      updatedAt: String(session.updatedAt || ''),
    })),
  ];
  const composerRef = React.useRef<HTMLTextAreaElement>(null),
    modelMenuRef = React.useRef<HTMLDivElement>(null),
    paramsRef = React.useRef<HTMLDivElement>(null),
    fileRef = React.useRef<HTMLInputElement>(null);
  const resizeStartX = React.useRef(0),
    resizeStartWidth = React.useRef(panelWidth),
    sending = React.useRef(false);
  const syncAvailability = useEffectEvent(() => {
    setAvailabilityVersion((version) => version + 1);
  });
  React.useEffect(() => {
    if (!workspace.ready) return;
    const sync = () => syncAvailability();
    const unsubscribe = availability.subscribe(sync);
    sync();
    void availability.refresh().catch(() => {});
    return unsubscribe;
  }, [availability, models, workspace.ready]);
  React.useEffect(() => {
    const defaults: Record<string, string | number | boolean | undefined> = {};
    for (const param of activeModel?.advancedParams ?? []) defaults[param.key] = param.default;
    setModelParams(defaults);
    setShowParams(false);
  }, [activeModel]);
  React.useEffect(() => {
    if (!showModelMenu && !showParams) return;
    const outside = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) setShowModelMenu(false);
      if (!paramsRef.current?.contains(event.target as Node)) setShowParams(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModelMenu(false);
        setShowParams(false);
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [showModelMenu, showParams]);
  React.useEffect(() => {
    const invalidate = () => {
      epoch.current++;
      sending.current = false;
    };
    if (!isOpen) {
      invalidate();
      setResizing(false);
      void flushWorkspace();
    }
    return invalidate;
  }, [isOpen, flushWorkspace]);
  React.useEffect(() => {
    if (!resizing || !isOpen) return;
    const cursor = document.body.style.cursor,
      userSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (event: MouseEvent) =>
      onResizeWidth?.(
        clampAgentPanelWidth(
          resizeStartWidth.current + resizeStartX.current - event.clientX,
          window.innerWidth,
        ),
      );
    const stop = () => setResizing(false);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
    window.addEventListener('blur', stop);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
      window.removeEventListener('blur', stop);
      if (document.body.style.cursor === 'col-resize') document.body.style.cursor = cursor;
      if (document.body.style.userSelect === 'none') document.body.style.userSelect = userSelect;
    };
  }, [resizing, isOpen, onResizeWidth]);
  const onDragEnter = (event: ReactTypes.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (event: ReactTypes.DragEvent) => {
    event.preventDefault();
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      setDragOver(false);
  };
  const onDragOver = (event: ReactTypes.DragEvent) => event.preventDefault();
  const onDrop = (event: ReactTypes.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (isLoading) return;
    try {
      const value = JSON.parse(event.dataTransfer.getData('application/json'));
      if (
        ['image', 'video', 'audio'].includes(value?.type) &&
        typeof value.url === 'string' &&
        typeof value.nodeId === 'string'
      )
        attachments.add({ type: value.type, url: value.url, nodeId: value.nodeId });
    } catch {
      /* Unrelated browser drags do not contain a canvas reference. */
    }
  };
  const removeReference = attachments.remove;
  const chooseFile = () => {
    if (!isLoading) fileRef.current?.click();
  };
  const onFileChange = (event: ReactTypes.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!isLoading) void attachments.readFiles(files);
  };
  const submit = async () => {
    if (
      sending.current ||
      isLoading ||
      !modelId ||
      (!prompt.trim() && !attachments.documents.length && !references.length)
    )
      return;
    sending.current = true;
    const owner = epoch.current;
    try {
      if (!(await workspace.flush()) || owner !== epoch.current) return;
      const media = await attachments.prepare();
      if (!media || owner !== epoch.current) return;
      const message = agentMessageWithDocuments(prompt, attachments.documents);
      setPrompt('');
      scroll.followLatest();
      attachments.clear();
      if (composerRef.current) composerRef.current.style.height = 'auto';
      // The model only needs the nodes explicitly referenced by the user (or
      // currently selected). Sending the complete canvas here made an upload
      // of a single image carry every node's prompt and metadata into the
      // request, which could trip the context guard before the model ran.
      await chat.sendMessage(message, media, modelId, effectiveModelParams, referencedNodes);
    } finally {
      if (owner === epoch.current) sending.current = false;
    }
  };
  const newChat = () => {
    epoch.current++;
    sending.current = false;
    chat.startNewChat();
    setExcludedNodes(nodes.map((node) => node.id));
    attachments.clear();
    setPrompt('');
    setShowHistory(false);
  };
  const openHistory = async (id: string) => {
    epoch.current++;
    sending.current = false;
    const owner = epoch.current;
    attachments.cancel();
    await chat.loadSession(id);
    if (owner !== epoch.current) return;
    setShowHistory(false);
  };
  const removeHistory = (event: ReactTypes.MouseEvent, id: string) => {
    event.stopPropagation();
    epoch.current++;
    sending.current = false;
    attachments.cancel();
    void chat.deleteSession(id).then((deleted) => {
      if (deleted && workspace.value.apiSessionId === id) workspace.patch({ apiSessionId: '' });
    });
  };
  const formatHistoryDate = (input: string) => {
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
  };
  if (!isOpen) return null;
  const dropHighlight = isDraggingNode || dragOver;

  return (
    <div
      data-nako-agent-panel={'true'}
      className={`nako-agent-workspace fixed top-0 right-0 h-full border-l flex flex-col z-40 ${resizing ? '' : 'transition-all duration-300'} ${dropHighlight ? 'border-[var(--nk-info)] border-2' : 'border-[var(--nk-border)]'}`}
      style={{
        width: `${displayedWidth}px`,
        containerType: 'inline-size',
        background: 'var(--nk-surface)',
        boxShadow: 'var(--nk-shadow)',
      }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        role="separator"
        tabIndex={0}
        aria-label="调整 Nako Agent 面板宽度"
        aria-orientation="vertical"
        aria-valuemin={agentPanelWidthLimits(viewportWidth).min}
        aria-valuemax={agentPanelWidthLimits(viewportWidth).max}
        aria-valuenow={displayedWidth}
        className={
          'absolute left-0 top-0 h-full w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-cyan-500/40'
        }
        onMouseDown={(me) => {
          me.preventDefault();
          resizeStartX.current = me.clientX;
          resizeStartWidth.current = displayedWidth;
          setResizing(true);
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
          onResizeWidth?.(clampAgentPanelWidth(next, viewportWidth));
        }}
        title={'拖拽调整 Nako Agent 面板宽度'}
      />
      {dropHighlight && (
        <div
          className={
            'absolute inset-0 bg-cyan-500/10 pointer-events-none z-10 flex items-center justify-center'
          }
        >
          <div
            className={
              'bg-cyan-500/20 border-2 border-dashed border-cyan-400 rounded-lg px-8 py-6 text-center'
            }
          >
            <ImageIcon className={'w-10 h-10 mx-auto mb-2 text-cyan-400'} />
            <p className={'text-cyan-300 font-medium'}>{'仅支持图片参考'}</p>
          </div>
        </div>
      )}
      {showHistory && (
        <div
          data-nako-agent-history="true"
          className={
            'absolute inset-0 z-30 flex min-h-0 flex-col bg-[#1a1a1a] text-[var(--nk-text)]'
          }
        >
          <div
            className={
              'flex shrink-0 items-center gap-3 px-4 py-3 border-b border-[var(--nk-border-control)]'
            }
          >
            <button
              type="button"
              aria-label={'返回当前对话'}
              onClick={() => setShowHistory(!1)}
              className={
                'p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'
              }
            >
              <BackIcon size={18} />
            </button>
            <span className={'font-medium text-sm text-[var(--nk-text)]'}>{'对话历史'}</span>
          </div>
          <div className={'min-h-0 flex-1 overflow-y-auto p-4'}>
            {isLoadingSessions ? (
              <div className={'flex items-center justify-center py-8'}>
                <Spinner className={'w-6 h-6 text-cyan-400 animate-spin'} />
              </div>
            ) : sessions.length === 0 ? (
              <div className={'text-center py-8'}>
                <ChatIcon className={'w-12 h-12 mx-auto mb-3 text-[var(--nk-text-muted)]'} />
                <p className={'text-[var(--nk-text-muted)] text-sm'}>{'暂无对话历史'}</p>
                <p className={'text-[var(--nk-text-muted)] text-xs mt-1'}>
                  {'开始一段对话，它们会出现在这里'}
                </p>
              </div>
            ) : (
              <div className={'space-y-2'}>
                {sessions.map((me) => (
                  <div
                    onClick={() => openHistory(me.id)}
                    role={'button'}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        void openHistory(me.id);
                      }
                    }}
                    className={
                      'w-full text-left p-3 rounded-xl transition-colors group cursor-pointer bg-[var(--nk-surface)]/50 hover:bg-[var(--nk-surface)]'
                    }
                    key={me.id}
                  >
                    <div className={'flex items-start justify-between gap-2'}>
                      <div className={'flex-1 min-w-0'}>
                        <p
                          className={'text-sm font-medium truncate text-[var(--nk-text)]'}
                          title={me.topic || '新对话'}
                        >
                          {me.topic?.trim() || '新对话'}
                        </p>
                        <p className={'text-xs mt-1 text-[var(--nk-text-muted)]'}>
                          {`${me.messageCount} 条消息 · ${formatHistoryDate(me.updatedAt || me.createdAt)}`}
                        </p>
                      </div>
                      <Tooltip text={'删除对话'} position={'left'}>
                        <button
                          type="button"
                          aria-label="删除对话"
                          onClick={(Je) => removeHistory(Je, me.id)}
                          className={
                            'p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all text-[var(--nk-text-muted)] hover:text-red-400'
                          }
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
          <div className={'shrink-0 p-4 border-t border-[var(--nk-border-control)]'}>
            <button
              type="button"
              onClick={newChat}
              className={
                'w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-[var(--nk-text)] font-medium text-sm transition-colors flex items-center justify-center gap-2'
              }
            >
              <AddIcon size={16} />
              {'开启新对话'}
            </button>
          </div>
        </div>
      )}
      <div
        className={
          'relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 py-3 border-b border-[var(--nk-border-control)]'
        }
      >
        <div data-nako-agent-header={'true'} className={'flex items-center gap-3 min-w-0'}>
          <img src={'/nako-logo.png'} alt={''} className={'w-5 h-6 object-contain shrink-0'} />
          <div className={'min-w-0'}>
            <span
              className={'block font-semibold text-sm truncate max-w-[180px] text-[var(--nk-text)]'}
            >
              {topic || (hasMessages ? '新对话' : 'Nako Agent')}
            </span>
            {!topic && !hasMessages && (
              <span
                className={'block text-[9px] uppercase text-[var(--nk-text-muted)] mt-0.5'}
                style={{ letterSpacing: '.18em' }}
              >
                {'画布智能体'}
              </span>
            )}
          </div>
        </div>
        <div className={'flex shrink-0 items-center gap-1'}>
          {hasMessages && (
            <Tooltip text={'开启新对话'} position="bottom">
              <button
                type="button"
                aria-label={'开启新对话'}
                onClick={newChat}
                className={
                  'p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'
                }
              >
                <AddIcon size={18} />
              </button>
            </Tooltip>
          )}
          <Tooltip text={'对话历史'} position="bottom">
            <button
              type="button"
              aria-label={'对话历史'}
              disabled={isLoading}
              onClick={() => setShowHistory(!0)}
              className={
                'p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'
              }
            >
              <HistoryIcon size={18} />
            </button>
          </Tooltip>
          <button
            type="button"
            aria-label={'关闭 Nako Agent'}
            onClick={onClose}
            className={
              'p-1.5 rounded-lg transition-colors hover:bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'
            }
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>
      {chat.sessionId && (
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
      )}
      <div
        ref={scroll.viewportRef}
        data-empty={!hasMessages}
        data-nako-agent-scroll="true"
        className={`flex-1 min-h-0 overflow-y-auto p-6 ${!hasMessages ? 'flex flex-col' : ''}`}
      >
        <div ref={scroll.contentRef} className={!hasMessages ? 'flex-1 flex flex-col' : ''}>
          <AgentUnlinkedActivity controllers={cardControllers} knownCards={knownCards} />
          {hasMessages ? (
            <div className={'space-y-1'}>
              {timeline.map((me) => (
                <div key={me.id} data-agent-message-id={me.id}>
                  {me.content || me.media?.length ? (
                    <Message
                      role={me.role}
                      content={me.content}
                      media={me.media}
                      timestamp={me.timestamp}
                      stopped={me.stopped}
                      onLocateNode={onLocateNode}
                      onCreateTextNode={onCreateTextNode}
                      actionsDisabled={isLoading}
                    />
                  ) : null}
                  {me.branchable && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void chat.createBranch(me.id)}
                      title="从此回复创建分支，已执行的画布操作和预算记录不会回滚或重跑"
                      className="ml-3 text-xs text-[var(--nk-text-muted)] hover:text-[var(--nk-text)] disabled:opacity-40"
                    >
                      从此处分支
                    </button>
                  )}
                  {me.actions?.length ? (
                    <AgentCanvasActions
                      actions={me.actions}
                      projectId={project}
                      sessionId={chat.sessionId || ''}
                      execute={onCanvasAction}
                      disabled={isLoading}
                    />
                  ) : null}

                  <AgentTimelineActivity tools={me.tools} controllers={cardControllers} />
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
            <div className={'w-full mx-auto'} style={{ maxWidth: 760 }}>
              <div data-nako-agent-intro={'true'} className={'mb-6'}>
                <div
                  className={'text-[10px] font-semibold uppercase text-[var(--nk-text-muted)] mb-3'}
                  style={{ letterSpacing: '.22em' }}
                >
                  {'Nako AGENT · CANVAS INTELLIGENCE'}
                </div>
                <p className={'text-[var(--nk-text-secondary)] text-sm mb-2 break-words'}>
                  {userName.trim() ? `你好，${userName.trim()}` : '你好'}
                </p>
                <h1 className={'text-2xl font-bold mb-2 text-[var(--nk-text)]'}>
                  {'今天一起创作点什么？'}
                </h1>
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
                      setPrompt(item.prompt);
                      composerRef.current?.focus();
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
      {hasMessages && scroll.showLatest && (
        <button
          type="button"
          onClick={scroll.followLatest}
          className="self-center px-3 py-1 mb-2 rounded-full bg-[var(--nk-surface)] text-[var(--nk-text-secondary)] text-xs"
        >
          ↓ 回到最新消息
        </button>
      )}
      <div className={'nako-agent-compose-area p-3 shrink-0'}>
        <div data-nako-agent-skills-slot="true" />

        {workspace.error && (
          <p role="alert" className="text-xs text-[var(--nk-warning)] mb-2">
            {workspace.error}
            <button className="ml-2 underline" onClick={() => void workspace.retry()}>
              重试保存与恢复
            </button>
          </p>
        )}
        {!workspace.ready && !workspace.error && (
          <p role="status" className="text-xs text-[var(--nk-text-muted)] mb-2">
            正在恢复助手草稿…
          </p>
        )}
        {error && (
          <div role="alert" className="text-xs text-[var(--nk-warning)] mb-2 leading-5">
            {error}
          </div>
        )}
        {attachments.error && (
          <p role="alert" className="text-sm text-red-400 mb-2">
            {attachments.error}
          </p>
        )}
        {modelId && selectedVision !== 'supported' && (
          <p
            role="note"
            aria-live="polite"
            data-nako-agent-vision={selectedVision}
            className="mb-2 text-xs leading-relaxed text-[var(--nk-text-secondary)]"
          >
            {agentVisionHints[selectedVision]}
          </p>
        )}
        <div className={'nako-agent-compose-box rounded-2xl p-3 bg-[var(--nk-surface)]'}>
          {references.length > 0 && (
            <div
              aria-label="待发送附件"
              data-nk-media-chrome="true"
              className="flex gap-1.5 mb-2 overflow-x-auto py-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              {references.map((me, index) => (
                <div
                  className="relative shrink-0 w-10 h-10 rounded-md overflow-hidden bg-[var(--nk-media-bg)]"
                  key={me.nodeId}
                >
                  <AgentAttachmentPreview type={me.type} url={me.url} index={index + 1} />
                  <span className="pointer-events-none absolute bottom-0 left-0 rounded-tr bg-[var(--nk-media-overlay)] px-1 text-[8px] leading-3 text-[var(--nk-media-text)]">
                    {me.type === 'video' ? '视频' : me.type === 'audio' ? '音频' : '图'} {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`移除附件 ${index + 1}`}
                    onClick={() => removeReference(me.nodeId)}
                    className={
                      'absolute top-0.5 right-0.5 w-4 h-4 bg-[var(--nk-media-overlay)] hover:bg-red-500 rounded-full flex items-center justify-center text-[var(--nk-media-text)] text-[10px]'
                    }
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
                  <span>
                    {document.name} · {document.text.length.toLocaleString()} 字符
                  </span>
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
          <div data-nako-agent-context-slot="true" />
          <textarea
            data-nako-agent-composer={'true'}
            ref={composerRef}
            value={prompt}
            onChange={(me) => setPrompt(me.target.value)}
            placeholder={'描述目标，或输入 / 调用 SKILL'}
            className={
              'w-full bg-transparent text-sm outline-none mb-2 resize-none min-h-[48px] max-h-[160px] text-[var(--nk-text)] placeholder:text-[var(--nk-text-muted)]'
            }
            rows={2}
            style={{ scrollbarWidth: 'none' }}
            disabled={isLoading}
            onInput={(me) => {
              const Je = me.currentTarget;
              Je.style.height = 'auto';
              const de = Math.min(Je.scrollHeight, 160);
              Je.style.height = de + 'px';
              Je.style.overflowY = Je.scrollHeight > 160 ? 'auto' : 'hidden';
            }}
            onKeyDown={(me) => {
              if (
                me.key === 'Enter' &&
                !me.shiftKey &&
                !me.nativeEvent.isComposing &&
                me.keyCode !== 229
              ) {
                me.preventDefault();
                void submit();
              }
            }}
          />
          <div className={'flex items-center justify-between gap-2'}>
            <div className={'flex flex-1 items-center gap-2 min-w-0'}>
              <input
                ref={fileRef}
                type={'file'}
                accept={`image/*,video/*,audio/*,.mkv,.flac,${agentDocumentAccept}`}
                multiple={!0}
                className={'hidden'}
                onChange={onFileChange}
              />
              <button
                type="button"
                aria-label={'上传附件（图片、音视频、Word、文本）'}
                onClick={chooseFile}
                className="nako-agent-composer-tool border border-[var(--nk-border-control)]"
                title="添加附件"
              >
                <AddIcon size={18} />
              </button>
              <AgentConversationOptions
                value={workspace.value}
                patch={workspace.patch}
                thinking={thinking}
                disabled={isLoading}
                generation={Boolean(canvasCreation)}
              />
              <div className="relative ml-auto min-w-0 flex-1 flex justify-end" ref={modelMenuRef}>
                <button
                  type="button"
                  aria-label="选择模型"
                  aria-expanded={showModelMenu}
                  disabled={isLoading}
                  onClick={() => {
                    setShowModelMenu(!showModelMenu);
                  }}
                  className={
                    'flex min-w-0 max-w-full h-8 items-center gap-1 text-[var(--nk-text-secondary)] text-xs rounded-md px-1.5 hover:bg-[var(--nk-hover)] transition-colors disabled:opacity-50'
                  }
                >
                  <span
                    className="truncate"
                    title={`${activeModel?.label || modelId || '使用默认文本模型'} · ${agentVisionHints[selectedVision]}`}
                  >
                    {selectedModelId ? activeModel?.label || selectedModelId : '默认模型'}
                  </span>
                  <ChevronIcon
                    size={12}
                    className={`shrink-0 text-[var(--nk-text-muted)] transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`}
                  />
                </button>
                {showModelMenu && (
                  <AgentModelMenu
                    models={[
                      { id: '', label: '使用默认文本模型', advancedParams: [], vision: 'unknown' },
                      ...availableModels,
                    ]}
                    selected={selectedModelId}
                    onSelect={(id) => {
                      setModelId(id);
                      setShowModelMenu(false);
                    }}
                    onServices={() => {
                      setShowModelMenu(false);
                      availability.openConnection();
                    }}
                  />
                )}
              </div>
              {advancedParams.length > 0 && (
                <div className={'relative shrink-0'} ref={paramsRef}>
                  <button
                    type="button"
                    aria-label="高级参数"
                    title="高级参数"
                    aria-expanded={showParams}
                    disabled={isLoading}
                    onClick={() => setShowParams((me) => !me)}
                    className="nako-agent-composer-tool"
                  >
                    <SettingsIcon size={16} />
                  </button>
                  {showParams && (
                    <div
                      className={
                        'absolute bottom-full right-0 mb-2 w-64 max-w-[min(calc(100vw-112px),calc(100cqw-112px))] max-h-64 overflow-y-auto bg-[var(--nk-surface)] border border-[var(--nk-border-control)] rounded-lg shadow-2xl p-2.5 z-50 space-y-2'
                      }
                    >
                      <div
                        className={
                          'text-[9px] text-[var(--nk-text-muted)] font-bold uppercase tracking-wider border-b border-[var(--nk-border-control)] pb-1'
                        }
                      >
                        {'高级参数'}
                      </div>
                      {advancedParams.map((me) => {
                        return (
                          <div className={'space-y-1'} key={me.key}>
                            <div className={'flex items-center justify-between'}>
                              <span className={'text-[11px] text-[var(--nk-text-secondary)]'}>
                                {me.label}
                              </span>
                              {me.type === 'slider' && (
                                <span className={'text-[10px] text-[var(--nk-text-secondary)]'}>
                                  {String(modelParams[me.key] ?? me.default ?? '')}
                                  {me.unit || ''}
                                </span>
                              )}
                            </div>
                            {me.type === 'toggle' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setModelParams((de) => ({
                                    ...de,
                                    [me.key]: !(de[me.key] ?? me.default),
                                  }))
                                }
                                className={`relative w-8 h-4 rounded-full transition-colors ${(modelParams[me.key] ?? me.default) ? 'bg-blue-600' : 'bg-[var(--nk-hover)]'}`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 bg-[var(--nk-primary)] rounded-full transition-transform ${(modelParams[me.key] ?? me.default) ? 'left-4' : 'left-0.5'}`}
                                />
                              </button>
                            ) : me.type === 'select' ? (
                              <div className={'flex flex-wrap gap-1'}>
                                {me.options?.map((de) => (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModelParams((He) => ({ ...He, [me.key]: de.value }))
                                    }
                                    className={`px-2 py-1 text-[10px] rounded-md ${(modelParams[me.key] ?? me.default) === de.value ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[var(--nk-hover)] text-[var(--nk-text-secondary)]'}`}
                                    key={de.value}
                                  >
                                    {de.label}
                                  </button>
                                ))}
                              </div>
                            ) : me.type === 'slider' ? (
                              <input
                                type={'range'}
                                min={me.min}
                                max={me.max}
                                value={Number(modelParams[me.key] ?? me.default ?? 0)}
                                step={me.step ?? 'any'}
                                onChange={(de) =>
                                  setModelParams((He) => ({
                                    ...He,
                                    [me.key]: Number(de.target.value),
                                  }))
                                }
                                className={
                                  'w-full h-1 bg-[var(--nk-hover)] rounded-full appearance-none cursor-pointer accent-blue-500'
                                }
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={'flex items-center gap-2'}>
              {chat.isStreaming ? (
                <button
                  aria-label="停止回答"
                  onClick={() => {
                    epoch.current++;
                    sending.current = false;
                    chat.stop();
                  }}
                  className="w-8 h-8 rounded-full bg-[var(--nk-hover)] text-[var(--nk-text)] flex items-center justify-center"
                >
                  <span className="w-3 h-3 bg-current rounded-sm" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={'发送给 Nako Agent'}
                  onClick={submit}
                  disabled={
                    isLoading ||
                    (!prompt.trim() && !attachments.documents.length && references.length === 0) ||
                    !modelId
                  }
                  className={`aspect-square w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[var(--nk-text)] ${isLoading || (!prompt.trim() && !attachments.documents.length && references.length === 0) || !modelId ? 'bg-[var(--nk-hover)] cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400'}`}
                >
                  {isLoading ? (
                    <Spinner size={16} className={'animate-spin'} />
                  ) : (
                    <SendIcon size={16} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

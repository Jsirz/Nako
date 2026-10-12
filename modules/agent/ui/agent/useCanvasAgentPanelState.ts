import { browserHost } from '../../../kernel/browser';
import type { DefaultModelsClient } from '../../../contracts/defaultModels.js';
import { useEffectEvent } from 'react';
import { installAgentModelAvailability } from '../../../generation-core/api/ui/generation/agentModelAvailability';
import { createSourceSettingsClient } from '../../../generation-core/api/ui/generation/sourceSettingsClient';
import { useCanvasAgentChat } from './canvasAgentChat';
import { useAgentScroll } from './useAgentScroll';
import { useCanvasAgentReferences } from './canvasAgentReferenceState';
import { useAgentWorkspace, type AgentWorkspace } from './agentWorkspace';
import { clampAgentPanelWidth } from './agentPanelWidth';
import { agentThinking, isThinkingParameter } from './agentThinking';
import { withGenerationApproval } from './agentGenerationApproval';
import { timelineActivities } from './AgentTimelineActivity';
import { EMPTY_NODES, EMPTY_REFERENCES, type AgentModel, type Props, type Runtime } from './canvasAgentPanelTypes';

function useAgentPanelSession(React: Runtime, props: Props) {
  const { isOpen, projectId, onCanvasAction, canvasCreation } = props;
  const [draftId] = React.useState(() => `draft-${crypto.randomUUID()}`);
  const project = projectId || draftId;
  const workspace = useAgentWorkspace(project);
  const epoch = React.useRef(0);
  const sending = React.useRef(false);
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
  return { project, workspace, epoch, sending, chat, setPrompt, setModelId, setExcludedNodes };
}

function useAgentPanelModels(
  React: Runtime,
  workspace: ReturnType<typeof useAgentWorkspace>,
  models: AgentModel[],
) {
  const selectedModelId = workspace.value.modelId;
  const defaults = browserHost.services.optional<DefaultModelsClient>('generation.defaults');
  const [, setDefaultsVersion] = React.useState(0);
  React.useEffect(
    () => defaults?.subscribe(() => setDefaultsVersion((value) => value + 1)),
    [defaults],
  );
  const [modelParams, setModelParams] = React.useState<
    Record<string, string | number | boolean | undefined>
  >({});
  const [showModelMenu, setShowModelMenu] = React.useState(false);
  const [showParams, setShowParams] = React.useState(false);
  const modelMenuRef = React.useRef<HTMLDivElement>(null);
  const paramsRef = React.useRef<HTMLDivElement>(null);
  const [, setAvailabilityVersion] = React.useState(0);
  const availability = React.useMemo(
    () => installAgentModelAvailability(createSourceSettingsClient()),
    [],
  );
  const availableModels = availability.filter(models);
  const modelId = selectedModelId || defaults?.get('text') || availableModels[0]?.id || '';
  const activeModel = availableModels.find((model) => model.id === modelId);
  const thinking = agentThinking(activeModel?.advancedParams || [], workspace.value);
  const effectiveModelParams = { ...modelParams, ...thinking.params };
  const advancedParams =
    activeModel?.advancedParams.filter((p) => !isThinkingParameter(p.key)) || [];
  const selectedVision = activeModel?.vision ?? 'unknown';
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
  return {
    selectedModelId, modelId, modelParams, setModelParams, showModelMenu, setShowModelMenu,
    showParams, setShowParams, modelMenuRef, paramsRef, availability, availableModels,
    activeModel, thinking, effectiveModelParams, advancedParams, selectedVision,
  };
}

function useAgentPanelLayout(React: Runtime, props: Props) {
  const { isOpen, panelWidth = 400, onResizeWidth } = props;
  const [resizing, setResizing] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth);
  const displayedWidth = clampAgentPanelWidth(panelWidth, viewportWidth);
  const resizeStartX = React.useRef(0);
  const resizeStartWidth = React.useRef(panelWidth);
  React.useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
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
  return { resizing, setResizing, viewportWidth, displayedWidth, resizeStartX, resizeStartWidth };
}

export function useCanvasAgentPanelState(React: Runtime, props: Props, models: AgentModel[]) {
  const { isOpen, projectId, nodes = EMPTY_NODES, selectedReferenceNodes = EMPTY_REFERENCES } = props;
  const session = useAgentPanelSession(React, props);
  const model = useAgentPanelModels(React, session.workspace, models);
  const layout = useAgentPanelLayout(React, props);
  const attachments = useCanvasAgentReferences(React, isOpen, selectedReferenceNodes, projectId);
  const { references } = attachments;
  const [dragOver, setDragOver] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [inspirationSource, setInspirationSource] = React.useState<'text' | 'image' | 'video' | 'audio' | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { workspace, chat, epoch, sending } = session;
  const flushWorkspace = workspace.flush;
  React.useEffect(() => {
    const invalidate = () => {
      epoch.current++;
      sending.current = false;
    };
    if (!isOpen) {
      invalidate();
      layout.setResizing(false);
      void flushWorkspace();
    }
    return invalidate;
  }, [isOpen, flushWorkspace]);
  const prompt = workspace.value.prompt;
  const referencedNodes = nodes.filter(
    (node) =>
      !workspace.value.excludedNodes.includes(node.id) &&
      (props.selectedNodeIds?.includes(node.id) || references.some((ref) => ref.nodeId === node.id)),
  );
  const isLoading = !workspace.ready || chat.isLoading || attachments.pending;
  const messages = chat.messages;
  const timeline = timelineActivities<(typeof messages)[number]>(messages);
  const cardControllers = {
    sessionId: chat.sessionId || '',
    creation: props.canvasCreation,
    projects: props.canvasProjects,
    budgets: props.canvasBudgets,
    products: props.canvasProducts,
  };
  const knownCards = [
    ...(chat.knownCards || []),
    ...timeline.flatMap((message) => message.tools?.flatMap((tool) => tool.cards) || []),
  ];
  const hasMessages = messages.length > 0;
  React.useEffect(() => { setInspirationSource(null); }, [isOpen, projectId, hasMessages]);
  const scroll = useAgentScroll(chat.sessionId || '', messages, isOpen);
  const sessions = chat.sessions.map((session) => ({
    id: String(session.id || ''),
    topic: String(session.topic || '新对话'),
    messageCount: Number(session.messageCount || 0),
    createdAt: String(session.createdAt || ''),
    updatedAt: String(session.updatedAt || ''),
  }));
  return {
    ...session, ...model, ...layout, props, nodes, attachments, references, dragOver, setDragOver,
    showHistory, setShowHistory, inspirationSource, setInspirationSource,
    composerRef, fileRef, prompt, referencedNodes, isLoading,
    messages, timeline, cardControllers, knownCards, hasMessages, scroll, sessions,
  };
}
export type AgentPanelState = ReturnType<typeof useCanvasAgentPanelState>;

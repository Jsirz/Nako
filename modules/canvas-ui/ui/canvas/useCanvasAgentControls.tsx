import { flushSync } from 'react-dom';
import { agentCanvas } from '../../../kernel/browser';
import type { CanvasWorkspaceBindings } from '../../../contracts/agentCanvasWorkspace';
import type { CanvasNode } from '../nodes/canvasNodeOperations';
import type { CanvasGroup } from './canvasGroups';
import { canvasError } from '../../../contracts/canvasErrors.js';
import type { ShotAnalysisInsertion, ShotAnalysisResult } from '../../../contracts/shotAnalysis.js';
import { shotAnalysisCanvas } from './shotAnalysisCanvas';
import { videoReplicaCanvas } from './videoReplicaCanvas';
import { VIDEO_REPLICA_MODEL, type VideoReplicaInsertion } from '../../../contracts/videoReplica.js';
import { modelCatalog } from '../../../kernel/browser';
import { nodeLinks, nodeOutput } from '../nodes/nodeGraphSnapshot';
import './canvasWorkspace.css';
import type { useCanvasSceneBridge } from './useCanvasSceneBridge';

export function useCanvasAgentControls(context: ReturnType<typeof useCanvasSceneBridge>) {
  const {
    React,
    getNodeWidth,
    getNodeHeight,
    mountedRef,
    view,
    readOnly,
    focusOnNodes,
    setNodes,
    getNodes,
    createAgentNode,
    configureAgentNode,
    connectAgentNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    isDraggingConnection,
    isDragging,
    isResizing,
    isSelecting,
    setGroups,
    getGroups,
    undoHistory,
    redoHistory,
    pushHistory,
    workflowId,
    getWorkflowEpoch,
    activeProjectId,
    setDirty,
    applyingDocumentRef,
  } = context;

  // History commits record edits; only explicit navigation restores a snapshot.
  const restoreHistory = (snapshot: { nodes: CanvasNode[]; groups: CanvasGroup[] } | null) => {
    if (!snapshot) return;
    applyingDocumentRef.current = true;
    setNodes(snapshot.nodes);
    setGroups(snapshot.groups);
    setDirty(true);
  };
  const undo = () => restoreHistory(undoHistory());
  const redo = () => restoreHistory(redoHistory());
  const controlRuntime = React.useRef<CanvasWorkspaceBindings['control']>(() => null);
  const documentEpoch = getWorkflowEpoch();
  const insertShotAnalysis = (input: ShotAnalysisInsertion) => {
    if (readOnly || view !== 'canvas' || !mountedRef.current || input.projectId !== workflowId || input.documentEpoch !== getWorkflowEpoch())
      throw canvasError('画布已经切换，无法写入此次拉片结果。', 'shotAnalysis.insert');
    const before = { nodes: getNodes(), groups: getGroups() };
    const source = before.nodes.find(node => node.id === input.nodeId);
    const result = (source?.pluginResult as { analysis?: ShotAnalysisResult } | undefined)?.analysis;
    if (!source || source.type !== 'shot-analysis' || source.pluginId !== 'nako.canvas-core' || !result?.id || result.id !== input.resultId)
      throw canvasError('拉片结果已变化，请等待当前任务完成。', 'shotAnalysis.insert');
    const after = shotAnalysisCanvas(source, result, input.resultId, before, { create: createAgentNode, width: getNodeWidth, height: getNodeHeight });
    if (!after.created.length) return;
    flushSync(() => {
      pushHistory(before);
      applyingDocumentRef.current = true;
      setNodes(after.nodes); setGroups(after.groups);
      pushHistory({ nodes: after.nodes, groups: after.groups }); setDirty(true);
      setSelectedNodeIds(after.created);
    });
    focusOnNodes(after.nodes, after.created);
  };
  const insertVideoReplica = (input: VideoReplicaInsertion) => {
    if (readOnly || view !== 'canvas' || !mountedRef.current || input.projectId !== workflowId || input.documentEpoch !== getWorkflowEpoch())
      throw canvasError('画布已经切换，无法创建复刻节点。', 'videoReplica.insert');
    const before = { nodes: getNodes(), groups: getGroups() };
    const source = before.nodes.find(node => node.id === input.nodeId);
    const result = (source?.pluginResult as { analysis?: { id?: string; source?: { url?: string } } } | undefined)?.analysis;
    const plan = source?.replicaPlan as { id?: string } | undefined;
    if (!source || source.type !== 'video-replica' || source.pluginId !== 'nako.canvas-core' || result?.id !== input.resultId || plan?.id !== input.planId)
      throw canvasError('复刻结果或计划已变化，请重新确认。', 'videoReplica.insert');
    const link = nodeLinks(source, before.nodes).find(item => item.targetPortId === 'video');
    const parent = link && before.nodes.find(node => node.id === link.sourceNodeId);
    const currentUrl = link ? parent && nodeOutput(parent, link.sourcePortId) : (source.parameters as Record<string, unknown> | undefined)?.video;
    const url = typeof currentUrl === 'string' ? currentUrl : (currentUrl as { url?: string } | undefined)?.url;
    if (url !== result?.source?.url) throw canvasError('源视频已变化，请重新分析。', 'videoReplica.insert');
    const model = modelCatalog().list('video').find(item => item.name === VIDEO_REPLICA_MODEL);
    if (!model?.videoModes?.some(mode => mode.value === 'multimodal' && mode.allowedInputs?.video))
      throw canvasError('未找到支持视频参考的 Seedance 2.5 模型，请检查模型设置。', 'videoReplica.insert');
    const after = videoReplicaCanvas(source, before, { create: createAgentNode, width: getNodeWidth, height: getNodeHeight });
    if (!after.generated.length) return [];
    flushSync(() => {
      pushHistory(before); applyingDocumentRef.current = true;
      setNodes(after.nodes); setGroups(after.groups);
      pushHistory({ nodes: after.nodes, groups: after.groups }); setDirty(true);
      setSelectedNodeIds(after.generated);
    });
    focusOnNodes(after.nodes, after.generated);
    return after.generated;
  };
  controlRuntime.current = () =>
    view === 'canvas' &&
    !readOnly &&
    workflowId &&
    mountedRef.current &&
    !isDragging &&
    !isResizing &&
    !isDraggingConnection &&
    !isSelecting
      ? {
          projectId: workflowId,
          snapshot: () => ({ nodes: getNodes(), groups: getGroups() }),
          create: createAgentNode,
          configure: configureAgentNode,
          connect: connectAgentNodes,
          measure: (node) => ({ width: getNodeWidth(node), height: getNodeHeight(node) }),
          selection: () => selectedNodeIds,
          focus: (ids) => {
            setSelectedNodeIds(ids);
            focusOnNodes(getNodes(), ids);
          },
          commit: (before, after) => {
            flushSync(() => {
              pushHistory(before);
              applyingDocumentRef.current = true;
              setNodes(after.nodes);
              setGroups(after.groups);
              pushHistory(after);
              setDirty(true);
            });
          },
        }
      : null;
  const creationRuntime = React.useRef<CanvasWorkspaceBindings['creation']>(() => null);
  const projectRuntime = React.useRef<CanvasWorkspaceBindings['project']>(() => null);
  const productRuntime = React.useRef<CanvasWorkspaceBindings['product']>(() => null);
  const workspace = React.useMemo(
    () => agentCanvas()?.createWorkspace({
      control: () => getWorkflowEpoch() === documentEpoch ? controlRuntime.current() : null,
      creation: () => getWorkflowEpoch() === documentEpoch ? creationRuntime.current() : null,
      project: () => getWorkflowEpoch() === documentEpoch ? projectRuntime.current() : null,
      product: () => getWorkflowEpoch() === documentEpoch ? productRuntime.current() : null,
    }),
    [documentEpoch, getWorkflowEpoch],
  );
  const canvasCreation = workspace?.creation, canvasProjects = workspace?.projects,
    canvasBudgets = workspace?.budgets, canvasProducts = workspace?.products;
  React.useEffect(() => {
    if (activeProjectId) void canvasCreation?.restore(activeProjectId).catch(() => {});
  }, [activeProjectId, canvasCreation]);
  React.useEffect(() => {
    if (activeProjectId) void canvasBudgets?.refresh(activeProjectId);
  }, [activeProjectId, canvasBudgets]);
  const canvasControl = canvasProducts?.control;
  return {
    ...context,
    restoreHistory,
    undo,
    redo,
    controlRuntime,
    documentEpoch,
    creationRuntime,
    canvasCreation,
    projectRuntime,
    canvasProjects,
    canvasBudgets,
    productRuntime,
    canvasProducts,
    canvasControl,
    insertShotAnalysis,
    insertVideoReplica,
  };
}

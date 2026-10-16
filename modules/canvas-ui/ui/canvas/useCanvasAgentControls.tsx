import { flushSync } from 'react-dom';
import { agentCanvas } from '../../../kernel/browser';
import type { CanvasWorkspaceBindings } from '../../../contracts/agentCanvasWorkspace';
import type { CanvasNode } from '../nodes/canvasNodeOperations';
import type { CanvasGroup } from './canvasGroups';
import { canvasError } from '../../../contracts/canvasErrors.js';
import type { ShotAnalysisInsertion, ShotAnalysisResult } from '../../../contracts/shotAnalysis.js';
import { shotAnalysisCanvas } from './shotAnalysisCanvas';
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
  };
}

import { flushSync } from 'react-dom';
import { agentCanvas } from '../../../kernel/browser';
import type { CanvasWorkspaceBindings } from '../../../contracts/agentCanvasWorkspace';
import type { CanvasNode } from '../nodes/canvasNodeOperations';
import type { CanvasGroup } from './canvasGroups';
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
  };
}

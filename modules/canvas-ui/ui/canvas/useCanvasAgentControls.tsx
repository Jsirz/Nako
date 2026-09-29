import { flushSync } from 'react-dom';
import { createCanvasAssetControl } from '../../../agent/api/ui/agent/canvasAssetControl';
import { createCanvasBudgetControl } from '../../../agent/api/ui/agent/canvasBudgetControl';
import { createCanvasControlExecutor } from '../../../agent/api/ui/agent/canvasControlExecutor';
import { createCanvasCreationControl } from '../../../agent/api/ui/agent/canvasCreationControl';
import { createCanvasMediaControl } from '../../../agent/api/ui/agent/canvasMediaControl';
import { createCanvasProductControl } from '../../../agent/api/ui/agent/canvasProductControl';
import { createCanvasProjectControl } from '../../../agent/api/ui/agent/canvasProjectControl';
import { createCanvasTaskControl } from '../../../agent/api/ui/agent/canvasTaskControl';
import { createCanvasWorkflowControl } from '../../../agent/api/ui/agent/canvasWorkflowControl';
import { createGenerationPlanClient } from '../../../agent/api/ui/agent/generationPlanClient';
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
  const controlRuntime = React.useRef<Parameters<typeof createCanvasControlExecutor>[0]>(
    () => null,
  );
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
  const creationRuntime = React.useRef<Parameters<typeof createCanvasCreationControl>[1]>(
    () => null,
  );
  const canvasExecutor = React.useMemo(
    () =>
      createCanvasControlExecutor(() =>
        getWorkflowEpoch() === documentEpoch ? controlRuntime.current() : null,
      ),
    [documentEpoch, getWorkflowEpoch],
  );
  const canvasCreation = React.useMemo(
    () =>
      createCanvasCreationControl(
        createCanvasWorkflowControl(
          createCanvasMediaControl(createCanvasAssetControl(canvasExecutor), canvasExecutor, () =>
            getWorkflowEpoch() === documentEpoch ? creationRuntime.current() : null,
          ),
          canvasExecutor,
          () => (getWorkflowEpoch() === documentEpoch ? creationRuntime.current() : null),
        ),
        () => (getWorkflowEpoch() === documentEpoch ? creationRuntime.current() : null),
        globalThis.fetch,
        createGenerationPlanClient(),
      ),
    [canvasExecutor, documentEpoch, getWorkflowEpoch],
  );
  React.useEffect(() => {
    if (activeProjectId) void canvasCreation.restore(activeProjectId).catch(() => {});
  }, [activeProjectId, canvasCreation]);
  const projectRuntime = React.useRef<Parameters<typeof createCanvasProjectControl>[1]>(() => null);
  const canvasProjects = React.useMemo(
    () =>
      createCanvasProjectControl(canvasCreation.control, () =>
        getWorkflowEpoch() === documentEpoch ? projectRuntime.current() : null,
      ),
    [canvasCreation, documentEpoch, getWorkflowEpoch],
  );
  const taskControl = React.useMemo(
    () =>
      createCanvasTaskControl(canvasProjects.control, () =>
        getWorkflowEpoch() === documentEpoch ? creationRuntime.current() : null,
      ),
    [canvasProjects, documentEpoch, getWorkflowEpoch],
  );
  const canvasBudgets = React.useMemo(
    () =>
      createCanvasBudgetControl(taskControl, canvasCreation, () =>
        getWorkflowEpoch() === documentEpoch ? creationRuntime.current() : null,
      ),
    [taskControl, canvasCreation, documentEpoch, getWorkflowEpoch],
  );
  React.useEffect(() => {
    if (activeProjectId) void canvasBudgets.refresh(activeProjectId);
  }, [activeProjectId, canvasBudgets]);
  const productRuntime = React.useRef<Parameters<typeof createCanvasProductControl>[1]>(() => null);
  const canvasProducts = React.useMemo(
    () =>
      createCanvasProductControl(canvasBudgets.control, () =>
        getWorkflowEpoch() === documentEpoch ? productRuntime.current() : null,
      ),
    [canvasBudgets, documentEpoch, getWorkflowEpoch],
  );
  const canvasControl = canvasProducts.control;
  return {
    ...context,
    restoreHistory,
    undo,
    redo,
    controlRuntime,
    documentEpoch,
    creationRuntime,
    canvasExecutor,
    canvasCreation,
    projectRuntime,
    canvasProjects,
    taskControl,
    canvasBudgets,
    productRuntime,
    canvasProducts,
    canvasControl,
  };
}

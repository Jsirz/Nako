import { canvasError } from '../../../contracts/canvasErrors.js';
import type * as ReactTypes from 'react';
import type { CanvasGroup } from './canvasGroups';
import { canvasVisibleScene,createCanvasSceneProjector } from './canvasSceneData';
import './canvasWorkspace.css';
import type { useCanvasPointerActions } from './useCanvasPointerActions';

export function useCanvasProjectNavigation(context: ReturnType<typeof useCanvasPointerActions>) {
  const {
    React,
    getNodeWidth,
    getNodeHeight,
    createId,
    textForNode,
    session,
    navigationRef,
    view,
    setView,
    setReadOnly,
    setPreviewArchiveUrl,
    setFolderId,
    setSavedAt,
    setSavedBy,
    setSavedRevision,
    newProjectPendingRef,
    viewport,
    canvasRef,
    nodes,
    setNodes,
    getNodes,
    setSelectedNodeIds,
    clearSelection,
    setSelectedConnection,
    handleEdgeClick,
    deleteSelectedConnection,
    groups,
    setGroups,
    reset,
    workflowId,
    resetWorkflowId,
    getWorkflowEpoch,
    importDocument,
    useProjectFiles,
    useProjectTransfer,
    windowSize,
    setDirty,
    applyingDocumentRef,
    save,
    readOnly,
    clearCanvas,
    handleClipboardImagePaste,
    openProject,
  } = context;

  const switchProject = async (id: string) => {
    const loaded = await openProject(id);
    if (!loaded) throw canvasError('目标项目加载失败，请重试', 'project.switch');
  };

  const { handleOpenProjectFile, handleMergeProjectFile } = useProjectFiles({
    view,
    projectId: workflowId || undefined,
    getWorkflowEpoch,
    getNodes,
    setNodes,
    setGroups: (value) =>
      setGroups(
        (current) => (typeof value === 'function' ? value(current) : value) as CanvasGroup[],
      ),
    setSelectedNodeIds,
    importDocument,
    onOpened: (document) => {
      navigationRef.current++;
      applyingDocumentRef.current = true;
      setSavedAt(null);
      setSavedBy('用户-');
      setSavedRevision(null);
      setFolderId(null);
      reset({
        nodes: document.nodes,
        groups: document.groups as CanvasGroup[],
      });
      setDirty(true);
      setView('canvas');
    },
    onChanged: () => setDirty(true),
    createId,
  });
  const { exportWorkflow, importWorkflow, transferring } = useProjectTransfer({
    enabled: view === 'canvas',
    getWorkflowEpoch,
    save: () => save({ manual: true, reportFailure: true }),
    openProject,
    openJson: handleOpenProjectFile,
  });
  const backToProjects = async (alreadySaved = false) => {
      if (!alreadySaved && !readOnly) {
        const receipt = await save({ manual: true, reportFailure: true });
        if (!receipt || receipt.unchanged === false)
          throw canvasError('当前项目尚未保存完成，请保存后再退出', 'project.leave');
      }
      navigationRef.current++;
      resetWorkflowId();
      setReadOnly(false);
      setPreviewArchiveUrl(null);
      session?.clear();
      setView('dashboard');
    },
    newProject = (ke: string | null = null) => {
      navigationRef.current++;
      setReadOnly(false);
      setPreviewArchiveUrl(null);
      session?.clear();
      clearCanvas();
      setFolderId(typeof ke == 'string' ? ke : null);
      setView('canvas');
      newProjectPendingRef.current = true;
    },
    onDragOver = (ke: ReactTypes.DragEvent<HTMLDivElement>) => {
      ke.preventDefault();
      ke.stopPropagation();
      ke.dataTransfer.dropEffect = 'copy';
    },
    onDrop = (event: ReactTypes.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return;
      return handleClipboardImagePaste([...event.dataTransfer.files], {
        x: event.clientX - bounds.left - 170 * viewport.zoom,
        y: event.clientY - bounds.top - 100 * viewport.zoom,
      });
    },
    projectScene = React.useMemo(
      () =>
        createCanvasSceneProjector({
          width: getNodeWidth,
          height: getNodeHeight,
          text: textForNode,
        }),
      [getNodeWidth, getNodeHeight, textForNode],
    ),
    sceneData = React.useMemo(() => projectScene(nodes), [nodes, projectScene]),
    { nodeDisplayData, nodesByGroupId } = sceneData,
    { visibleNodeIds, visibleGroups } = React.useMemo(
      () => canvasVisibleScene(sceneData, groups, viewport, windowSize),
      [sceneData, groups, viewport, windowSize],
    ),
    onEdgeDoubleClick = React.useCallback(
      (ke: ReactTypes.MouseEvent, st: string, ot: string, Ge: number) => {
        ke.stopPropagation();
        setSelectedConnection({ parentId: st, childId: ot, portIndex: Ge });
        deleteSelectedConnection(setNodes);
      },
      [setSelectedConnection, deleteSelectedConnection, setNodes],
    ),
    onEdgeClick = React.useCallback(
      (ke: ReactTypes.MouseEvent, st: string, ot: string, Ge: number) => {
        if (!ke.shiftKey) {
          clearSelection();
        }
        handleEdgeClick(ke, st, ot, Ge);
      },
      [clearSelection, handleEdgeClick],
    );
  return {
    ...context,
    handleOpenProjectFile,
    handleMergeProjectFile,
    exportWorkflow,
    importWorkflow,
    transferring,
    backToProjects,
    switchProject,
    newProject,
    onDragOver,
    onDrop,
    projectScene,
    sceneData,
    nodeDisplayData,
    nodesByGroupId,
    visibleNodeIds,
    visibleGroups,
    onEdgeDoubleClick,
    onEdgeClick,
  };
}

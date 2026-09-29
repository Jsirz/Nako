import type * as ReactTypes from 'react';
import { browserServices } from '../../../kernel/browser';
import './canvasWorkspace.css';
import type { useCanvasAssetActions } from './useCanvasAssetActions';

export function useCanvasPointerActions(context: ReturnType<typeof useCanvasAssetActions>) {
  const {
    React,
    media,
    getNodeWidth,
    getNodeHeight,
    view,
    setView,
    setFolderId,
    setContextMenu,
    pointerRef,
    projectFileRef,
    closeHistoryPanel,
    handleOpenComposite,
    closeAssetLibrary,
    closeWorkflowPresetPanel,
    batchConnecting,
    setBatchConnecting,
    viewport,
    setViewport,
    nodes,
    setNodes,
    getNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    isPendingConnection,
    connectionStart,
    setSelectedConnection,
    handleConnectorPointerDown,
    updateConnectionDrag,
    completeConnectionDrag,
    cancelConnectionDrag,
    updateNodeDrag,
    endNodeDrag,
    startPanning,
    updatePanning,
    endPanning,
    isDragging,
    releasePointerCapture,
    isResizing,
    updateNodeResize,
    endNodeResize,
    isSelecting,
    startSelection,
    updateSelection,
    endSelection,
    updatePointerPos,
    pushHistory,
    workflowId,
    importDocument,
    setReadOnly,
    setPreviewArchiveUrl,
    readOnly,
    closeWorkflowPanel,
    deferFrame,
    loadProject,
    handleAddNext,
  } = context;

  const onCanvasPointerDown = (ke: ReactTypes.PointerEvent<HTMLDivElement>) => {
      if (readOnly) {
        if (ke.button === 0 || ke.button === 1) startPanning(ke);
        return;
      }
      if ((isPendingConnection && cancelConnectionDrag(), ke.button === 1)) {
        startPanning(ke);
        setSelectedConnection(null);
        setContextMenu((st) => ({ ...st, isOpen: false }));
        return;
      }
      if (ke.target instanceof Element && ke.target.id === 'canvas-background' && ke.button === 0) {
        startSelection(ke, viewport);
        setSelectedNodeIds(browserServices.__NAKO_CANVAS_SELECTION__?.clearSelection() ?? []);
        setSelectedConnection(null);
        setContextMenu((st) => ({ ...st, isOpen: false }));
        closeWorkflowPanel();
        closeHistoryPanel();
        closeAssetLibrary();
        closeWorkflowPresetPanel();
      }
    },
    onCanvasPointerMove = React.useCallback(
      (ke: ReactTypes.PointerEvent<HTMLDivElement>) => {
        pointerRef.current = { x: ke.clientX, y: ke.clientY };
        if (readOnly) {
          updatePanning(ke, setViewport);
          return;
        }
        updatePointerPos(ke.clientX, ke.clientY);
        const { isUpdating: st, selectedIds: ot } = updateSelection(ke, nodes, viewport);
        if (st) {
          setSelectedNodeIds(ot);
          return;
        }
        if (!(
          updateNodeResize(ke, viewport, setNodes) ||
          updateNodeDrag(
            ke,
            viewport,
            setNodes,
            browserServices.__NAKO_CANVAS_EDITING__?.getMovableNodeIds(selectedNodeIds) ??
              selectedNodeIds,
            { getWidth: getNodeWidth, getHeight: getNodeHeight },
          ) ||
          updateConnectionDrag(ke, nodes, viewport) ||
          isSelecting
        )) {
          updatePanning(ke, setViewport);
        }
      },
      [
        readOnly,
        updatePointerPos,
        updateNodeResize,
        updateSelection,
        nodes,
        viewport,
        setSelectedNodeIds,
        updateNodeDrag,
        getNodeWidth,
        getNodeHeight,
        setNodes,
        selectedNodeIds,
        updateConnectionDrag,
        isSelecting,
        updatePanning,
        setViewport,
      ],
    ),
    startBatchConnection = React.useCallback(
      (ke: ReactTypes.PointerEvent<HTMLDivElement>, st: 'left' | 'right') => {
        const ot = selectedNodeIds;
        if (!(ot.length < 2)) {
          setBatchConnecting(true);
          handleConnectorPointerDown(ke, ot[0], st);
        }
      },
      [selectedNodeIds, handleConnectorPointerDown],
    ),
    onConnectionCompleted = React.useCallback(() => {}, []),
    onCanvasPointerUp = React.useCallback(
      (ke: ReactTypes.PointerEvent<HTMLDivElement>) => {
        if (readOnly) {
          endPanning();
          releasePointerCapture(ke);
          return;
        }
        if (isSelecting) {
          setSelectedNodeIds(endSelection(nodes, viewport));
          releasePointerCapture(ke);
          return;
        }
        const st =
          batchConnecting && connectionStart ? Array.from(new Set(selectedNodeIds)) : void 0;
        if (completeConnectionDrag(handleAddNext, setNodes, nodes, onConnectionCompleted, ke, st)) {
          setBatchConnecting(false);
          releasePointerCapture(ke);
          return;
        }
        endPanning();
        endNodeResize();
        deferFrame(() => {
          if (
            isResizing ||
            isDragging ||
            browserServices.__NAKO_CANVAS_EDITING__?.hasPendingMove()
          ) {
            pushHistory();
          }
        });
        endNodeDrag();
        setBatchConnecting(false);
        releasePointerCapture(ke);
      },
      [
        readOnly,
        isSelecting,
        endSelection,
        nodes,
        viewport,
        setSelectedNodeIds,
        connectionStart,
        releasePointerCapture,
        completeConnectionDrag,
        handleAddNext,
        setNodes,
        onConnectionCompleted,
        endPanning,
        isDragging,
        pushHistory,
        deferFrame,
        endNodeDrag,
        isResizing,
        endNodeResize,
        batchConnecting,
        selectedNodeIds,
      ],
    ),
    saveAnnotation = media.useCanvasImageEditSave(React, {
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
      title: '标注',
      getNodeWidth: () => 300,
    }),
    saveCrop = media.useCanvasCropSave(React, {
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
      getNodeWidth,
      getNodeHeight,
    }),
    saveResize = media.useCanvasImageEditSave(React, {
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
      title: '尺寸',
      getNodeWidth,
    }),
    saveComposite = media.useCanvasCompositeSave(React, {
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
      getNodeWidth,
    }),
    openComposite = React.useCallback(
      (ke: Record<string, unknown>) => {
        handleOpenComposite({ ...ke, onSave: saveComposite });
      },
      [handleOpenComposite, saveComposite],
    ),
    openProject = async (ke: string) => {
      const st = await loadProject(ke);
      if (st) {
        setReadOnly(false);
        setPreviewArchiveUrl(null);
        setFolderId(st.folderId || null);
        setView('canvas');
      }
      return st;
    },
    openShowcasePreview = (workflow: Record<string, unknown>, archiveUrl: string) => {
      if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.groups))
        throw new Error('案例工作流格式无效');
      const preview = {
        ...workflow,
        id: crypto.randomUUID(),
        revision: 0,
        title: typeof workflow.title === 'string' ? workflow.title : '作品案例',
        nodes: workflow.nodes,
        groups: workflow.groups,
      } as Parameters<typeof importDocument>[0];
      setReadOnly(true);
      context.session?.clear();
      setPreviewArchiveUrl(archiveUrl);
      setFolderId(null);
      importDocument(preview);
      setView('canvas');
    },
    copyShowcaseProject = async () => {
      if (!readOnly || !context.previewArchiveUrl) return;
      const archive = await fetch(context.previewArchiveUrl);
      if (!archive.ok) throw new Error('案例文件读取失败');
      const response = await fetch('/api/workflows/restore?copy=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: await archive.blob(),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.id !== 'string')
        throw new Error(result?.error || '复制项目失败');
      await openProject(result.id);
    },
    chooseProjectFile = React.useCallback(() => {
      let ke;
      if (!((ke = projectFileRef.current) == null)) {
        ke.click();
      }
    }, []);
  return {
    ...context,
    onCanvasPointerDown,
    onCanvasPointerMove,
    startBatchConnection,
    onConnectionCompleted,
    onCanvasPointerUp,
    saveAnnotation,
    saveCrop,
    saveResize,
    saveComposite,
    openComposite,
    openProject,
    openShowcasePreview,
    copyShowcaseProject,
    chooseProjectFile,
  };
}

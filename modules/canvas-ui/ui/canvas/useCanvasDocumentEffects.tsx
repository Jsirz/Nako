import { browserServices } from '../../../kernel/browser';
import type { CanvasNode } from '../nodes/canvasNodeOperations';
import './canvasWorkspace.css';
import type { useCanvasAgentRuntime } from './useCanvasAgentRuntime';

export function useCanvasDocumentEffects(context: ReturnType<typeof useCanvasAgentRuntime>) {
  const {
    React,
    NodeStatus,
    NodeType,
    session,
    navigationRef,
    mountedRef,
    view,
    readOnly,
    setView,
    folderId,
    setFolderId,
    isMinimapOpen,
    setMinimapWidth,
    setSettingsOpen,
    zoomControlsRef,
    selectedCoverRef,
    newProjectPendingRef,
    canvasTitle,
    viewport,
    setViewport,
    focusOnNodes,
    nodes,
    setNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    focusNodes,
    isDraggingConnection,
    isDragging,
    isResizing,
    isSelecting,
    groups,
    cleanupInvalidGroups,
    pushHistory,
    workflowId,
    setDirty,
    firstEditRef,
    observedContentRef,
    loadingCountRef,
    resultCountRef,
    applyingDocumentRef,
    save,
    loadProject,
  } = context;

  React.useEffect(() => {
    if (view === 'canvas' && isMinimapOpen && zoomControlsRef.current) {
      const ke = zoomControlsRef.current.getBoundingClientRect();
      if (ke.width > 0) {
        setMinimapWidth(ke.width + 24);
      }
      const st = new ResizeObserver((ot) => {
        for (const Ge of ot)
          if (Ge.target === zoomControlsRef.current) {
            const ft = Ge.contentRect.width;
            if (ft > 0) {
              setMinimapWidth(ft + 24);
            }
          }
      });
      return (st.observe(zoomControlsRef.current), () => st.disconnect());
    }
  }, [isMinimapOpen, view]);
  React.useEffect(() => {
    browserServices.__NAKO_FOCUS_NODES__ = focusNodes;
    return () => {
      if (browserServices.__NAKO_FOCUS_NODES__ === focusNodes) {
        delete browserServices.__NAKO_FOCUS_NODES__;
      }
    };
  }, [focusNodes]);
  React.useEffect(() => {
    mountedRef.current = true;
    const navigation = navigationRef;
    return () => {
      mountedRef.current = false;
      navigation.current++;
    };
  }, []);
  React.useEffect(() => {
    let active = true;
    const ke = session?.load();
    const intent = navigationRef.current + 1;
    if (ke) {
      loadProject(ke.workflowId)
        .then((st) => {
          if (!active || !mountedRef.current || intent !== navigationRef.current) return;
          if (st) {
            setFolderId(st.folderId || ke.folderId || null);
            setViewport(ke.viewport);
            setView('canvas');
          } else {
            session?.clear();
          }
        })
        .catch(() => {
          if (active && mountedRef.current && intent === navigationRef.current) session?.clear();
        });
    }
    return () => {
      active = false;
    };
  }, [loadProject, session, setViewport]);
  React.useEffect(() => {
    if (view === 'canvas' && workflowId && !readOnly) {
      session?.save({
        workflowId,
        folderId: typeof folderId === 'string' ? folderId : null,
        viewport,
      });
    }
  }, [view, workflowId, folderId, viewport, session, readOnly]);
  React.useEffect(() => {
    const previous = observedContentRef.current;
    observedContentRef.current = { nodes, groups, title: canvasTitle };
    if (firstEditRef.current) {
      firstEditRef.current = false;
      loadingCountRef.current = nodes.filter((ot) => ot.status === NodeStatus.LOADING).length;
      resultCountRef.current = nodes.filter(
        (ot) => ot.status === NodeStatus.SUCCESS && ot.resultUrl,
      ).length;
      return;
    }
    if (readOnly) {
      applyingDocumentRef.current = false;
      return;
    }
    if (applyingDocumentRef.current) {
      applyingDocumentRef.current = false;
      return;
    }
    if (previous.nodes === nodes && previous.groups === groups && previous.title === canvasTitle)
      return;
    setDirty(true);
    if (!isDragging && !isResizing && !isDraggingConnection && !isSelecting) {
      pushHistory({ nodes, groups });
    }
    const ke = nodes.filter((ot) => ot.status === NodeStatus.LOADING).length;
    if (ke > loadingCountRef.current) {
      save();
    }
    loadingCountRef.current = ke;
    const st = nodes.filter((ot) => ot.status === NodeStatus.SUCCESS && ot.resultUrl).length;
    if (st > resultCountRef.current) {
      save();
    }
    resultCountRef.current = st;
  }, [
    nodes,
    groups,
    canvasTitle,
    readOnly,
    NodeStatus,
    isDragging,
    isResizing,
    isDraggingConnection,
    isSelecting,
    pushHistory,
    save,
  ]);
  React.useEffect(() => {
    if (selectedNodeIds.length === 1) {
      const ke = nodes.find((st) => st.id === selectedNodeIds[0]);
      if (
        ke &&
        ((['image', 'upload image', 'video', 'upload video', 'audio', 'upload audio'].includes(
          String(ke.type).toLowerCase(),
        ) &&
          ke.resultUrl) ||
          ((ke.type === NodeType.VIDEO || ke.type === NodeType.UPLOAD_VIDEO) &&
            (ke.lastFrame || ke.resultUrl)))
      ) {
        selectedCoverRef.current = ke.id;
      }
    }
  }, [selectedNodeIds, nodes, NodeType]);
  React.useEffect(() => {
    if (view === 'canvas' && newProjectPendingRef.current) {
      newProjectPendingRef.current = false;
      save();
    }
  }, [view, save]);
  React.useEffect(() => {
    cleanupInvalidGroups(nodes, setNodes);
  }, [nodes, cleanupInvalidGroups, setNodes]);
  React.useEffect(() => {
    const insert = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          nodes?: CanvasNode[];
          nodeIds?: string[];
        }>
      ).detail;
      if (!Array.isArray(detail?.nodes) || !Array.isArray(detail.nodeIds) || !detail.nodeIds.length)
        return;
      setView('canvas');
      setSettingsOpen(false);
      // The insertion event is already emitted after the node store accepts the nodes.
      // A second RAF can be cancelled by the very render caused by this insertion.
      focusOnNodes(detail.nodes, detail.nodeIds);
      setSelectedNodeIds(detail.nodeIds);
    };
    window.addEventListener('nako:workflow-canvas-inserted', insert);
    return () => {
      window.removeEventListener('nako:workflow-canvas-inserted', insert);
    };
  }, [view, focusOnNodes, setSelectedNodeIds]);
  React.useEffect(() => {
    const ke = () => setSettingsOpen(true);
    return (
      window.addEventListener('nako:open-settings', ke),
      () => window.removeEventListener('nako:open-settings', ke)
    );
  }, [setSettingsOpen]);
  return { ...context };
}

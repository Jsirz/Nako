import { useCanvasImageUpscale } from './useCanvasImageUpscale';
import './canvasWorkspace.css';
import type { useCanvasAgentControls } from './useCanvasAgentControls';
import { defaultCanvasTitle } from './canvasEditorHooks';

export function useCanvasSaveAndReferences(context: ReturnType<typeof useCanvasAgentControls>) {
  const {
    React,
    NodeStatus,
    useGeneration,
    useSnapshots,
    useAudioTrim,
    useTextActions,
    useLocalWorkflows,
    navigationRef,
    mountedRef,
    view,
    readOnly,
    folderId,
    setSavedAt,
    setSavedBy,
    setSavedRevision,
    isChatOpen,
    selectedCoverRef,
    setCanvasTitle,
    setEditingTitleValue,
    nodes,
    setNodes,
    getNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    updateNode,
    setGroups,
    reset,
    workflowId,
    handleSaveWorkflow,
    handleLoadWorkflow,
    resetWorkflowId,
    getWorkflowEpoch,
    useSaveFeedback,
    localUserNo,
    setDirty,
    loadingCountRef,
    resultCountRef,
    applyingDocumentRef,
    creationRuntime,
  } = context;

  const save = useSaveFeedback({
      enabled: view === 'canvas' && !readOnly,
      getWorkflowEpoch,
      getNodes,
      getSelectedCoverId: () => selectedCoverRef.current,
      folderId,
      userNo: localUserNo,
      saveWorkflow: handleSaveWorkflow,
      setDirty,
      setSavedAt,
      setSavedBy,
      setSavedRevision,
    }),
    saveManually = React.useCallback(async () => {
      await save({ manual: true });
    }, [save]),
    loadProject = React.useCallback(
      async (ke: string) => {
        const intent = ++navigationRef.current;
        applyingDocumentRef.current = true;
        const st = await handleLoadWorkflow(ke);
        if (!mountedRef.current || intent !== navigationRef.current) return null;
        if (st) {
          const ot = st.nodes || [];
          reset({ nodes: ot, groups: st.groups || [] });
          loadingCountRef.current = ot.filter((Ge) => Ge.status === NodeStatus.LOADING).length;
          resultCountRef.current = ot.filter(
            (Ge) => Ge.status === NodeStatus.SUCCESS && Ge.resultUrl,
          ).length;
          setSavedAt(st.lastSavedAt);
          setSavedBy(st.lastSavedBy || '用户-');
          setSavedRevision(typeof st.revision == 'number' ? st.revision : null);
          selectedCoverRef.current = null;
        } else {
          applyingDocumentRef.current = false;
        }
        return (st && setDirty(false), st);
      },
      [handleLoadWorkflow, reset, NodeStatus],
    ),
    { handleGenerate } = useGeneration({
      nodes,
      getNodes,
      projectId: workflowId || undefined,
      enabled: view === 'canvas' && !readOnly,
      updateNode,
    }),
    { handleVideoSnapshot, handleVideoFirstLastSnapshot } = useSnapshots({
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
    }),
    { handleAudioTrim } = useAudioTrim({
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
    });

  const handleUpscaleImage = useCanvasImageUpscale(React, {
    projectId: workflowId || undefined,
    enabled: view === 'canvas' && !readOnly,
    getNodes,
    setNodes,
    select: setSelectedNodeIds,
  });
  const agentReferences = React.useMemo(
      () =>
        isChatOpen
          ? selectedMediaReferences(nodes, selectedNodeIds)
          : [],
      [isChatOpen, nodes, selectedNodeIds],
    ),
    clearCanvas = () => {
      applyingDocumentRef.current = true;
      setNodes([]);
      setGroups([]);
      setSelectedNodeIds([]);
      const title = defaultCanvasTitle();
      setCanvasTitle(title);
      setEditingTitleValue(title);
      resetWorkflowId(title);
      selectedCoverRef.current = null;
      setSavedAt(undefined);
      setSavedRevision(null);
      setSavedBy('用户-');
      reset({ nodes: [], groups: [] });
      setDirty(false);
    },
    { handleWriteContent, handleTextToVideo, handleTextToImage } = useTextActions({
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      updateNode,
      setNodes,
      setSelectedNodeIds,
    }),
    { handleMiniMaxH3T2VAGenerate } = useLocalWorkflows({
      nodes,
      getNodes,
      enabled: view === 'canvas' && !readOnly,
      projectId: workflowId || undefined,
      setNodes,
      setSelectedNodeIds,
    });
  creationRuntime.current = () =>
    view === 'canvas' && !readOnly && workflowId && mountedRef.current
      ? {
          projectId: workflowId,
          nodes: getNodes,
          generate: (id, authorization) => handleGenerate(id, authorization),
        }
      : null;

  return {
    ...context,
    save,
    saveManually,
    loadProject,
    handleGenerate,
    handleVideoSnapshot,
    handleVideoFirstLastSnapshot,
    handleAudioTrim,
    handleUpscaleImage,
    agentReferences,
    clearCanvas,
    handleWriteContent,
    handleTextToVideo,
    handleTextToImage,
    handleMiniMaxH3T2VAGenerate,
  };
}

function selectedMediaReferences(
  nodes: ReturnType<typeof useCanvasAgentControls>['nodes'],
  selectedNodeIds: string[],
) {
  return nodes
    .filter(
      (node) =>
        selectedNodeIds.includes(node.id) &&
        ['image', 'upload image', 'video', 'upload video', 'audio', 'upload audio'].includes(
          String(node.type).toLowerCase(),
        ) &&
        typeof node.resultUrl === 'string' && node.resultUrl.length > 0,
    )
    .map((node) => ({
      nodeId: node.id,
      url: node.resultUrl,
      type: String(node.type).toLowerCase().includes('video')
        ? 'video'
        : String(node.type).toLowerCase().includes('audio') ? 'audio' : 'image',
    }));
}

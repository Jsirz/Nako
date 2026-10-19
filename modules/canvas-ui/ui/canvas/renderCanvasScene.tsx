import type * as ReactTypes from 'react';
import { browserServices } from '../../../kernel/browser';
import { alignCanvasDrag } from './canvasAlignment';
import type { CanvasNodeFrame,SelectionResizeHandle } from './canvasEditing';
import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
type SceneContext = ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] };

export function renderCanvasScene(context: SceneContext) {
  return context.React.createElement(context.Scene, {
    ...canvasSceneStateProps(context),
    ...canvasSceneActionProps(context),
  });
}

function canvasSceneStateProps(context: SceneContext) {
  const {
    getWorkflowEpoch, nodes, viewport, selectedNodeIds, groups, visibleNodeIds, visibleGroups,
    nodesByGroupId, nodeDisplayData, isDragging, getNodeWidth, getNodeHeight, isPanning,
    isResizing, isDraggingConnection, isPendingConnection, connectionStart, tempConnectionEnd,
    batchSourceNodeIds, connectionHoveredNodeId, hoveredSide, hoveredPortIndex, isInvalidHover,
    selectedConnection, showGridSlider, gridColumns, isCompact, canvasRef, onCanvasPointerDown,
    onCanvasPointerMove, onCanvasPointerUp, onCanvasWheel, handleDoubleClick,
    handleGlobalContextMenu, onDragOver, onDrop, onEdgeClick, onEdgeDoubleClick,
  } = context;
  return {
    key: 'scene',
    readOnly: context.readOnly,
    documentEpoch: getWorkflowEpoch(),
    nodes,
    viewport,
    selectedNodeIds,
    groups,
    visibleNodeIds,
    visibleGroups,
    nodesByGroupId,
    nodeDisplayData,
    alignmentGuides: isDragging
      ? alignCanvasDrag(
          nodes,
          selectedNodeIds,
          { getWidth: getNodeWidth, getHeight: getNodeHeight },
          { x: 0, y: 0 },
          viewport.zoom,
          0.01,
        ).guides
      : [],
    isPanning,
    isDragging,
    isResizing,
    isDraggingConnection,
    isPendingConnection,
    connectionStart,
    tempConnectionEnd,
    batchConnectionSourceNodeIds: batchSourceNodeIds,
    connectionHoveredNodeId,
    connectionHoveredSide: hoveredSide,
    connectionHoveredPortIndex: hoveredPortIndex,
    isInvalidHover,
    selectedConnection,
    showGridSlider,
    gridColumns,
    isCompact,
    canvasRef,
    onPointerDown: onCanvasPointerDown,
    onPointerMove: onCanvasPointerMove,
    onPointerUp: onCanvasPointerUp,
    onWheel: onCanvasWheel,
    onDoubleClick: handleDoubleClick,
    onContextMenu: handleGlobalContextMenu,
    onDragOver,
    onDrop,
    onEdgeClick,
    onEdgeDoubleClick,
  };
}

function canvasSceneActionProps(context: SceneContext) {
  const {
    groupNodes, nodes, setNodes, ungroupNodes, renameGroup, gridLayoutNodes, isCompact,
    showGridSlider, gridColumns, setShowGridSlider, createCollage, setSelectedNodeIds,
    setSelectedConnection, selectedNodeIds, handleNodePointerDown, setBatchConnecting,
    handleConnectorPointerDown, startSelectionResize, startBatchConnection, replaceMedia,
    handleExpandImage, handleNodeDragStart, handleNodeDragEnd, handleWriteContent,
    handleTextToVideo, handleTextToImage, handleMiniMaxH3T2VAGenerate, handleVideoSnapshot,
    handleVideoFirstLastSnapshot, handleAudioTrim, handleOpenCompare, openComposite,
    handleResizeStart, updateNode, handleGenerate, handleAddNext, getCommonGroup,
    handleOpenCreateAsset, handleStartAnnotation, handleStartCrop, handleStartResize,
    handleUpscaleImage, workflowId, handleNodeContextMenu,
  } = context;
  return {
    onGroup: (ke: string[]) => groupNodes(ke, nodes, setNodes),
    onUngroup: (ke: string) => ungroupNodes(ke, nodes, setNodes),
    onRenameGroup: renameGroup,
    onGridLayout: (ke: number) => gridLayoutNodes(ke, isCompact),
    onToggleGridSlider: () => {
      if (!showGridSlider) {
        gridLayoutNodes(gridColumns, isCompact);
      }
      setShowGridSlider(!showGridSlider);
    },
    onCreateCollage: createCollage,
    onNodePointerDown: (ke: ReactTypes.PointerEvent<HTMLDivElement>, st: string) => {
      if (context.readOnly) {
        if (ke.button !== 1) {
          ke.stopPropagation();
          setSelectedNodeIds([st]);
          setSelectedConnection(null);
        }
        return;
      }
      const Ge = browserServices.__NAKO_CANVAS_SELECTION__;
      if (Ge) {
        setSelectedNodeIds(Ge.selectNode(selectedNodeIds, st, ke));
      } else {
        if (!selectedNodeIds.includes(st)) {
          setSelectedNodeIds(ke.shiftKey || ke.ctrlKey || ke.metaKey ? (ft) => [...ft, st] : [st]);
        }
      }
      if (!(ke.shiftKey || ke.ctrlKey || ke.metaKey)) {
        setSelectedConnection(null);
      }
      handleNodePointerDown(ke, st, void 0);
    },
    onNodeContextMenu: handleNodeContextMenu,
    onSelect: (ke: string) => {
      setSelectedNodeIds([ke]);
      setSelectedConnection(null);
    },
    onGroupPointerDown: (ke: ReactTypes.PointerEvent<HTMLDivElement>, st: string[]) => {
      const ht = browserServices.__NAKO_CANVAS_SELECTION__;
      if (ht) {
        setSelectedNodeIds(ht.selectGroup(selectedNodeIds, st, ke));
      } else {
        if (ke.shiftKey || ke.ctrlKey || ke.metaKey) {
          setSelectedNodeIds((Rt) => [...new Set([...Rt, ...st])]);
        } else {
          if (st.length > 0) {
            setSelectedNodeIds(st);
          }
        }
      }
      if (!(ke.shiftKey || ke.ctrlKey || ke.metaKey)) {
        setSelectedConnection(null);
      }
      if (st.length > 0) {
        handleNodePointerDown(ke, st[0], void 0);
      }
    },
    onConnectorDown: (
      ke: ReactTypes.PointerEvent<HTMLDivElement>,
      st: string,
      ot: 'left' | 'right',
      Ge: number,
    ) => {
      setBatchConnecting(false);
      handleConnectorPointerDown(ke, st, ot, Ge);
    },
    onSelectionResizeStart: (
      ke: ReactTypes.PointerEvent<HTMLDivElement>,
      st: SelectionResizeHandle,
      ot: CanvasNodeFrame[],
    ) => startSelectionResize(ke, st, ot),
    onSelectionBatchConnectorDown: startBatchConnection,
    onNodeUpload: replaceMedia,
    onExpand: handleExpandImage,
    onDragStart: handleNodeDragStart,
    onDragEnd: handleNodeDragEnd,
    onWriteContent: handleWriteContent,
    onTextToVideo: handleTextToVideo,
    onTextToImage: handleTextToImage,
    onMiniMaxH3T2VAGenerate: handleMiniMaxH3T2VAGenerate,
    onVideoSnapshot: handleVideoSnapshot,
    onVideoFirstLastSnapshot: handleVideoFirstLastSnapshot,
    onAudioTrim: handleAudioTrim,
    onOpenCompare: handleOpenCompare,
    onOpenComposite: openComposite,
    onNodeMouseEnter: () => {},
    onNodeMouseLeave: () => {},
    onResizeStart: handleResizeStart,
    onUpdateNode: updateNode,
    onGenerate: handleGenerate,
    onInsertShotAnalysis: context.insertShotAnalysis,
    onCreateVideoReplica: (input: import('../../../contracts/videoReplica.js').VideoReplicaInsertion) => {
      const ids = context.insertVideoReplica(input);
      if (input.generate) ids.forEach(id => { void handleGenerate(id); });
      return ids;
    },
    onSaveBeforeShotAnalysis: async () => {
      const receipt = await context.save({ reportFailure: true });
      return !!receipt && receipt.unchanged !== false;
    },
    onAddNext: handleAddNext,
    getCommonGroup,
    onSaveAsset: handleOpenCreateAsset,
    onAnnotate: handleStartAnnotation,
    onCrop: handleStartCrop,
    onResizeImage: handleStartResize,
    onUpscaleImage: handleUpscaleImage,
    projectId: workflowId || void 0,
  };
}

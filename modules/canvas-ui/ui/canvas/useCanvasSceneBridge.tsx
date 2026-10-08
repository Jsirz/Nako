import { canvasError } from '../../../contracts/canvasErrors.js';
import { browserServices } from '../../../kernel/browser';
import type { CanvasNode } from '../nodes/canvasNodeOperations';
import { useCanvasDeferredFrame,useCanvasSurfaceSize } from './canvasApplicationEvents';
import './canvasWorkspace.css';
import type { useCanvasConnectionState } from './useCanvasConnectionState';

export function useCanvasSceneBridge(context: ReturnType<typeof useCanvasConnectionState>) {
  const {
    React,
    useLocalUser,
    userColorForId,
    view,
    canvasTitle,
    canvasRef,
    nodes,
    setNodes,
    setSelectedNodeIds,
    groups,
    getWorkflowEpoch,
    activeProjectId,
  } = context;

  // The source-owned canvas remains the only node store and save/history owner.
  const dramaBridge = browserServices.__NAKO_DRAMA_BRIDGE__;
  const dramaDocumentEpoch = getWorkflowEpoch();
  React.useLayoutEffect(() => {
    dramaBridge?.setProject(activeProjectId);
    return () => dramaBridge?.clearProject(activeProjectId);
  }, [dramaBridge, activeProjectId, dramaDocumentEpoch]);
  React.useLayoutEffect(
    () =>
      dramaBridge?.bind(
        nodes,
        (transform) => {
          setNodes((current) => {
            const next = transform(current);
            if (!next.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)))
              throw canvasError('文戏节点坐标无效，未写入画布。', 'scene.drama-node-position');
            return next as CanvasNode[];
          });
        },
        setSelectedNodeIds,
      ),
    [dramaBridge, nodes, setNodes, setSelectedNodeIds, dramaDocumentEpoch],
  );

  const deferFrame = useCanvasDeferredFrame(React, view === 'canvas', getWorkflowEpoch);
  const windowSize = useCanvasSurfaceSize(React, canvasRef, view, getWorkflowEpoch());

  const {
      id: localUserId,
      no: localUserNo,
      name: localUserName,
      setName: setLocalUserName,
    } = useLocalUser(),
    userColor = React.useMemo(
      () => userColorForId(localUserId || localUserNo),
      [localUserId, localUserNo, userColorForId],
    ),
    [dirty, setDirty] = React.useState(false),
    hasUnsavedChanges = dirty,
    firstEditRef = React.useRef(true),
    observedContentRef = React.useRef({ nodes, groups, title: canvasTitle }),
    loadingCountRef = React.useRef(0),
    resultCountRef = React.useRef(0),
    applyingDocumentRef = React.useRef(false);
  return {
    ...context,
    dramaBridge,
    dramaDocumentEpoch,
    deferFrame,
    windowSize,
    localUserId,
    localUserNo,
    localUserName,
    setLocalUserName,
    userColor,
    dirty,
    setDirty,
    hasUnsavedChanges,
    firstEditRef,
    observedContentRef,
    loadingCountRef,
    resultCountRef,
    applyingDocumentRef,
  };
}

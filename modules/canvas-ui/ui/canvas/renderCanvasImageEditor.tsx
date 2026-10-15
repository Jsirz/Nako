import { canvasError } from '../../../contracts/canvasErrors.js';
import { flushSync } from 'react-dom';
import type { ImageAngle } from '../../../contracts/imageAngle';
import { mediaCanvas } from '../../../kernel/browser';
import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasImageEditor(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const {
    React,
    getNodeWidth,
    Crop,
    view,
    cropNodeId,
    imageEditorMode,
    handleCloseCrop,
    nodes,
    setNodes,
    getNodes,
    createAgentNode,
    configureAgentNode,
    connectAgentNodes,
    setSelectedNodeIds,
    workflowId,
    handleGenerate,
    saveCrop,
  } = context;
  return (
    cropNodeId &&
    React.createElement(Crop, {
      key: `crop:${workflowId}:${cropNodeId}:${imageEditorMode}`,
      mode: imageEditorMode,
      onPanorama: (id: string) => {
        if (!workflowId || view !== 'canvas') throw canvasError('请先打开项目。', 'image-editor.panorama');
        const result = mediaCanvas().imageAngleDraft(getNodes(), id, null, workflowId, {
          create: createAgentNode,
          configure: configureAgentNode,
          connect: connectAgentNodes,
          width: getNodeWidth,
        });
        flushSync(() => {
          setNodes(result.nodes);
          setSelectedNodeIds([result.id]);
        });
        void handleGenerate(result.id);
      },
      onAngle: (id: string, angle: ImageAngle) => {
        if (!workflowId || view !== 'canvas') throw canvasError('请先打开项目。', 'image-editor.angle');
        const result = mediaCanvas().imageAngleDraft(getNodes(), id, angle, workflowId, {
          create: createAgentNode,
          configure: configureAgentNode,
          connect: connectAgentNodes,
          width: getNodeWidth,
        });
        flushSync(() => {
          setNodes(result.nodes);
          setSelectedNodeIds([result.id]);
        });
        void handleGenerate(result.id);
      },
      sources: nodes.filter(
        (node) => ['Image', 'Upload Image'].includes(node.type) && node.resultUrl,
      ),
      node: nodes.find((ke) => ke.id === cropNodeId),
      onSave: saveCrop,
      onClose: handleCloseCrop,
      projectId: workflowId || undefined,
    })
  );
}

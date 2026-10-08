import { canvasError } from '../../../contracts/canvasErrors.js';
import { flushSync } from 'react-dom';
import { browserServices, localRuntimeUi } from '../../../kernel/browser';
import './canvasWorkspace.css';
import type { useCanvasProjectNavigation } from './useCanvasProjectNavigation';

export function useCanvasAgentRuntime(context: ReturnType<typeof useCanvasProjectNavigation>) {
  const {
    mountedRef,
    view,
    readOnly,
    folderId,
    setFolderId,
    handleStartResize,
    setCanvasTitle,
    setEditingTitleValue,
    focusOnNodes,
    getNodes,
    setSelectedNodeIds,
    workflowId,
    getWorkflowEpoch,
    setDirty,
    projectRuntime,
    productRuntime,
    save,
    handleOpenCreateAsset,
    handleContextUpload,
    handleReplaceMedia,
    openProject,
    backToProjects,
    chooseProjectFile,
  } = context;

  projectRuntime.current = () =>
    view === 'canvas' && !readOnly && workflowId && mountedRef.current
      ? {
          projectId: workflowId,
          folderId,
          save: async () => {
            const receipt = await save({ manual: true, reportFailure: true });
            return !!receipt && receipt.unchanged !== false;
          },
          rename: async (title) => {
            flushSync(() => {
              setCanvasTitle(title);
              setEditingTitleValue(title);
              setDirty(true);
            });
            const receipt = await save({ manual: true, reportFailure: true });
            return !!receipt && receipt.unchanged !== false;
          },
          move: (id) => flushSync(() => setFolderId(id)),
          open: async (id) => { await openProject(id); },
          exit: () => backToProjects(),
          importFile: () => chooseProjectFile(),
          download: (id) => {
            const link = document.createElement('a');
            link.href = `/api/workflows/${encodeURIComponent(id)}/backup`;
            link.download = '';
            link.click();
          },
        }
      : null;
  productRuntime.current = () =>
    view === 'canvas' && !readOnly && workflowId && mountedRef.current
      ? {
          projectId: workflowId,
          async invoke(operation, nodeId) {
            const node = nodeId ? getNodes().find((item) => item.id === nodeId) : undefined;
            if (nodeId && (!node || node.status === 'loading')) throw canvasError('节点不可用', 'agent.node-operation');
            if (operation === 'workflowManager') {
              window.dispatchEvent(new CustomEvent('nako:open-workflow-library'));
              return;
            }
            if (operation === 'upload' || operation === 'replace') {
              const input = document.createElement('input'),
                epoch = getWorkflowEpoch();
              input.type = 'file';
              input.accept = 'image/*,video/*,audio/*';
              input.multiple = operation === 'upload';
              input.onchange = () => {
                const files = input.files;
                input.remove();
                if (getWorkflowEpoch() !== epoch || !files?.length) return;
                if (nodeId) void handleReplaceMedia(nodeId, files[0]);
                else void handleContextUpload(files);
              };
              input.oncancel = () => input.remove();
              input.hidden = true;
              document.body.append(input);
              input.click();
              return;
            }
            if (!node) throw canvasError('节点不存在', 'agent.node-operation');
            if (operation === 'saveAsset') {
              handleOpenCreateAsset(node.id);
              return;
            }
            if (operation === 'resize') {
              handleStartResize(node.id);
              return;
            }
            if (operation === 'download') {
              if (typeof node.resultUrl !== 'string' || !browserServices.__NAKO_MEDIA_DOWNLOAD__)
                throw canvasError('素材不可用', 'agent.download');
              const extension = node.type.includes('Video')
                ? 'mp4'
                : node.type.includes('Audio')
                  ? 'mp3'
                  : 'png';
              const result = await browserServices.__NAKO_MEDIA_DOWNLOAD__.download(
                node,
                node.resultUrl,
                extension,
              );
              if (result?.status === 'failed') throw canvasError('下载失败', 'agent.download');
              return;
            }
            if (operation === 'runWorkflow') {
              if (node.kind !== 'workflow') throw canvasError('不是执行工作流', 'agent.run-workflow');
              const epoch = getWorkflowEpoch();
              const configuration = () => {
                const current = getNodes().find((item) => item.id === node.id);
                return JSON.stringify([
                  current?.parameterValues,
                  current?.parentIds,
                  current?.sourcePortIndices,
                  current?.workflowRef,
                  current?.canvasNodeHash,
                  current?.runningHubInstanceType,
                  getNodes().filter((item) => current?.parentIds?.includes(item.id)),
                ]);
              };
              const expected = configuration();
              const authorized = () =>
                mountedRef.current && getWorkflowEpoch() === epoch && configuration() === expected;
              flushSync(() => {
                setSelectedNodeIds([node.id]);
                focusOnNodes(getNodes(), [node.id]);
              });
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              );
              if (!authorized() || !(await localRuntimeUi().requestWorkflowNodeRun(workflowId, node.id, authorized)))
                throw canvasError('请在节点核对原任务', 'agent.run-workflow-authorization');
            }
          },
        }
      : null;
  return { ...context };
}

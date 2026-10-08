import { ERRORS, PluginError } from '../../../contracts/errors.js';
import { browserServices } from '../../../kernel/browser';
import type * as React from 'react';
import type { CanvasNode } from '../../../contracts/canvasDocument';
import { buildMiniMaxH3Request } from '../../../asset-media/api/ui/media/minimaxH3';
import {
  createVideoWorkflowClient,
  type VideoWorkflowClient,
  type VideoWorkflowRequest,
} from '../../../asset-media/api/ui/media/videoWorkflows';

const interruptedMessage =
  '本地工作流结果未确认，请先检查 ComfyUI 任务和素材库；不会自动重新生成。';
interface Binding {
  getNodes(): CanvasNode[];
  getProjectId(): string | undefined;
  isActive(): boolean;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setSelectedNodeIds(ids: string[]): void;
}
interface Runtime {
  createId(): string;
  run(request: VideoWorkflowRequest): ReturnType<VideoWorkflowClient['run']>;
  getOperation(projectId: string, operationId: string): ReturnType<VideoWorkflowClient['getOperation']>;
}
const retiredHandlers = [
  'handleChangeAngleGenerate',
  'handleUpscaleGenerate',
  'handleQwenInpaintGenerate',
  'handleQwenOutpaintGenerate',
  'handleQwenPoseGenerate',
  'handleZImageTurboT2IGenerate',
  'handleKleinT2IGenerate',
  'handleKleinI2IGenerate',
  'handleKleinM2IGenerate',
  'handleKleinIS2IGenerate',
  'handleAuxPreprocessorGenerate',
  'handleKleinOutpaintGenerate',
  'handleVoxCPM2CloneGenerate',
  'handleVoxCPM2VoiceDesignGenerate',
  'handleIndexTTS2VectorEmoCloneGenerate',
  'handleIndexTTS2VectorMultiEmoCloneGenerate',
  'handleIndexTTS2AudioEmoCloneGenerate',
  'handleIndexTTS2AudioMultiEmoCloneGenerate',
  'handleQwen3TTSGenerate',
  'handleQwen3CloneGenerate',
  'handleQwen3VoiceDesignGenerate',
  'handleSam3InteractiveGenerate',
  'handleSam3TextGenerate',
  'handleSam3PointGenerate',
] as const;

/** Only MiniMax remains a dedicated local workflow; imported workflows own their own runs. */
export function createCanvasLocalWorkflows(binding: Binding, runtime: Runtime) {
  const projectId = binding.getProjectId();
  const pending = new Map<string, string>();
  const observed = new Set<string>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let disposed = false;
  const active = () => !disposed && binding.isActive() && binding.getProjectId() === projectId;
  const publish = (token: string, status: 'success' | 'error', url?: string, message?: string,
    confirmed = true) => {
    if (!active()) return;
    binding.setNodes((nodes) => nodes.map((node) => {
      if (node.localWorkflowOperationId !== token) return node;
      if (node.comfyMode === 'minimax-h3-t2va')
        return { ...node, status: status === 'success' ? 'idle' : 'error', errorMessage: message,
          localWorkflowOperationId: confirmed ? undefined : token };
      return { ...node, status, resultUrl: url ?? node.resultUrl, progress: status === 'success' ? 100 : node.progress,
        networkUrl: null, errorMessage: message, localWorkflowOperationId: confirmed ? undefined : token };
    }));
  };
  const observe = (nodeId: string, token: string) => {
    if (!projectId || pending.has(nodeId) || observed.has(token)) return;
    observed.add(token);
    pending.set(nodeId, token);
    const poll = async () => {
      if (!active() || pending.get(nodeId) !== token) return;
      try {
        const receipt = await runtime.getOperation(projectId, token);
        if (!active() || pending.get(nodeId) !== token) return;
        if (receipt.status === 'success') publish(token, 'success', receipt.url);
        else if (receipt.status === 'error' || receipt.status === 'unknown')
          publish(token, 'error', undefined, receipt.error || interruptedMessage,
            receipt.status === 'error');
        else {
          const timer = setTimeout(() => { timers.delete(timer); void poll(); }, 2000);
          timers.add(timer);
          return;
        }
        pending.delete(nodeId);
      } catch {
        if (!active() || pending.get(nodeId) !== token) return;
        const timer = setTimeout(() => { timers.delete(timer); void poll(); }, 3000);
        timers.add(timer);
      }
    };
    void poll();
  };
  const retired = (id: string) => {
    if (!active()) return;
    binding.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              status: 'error',
              errorMessage: '此内置工作流已停用。请从本地工作流导入对应 ComfyUI API JSON 后运行。',
            }
          : node,
      ),
    );
  };
  return {
    ...(Object.fromEntries(retiredHandlers.map((name) => [name, retired])) as Record<
      (typeof retiredHandlers)[number],
      (id: string) => void
    >),
    resume(nodes: CanvasNode[]) {
      if (!active()) return;
      for (const node of nodes) {
        if (node.comfyMode === 'minimax-h3-t2va' && node.localWorkflowOperationId)
          observe(node.id, String(node.localWorkflowOperationId));
      }
    },
    async handleMiniMaxH3T2VAGenerate(id: string) {
      if (!active() || pending.has(id)) return;
      const source = binding.getNodes().find((node) => node.id === id);
      if (!source || source.comfyMode !== 'minimax-h3-t2va' || source.localWorkflowOperationId)
        return;
      let request: VideoWorkflowRequest;
      try {
        if (!projectId) throw new PluginError(ERRORS.invalidConfiguration, '请先保存当前项目，再运行本地工作流。', {
          context: { moduleId: 'generation-core', operation: 'runLocalWorkflow', nodeId: id },
        });
        request = buildMiniMaxH3Request(binding.getNodes(), source, projectId);
      } catch (error) {
        binding.setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  status: 'error',
                  errorMessage: error instanceof Error ? error.message : 'MiniMax H3 输入无效',
                }
              : node,
          ),
        );
        return;
      }
      const token = runtime.createId(),
        outputId = runtime.createId();
      pending.set(id, token);
      request.operationId = token;
      const output: CanvasNode = {
        id: outputId,
        projectId,
        type: 'Upload Video',
        x: source.x + 1020,
        y: source.y,
        prompt: request.text,
        status: 'loading',
        progress: 10,
        parentIds: [id],
        model: 'MiniMax H3',
        aspectRatio: request.aspectRatio,
        resolution: `${request.megapixels} MP`,
        duration: request.duration,
        videoDuration: request.duration,
        localWorkflowOperationId: token,
      };
      binding.setNodes((nodes) => [
        ...nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                status: 'loading',
                localWorkflowOperationId: token,
                errorMessage: undefined,
              }
            : node,
        ),
        output,
      ]);
      binding.setSelectedNodeIds([outputId]);
      try {
        const result = await runtime.run(request);
        if (!active()) return;
        if (result.status === 'success') publish(token, 'success', result.url);
        else if (result.status === 'error' || result.status === 'unknown')
          publish(token, 'error', undefined, result.error || interruptedMessage,
            result.status === 'error');
        else { pending.delete(id); observe(id, token); }
        if (result.status !== 'running') pending.delete(id);
      } catch {
        if (active()) { pending.delete(id); observe(id, token); }
      } finally {
        if (pending.get(id) === token && !active()) pending.delete(id);
      }
    },
    dispose() {
      disposed = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      pending.clear();
    },
  };
}

interface Options {
  nodes: CanvasNode[];
  getNodes(): CanvasNode[];
  setNodes: Binding['setNodes'];
  setSelectedNodeIds: Binding['setSelectedNodeIds'];
  projectId?: string;
  enabled: boolean;
}
export function useCanvasLocalWorkflows(
  hooks: Pick<typeof React, 'useRef' | 'useEffect'>,
  options: Options,
  createId: () => string,
) {
  const live = hooks.useRef(options);
  live.current = options;
  const owner = hooks.useRef<ReturnType<typeof createCanvasLocalWorkflows> | null>(null);
  hooks.useEffect(() => {
    if (!options.enabled) return;
    const controller = createCanvasLocalWorkflows(
      {
        getNodes: () => live.current.getNodes(),
        getProjectId: () => live.current.projectId,
        isActive: () => live.current.enabled,
        setNodes: (update) => live.current.setNodes(update),
        setSelectedNodeIds: (ids) => live.current.setSelectedNodeIds(ids),
      },
      {
        createId,
        run: (request) =>
          (browserServices.__NAKO_VIDEO_WORKFLOWS__ ?? createVideoWorkflowClient()).run(
            'minimax-h3-t2va',
            request,
          ),
        getOperation: (projectId, operationId) =>
          (browserServices.__NAKO_VIDEO_WORKFLOWS__ ?? createVideoWorkflowClient()).getOperation(
            'minimax-h3-t2va', projectId, operationId,
          ),
      },
    );
    owner.current = controller;
    return () => {
      controller.dispose();
      if (owner.current === controller) owner.current = null;
    };
  }, [options.enabled, options.projectId, createId]);
  hooks.useEffect(() => { owner.current?.resume(options.getNodes()); }, [options.enabled, options.projectId, options.getNodes, options.nodes]);
  return {
    ...Object.fromEntries(
      retiredHandlers.map((name) => [name, (id: string) => owner.current?.[name]?.(id)]),
    ),
    handleMiniMaxH3T2VAGenerate: (id: string) => owner.current?.handleMiniMaxH3T2VAGenerate(id),
  };
}

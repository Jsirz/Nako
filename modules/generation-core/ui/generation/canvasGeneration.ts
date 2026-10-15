import { runCanvasGeneration } from './canvasGenerationExecution';
import type * as React from 'react';
export { useCanvasLocalWorkflows } from './canvasLocalWorkflows';
import type { CanvasNode } from '../../../contracts/canvasDocument';
import { installGenerationScheduler } from './generationScheduler';
import {
  generateAudio,
  generateImage,
  generateText,
  generateVideo,
  getGenerationConcurrency,
} from './generationClient';
import type { GenerationModels } from '../../../contracts/generationUi';
export { observeWithin, prepareCanvasGenerationRequest } from './canvasGenerationPreparation';
import { mediaCanvas } from '../../../kernel/browser';
export const inspectImage = (url: string, timeoutMs?: number) => mediaCanvas().inspectImage(url, timeoutMs);
const inspectVideo = (url: string, timeoutMs?: number, includeLastFrame?: boolean) => mediaCanvas().inspectVideo(url, timeoutMs, includeLastFrame);
export const extractVideoLastFrame = (url: string) => mediaCanvas().extractVideoLastFrame(url);

export { generateAudio, generateText, getGenerationConcurrency } from './generationClient';

import type { GenerationBinding, GenerationRuntime, GenerationAuthorization } from '../../../contracts/generationUi';
export type { GenerationBinding, GenerationRuntime, GenerationAuthorization } from '../../../contracts/generationUi';
interface Options extends GenerationModels {
  enabled: boolean;
  nodes: CanvasNode[];
  getNodes(): CanvasNode[];
  projectId?: string;
  updateNode(id: string, patch: Partial<CanvasNode>): void;
}
const defaultRuntime: GenerationRuntime = {
  image: generateImage,
  video: generateVideo,
  audio: generateAudio,
  text: generateText,
  concurrency: getGenerationConcurrency,
  inspectImage,
  inspectVideo,
  now: Date.now,
};

/** An attempt may submit once, and only its live document and node may accept its result. */
export function createCanvasGeneration(
  binding: GenerationBinding,
  models: GenerationModels,
  runtime: GenerationRuntime = defaultRuntime,
) {
  const scheduler = installGenerationScheduler();
  let disposed = false;
  const attempts = new Map<string, string>();
  return {
    async handleGenerate(id: string, authorization?: GenerationAuthorization) {
      const node = binding.getNodes().find((candidate) => candidate.id === id);
      if (
        authorization?.valid() === false ||
        disposed ||
        binding.isActive?.() === false ||
        !node ||
        !['Image', 'Video', 'Audio', 'Text'].includes(node.type)
      )
        return;
      if (
        node.generationAttemptId &&
        node.generationDiagnosticCode === 'GENERATION_OBSERVATION_INTERRUPTED'
      )
        return;
      if (!scheduler.acquire(id)) return;
      const attempt = scheduler.currentAttempt(id)!;
      attempts.set(id, attempt);
      try {
        await runCanvasGeneration({ id, node, authorization, binding, models, runtime, scheduler,
          attempt, isDisposed: () => disposed || attempts.get(id) !== attempt });
      } finally {
        if (attempts.get(id) === attempt) attempts.delete(id);
        scheduler.release(id, attempt);
      }
    },
    dispose() {
      disposed = true;
      attempts.forEach((attempt, id) => scheduler.release(id, attempt));
      attempts.clear();
    },
  };
}

export function useCanvasGeneration(
  hooks: Pick<typeof React, 'useRef' | 'useEffect'>,
  options: Options,
) {
  const input = hooks.useRef(options);
  input.current = options;
  const owner = hooks.useRef<ReturnType<typeof createCanvasGeneration> | null>(null);
  const { imageModels, videoModels, audioModels, textModels, projectId, enabled } = options;
  hooks.useEffect(() => {
    if (!enabled) return;
    const controller = createCanvasGeneration(
      {
        getNodes: () => input.current.getNodes(),
        getProjectId: () => input.current.projectId,
        isActive: () => input.current.enabled,
        updateNode: (id, patch) => input.current.updateNode(id, patch),
      },
      { imageModels, videoModels, audioModels, textModels },
    );
    owner.current = controller;
    return () => {
      controller.dispose();
      if (owner.current === controller) owner.current = null;
    };
  }, [projectId, enabled, imageModels, videoModels, audioModels, textModels]);
  return {
    handleGenerate: (id: string, authorization?: GenerationAuthorization) =>
      owner.current?.handleGenerate(id, authorization),
  };
}

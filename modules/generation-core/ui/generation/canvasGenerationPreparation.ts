import { PluginError } from '../../../contracts/errors.js';
import { GENERATION_ERROR_CODES } from '../../../contracts/generationErrors.js';
import { promptComposition } from '../../../kernel/browser';
import type { CanvasNode } from '../../../contracts/canvasDocument';
import type { GenerationModels, GenerationAuthorization } from '../../../contracts/generationUi';
import { installGenerationScheduler } from './generationScheduler';
import { buildAudioRequest, buildImageRequest, buildTextRequest, buildVideoRequest, finite } from './canvasGenerationRequests';

export function timeoutFor(estimate: string | undefined, multiplier: unknown) {
  const amount = parseInt(estimate ?? '', 10);
  const milliseconds =
    !estimate || !Number.isFinite(amount)
      ? 300000
      : estimate.includes('min')
        ? amount * 60000
        : estimate.includes('s')
          ? amount * 1000
          : amount;
  return Math.max(1000, milliseconds * 3 * Math.max(1, finite(multiplier, 1)));
}

export async function observeWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PluginError(
      GENERATION_ERROR_CODES.observationInterrupted,
      '等待结果超时，正在核对原任务，请勿重复生成。',
      { context: { moduleId: 'generation-core', operation: 'observeGeneration', timeoutMs } },
    )), timeoutMs);
  });
  try {
    return await Promise.race([promise, limit]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const withTimestamp = (url: string, now: number) => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const [path, hash] = url.split('#', 2);
  return `${path}${path.includes('?') ? '&' : '?'}t=${now}${hash === undefined ? '' : `#${hash}`}`;
};

export async function prepareCanvasGenerationRequest(
  nodes: CanvasNode[],
  node: CanvasNode,
  projectId: string | undefined,
  models: GenerationModels,
) {
  const prompt = promptComposition().expandTags(installGenerationScheduler().buildPrompt(nodes, node), {
    trailingParameters: node.imageModel === 'Midjourney Imagine · API',
  });
  return node.type === 'Image'
    ? buildImageRequest(nodes, node, prompt, projectId, models)
    : node.type === 'Video'
      ? buildVideoRequest(nodes, node, prompt, projectId, models)
      : node.type === 'Audio'
        ? buildAudioRequest(nodes, node, prompt, projectId, models)
        : buildTextRequest(nodes, node, prompt, projectId, models);
}

export async function authorizeGeneration(
  authorization: GenerationAuthorization | undefined,
  request: Record<string, unknown>,
  attempt: string,
  owns: () => boolean,
) {
  if (!owns()) return false;
  if (authorization && (!authorization.valid() || authorization.request !== JSON.stringify(request)))
    return false;
  if (authorization?.reserve) {
    await authorization.reserve(attempt);
    if (!owns() || !authorization.valid()) return false;
  }
  return true;
}

import { GENERATION_ERROR_CODES } from '../../../contracts/generationErrors.js';
import { ERRORS, PluginError } from '../../../contracts/errors.js';
import { browserHost } from '../../../kernel/browser';
import { installGenerationScheduler } from './generationScheduler';
import type { NodeGenerationClient } from '../../../contracts/nodeExecution.js';
type Result = Record<string, unknown>;
async function responseBody(response: Response): Promise<Result> {
  const value: unknown = await response.json().catch(() => null);
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Result) : {};
}
async function submit(
  kind: 'image' | 'video' | 'audio' | 'text',
  request: Record<string, unknown>,
): Promise<Result> {
  return browserHost.services.get<NodeGenerationClient>('nodes.client').generate(kind,
    installGenerationScheduler().decorateRequest(request));
}
const unconfirmed = () =>
  new PluginError(GENERATION_ERROR_CODES.observationInterrupted, '结果尚未确认，正在核对原任务。', {
    context: { moduleId: 'generation-core', operation: 'observeResponse' },
  });
/** A response is observed once. Neither transport loss nor malformed JSON replays a submission. */
async function generateMedia(
  kind: 'image' | 'video' | 'audio',
  request: Record<string, unknown>,
): Promise<string | string[]> {
  const result = await submit(kind, request);
  const urls = Array.isArray(result.resultUrls)
    ? result.resultUrls.filter(
        (url): url is string => typeof url === 'string' && Boolean(url.trim()),
      )
    : [];
  if (urls.length) return urls;
  if (typeof result.resultUrl === 'string' && result.resultUrl.trim()) return result.resultUrl;
  throw unconfirmed();
}
export const generateImage = (request: Record<string, unknown>) => generateMedia('image', request);
export const generateVideo = (request: Record<string, unknown>) => generateMedia('video', request);
export const generateAudio = (request: Record<string, unknown>) => generateMedia('audio', request);
export async function generateText(
  request: Record<string, unknown>,
): Promise<Result & { text: string }> {
  const result = await submit('text', request);
  if (typeof result.text !== 'string' || !result.text) throw unconfirmed();
  return { ...result, text: result.text };
}
export async function getGenerationConcurrency(
  modelName: string,
  mode: string,
  signal?: AbortSignal,
): Promise<{ blocked: boolean; modelId?: string; inFlight: number; maxConcurrent: number }> {
  const query = new URLSearchParams({ modelName, mode });
  const response = await window.fetch(
    `/api/generation-concurrency?${query}`,
    ...(signal ? [{ signal }] : []),
  );
  const result = await responseBody(response);
  if (!response.ok || typeof result.blocked !== 'boolean')
    throw new PluginError(ERRORS.generationState, typeof result.error === 'string' ? result.error : '并发状态查询失败', {
      status: response.status, context: { moduleId: 'generation-core', operation: 'getConcurrency', modelName, mode },
    });
  return {
    blocked: result.blocked,
    modelId: typeof result.modelId === 'string' ? result.modelId : undefined,
    inFlight: Number(result.inFlight) || 0,
    maxConcurrent: Number(result.maxConcurrent) || 0,
  };
}

import { browserHost, promptComposition } from '../../../kernel/browser';
import { declaredModel, type DefaultModelsClient, type ModelKind } from '../../../contracts/defaultModels.js';
import type { CanvasNode } from '../../../contracts/canvasDocument';
import type {
  GenerationModels, GenerationBinding, GenerationRuntime, GenerationAuthorization,
} from '../../../contracts/generationUi';
import type { GenerationSchedulerAdapter } from '../../../contracts/generationScheduler';
import { PluginError } from '../../../contracts/errors.js';
import { GENERATION_ERROR_CODES } from '../../../contracts/generationErrors.js';
import { interruptedGenerationPatch } from './generationRecovery';
import { mergeImageResultHistory } from './imageResultHistory';
import { effectiveVideoMode, text } from './canvasGenerationRequests';
import {
  prepareCanvasGenerationRequest, authorizeGeneration, observeWithin, timeoutFor, withTimestamp,
} from './canvasGenerationPreparation';

interface AttemptOptions {
  id: string;
  node: CanvasNode;
  authorization?: GenerationAuthorization;
  binding: GenerationBinding;
  models: GenerationModels;
  runtime: GenerationRuntime;
  scheduler: GenerationSchedulerAdapter;
  attempt: string;
  isDisposed(): boolean;
}

export async function runCanvasGeneration({
  id, node, authorization, binding, models, runtime, scheduler, attempt, isDisposed,
}: AttemptOptions) {
  const projectId = binding.getProjectId();
  const nodes = binding.getNodes();
  const inputsUnchanged = captureDependencies(nodes, node, binding);
  let startedAt: number | undefined;
  const owns = () => {
    const current = binding.getNodes().find((candidate) => candidate.id === id);
    return (
      !isDisposed() &&
      binding.isActive?.() !== false &&
      scheduler.currentAttempt(id) === attempt &&
      binding.getProjectId() === projectId &&
      current?.type === node.type &&
      (startedAt === undefined
        ? current === node && inputsUnchanged()
        : current.generationAttemptId === attempt)
    );
  };
  const publish = (patch: Partial<CanvasNode>) => {
    if (owns()) binding.updateNode(id, patch);
  };
  try {
    const { modelName, model, mode } = resolveModel(node, authorization, models, nodes);
    const prompt = promptComposition().expandTags(scheduler.buildPrompt(nodes, node), {
      trailingParameters: node.imageModel === 'Midjourney Imagine · API',
    });
    const inputError = generationInputError(node, prompt);
    if (inputError) {
      publish({ status: 'error', errorMessage: inputError });
      return;
    }
    if (modelName) {
      const concurrency = await runtime.concurrency(modelName, mode);
      if (!owns()) return;
      if (concurrency.blocked) {
        publish({
          status: 'error',
          errorMessage: `${concurrency.modelId || modelName} 并发已满${concurrency.inFlight}/${concurrency.maxConcurrent}，请稍后再试。`,
        });
        return;
      }
    }
    const resolvedNode = { ...node, [node.type.toLowerCase() + 'Model']: modelName };
    const request = await prepareCanvasGenerationRequest(nodes, resolvedNode, projectId, models);
    if (!(await authorizeGeneration(authorization, request, attempt, owns))) return;
    if (!owns() || authorization?.valid() === false) return;
    // Keep previous visual media and geometry until the new result is ready.
    const loading = {
      status: 'loading',
      generationStartTime: runtime.now(),
      generationAttemptId: attempt,
      generationDiagnosticCode: undefined,
      errorMessage: undefined,
      ...(['Image', 'Video'].includes(node.type)
        ? {} : { resultUrl: undefined, resultUrls: undefined }),
    };
    publish(loading);
    startedAt = loading.generationStartTime;
    if (!owns()) return;
    const ownedRequest = {
      ...request,
      generationAttemptId: attempt,
      ...(authorization?.authorizationId
        ? { agentAuthorizationId: authorization.authorizationId } : {}),
      ...(authorization?.planId ? { agentPlanId: authorization.planId } : {}),
    };
    const timeout = timeoutFor(
      model?.timeEstimate, node.type === 'Video' ? node.duration : node.generateCount,
    );
    authorization?.submitted(attempt);
    const patch = await generatePatch(node, ownedRequest, runtime, timeout, binding, id, owns);
    publish({
      ...patch,
      status: 'success',
      errorMessage: undefined,
      networkUrl: null,
      generationStartTime: undefined,
      generationAttemptId: undefined,
      generationDurationMs: runtime.now() - startedAt,
      generationDiagnosticCode: undefined,
    });
  } catch (error) {
    publish(generationFailurePatch(error, id, attempt, startedAt, runtime.now()));
  }
}

function captureDependencies(nodes: CanvasNode[], node: CanvasNode, binding: GenerationBinding) {
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const dependencies = new Map<string, CanvasNode | undefined>();
  const pending = [...(node.parentIds || [])];
  while (pending.length) {
    const parentId = pending.pop()!;
    if (dependencies.has(parentId)) continue;
    const parent = byId.get(parentId);
    dependencies.set(parentId, parent);
    for (const id of parent?.parentIds || []) pending.push(id);
  }
  return () => {
    const current = new Map(binding.getNodes().map((candidate) => [candidate.id, candidate]));
    return [...dependencies].every(([id, parent]) => current.get(id) === parent);
  };
}

function resolveModel(
  node: CanvasNode,
  authorization: GenerationAuthorization | undefined,
  models: GenerationModels,
  nodes: CanvasNode[],
) {
  const kind = node.type.toLowerCase() as ModelKind;
  const approvedModel = authorization ? JSON.parse(authorization.request)?.[kind + 'Model'] : '';
  const modelName = declaredModel(kind, node) || approvedModel ||
    browserHost.services.optional<DefaultModelsClient>('generation.defaults')?.resolve(kind) || '';
  const catalog = node.type === 'Image' ? models.imageModels
    : node.type === 'Video' ? models.videoModels
      : node.type === 'Text' ? models.textModels : models.audioModels;
  const model = catalog.find((candidate) => candidate.name === modelName);
  const mode = node.type === 'Video'
    ? effectiveVideoMode(nodes, { ...node, [kind + 'Model']: modelName }, model)
    : text(node[node.type === 'Image' ? 'imageMode'
      : node.type === 'Audio' ? 'audioMode' : 'languageMode']);
  return { modelName, model, mode };
}

function generationInputError(node: CanvasNode, prompt: string) {
  const lyrics = node.type === 'Audio' && node.audioMode === 'lyrics-to-music';
  const stems = node.type === 'Audio' && node.audioModel === 'Suno Stems · API';
  const klingFrames = node.type === 'Video' && text(node.videoModel).startsWith('kling-') &&
    (node.parentIds?.length ?? 0) >= 2;
  if ((prompt || lyrics || stems || klingFrames) &&
    (!lyrics || text(node.lyrics).trim()) && (!stems || text(node.task_id).trim())) return null;
  return lyrics ? '歌词模式请先填写歌词。'
    : stems ? '请填写原始 Suno task_id。' : '请输入提示词或连接文本节点后再生成。';
}

function generationFailurePatch(
  error: unknown, id: string, attempt: string, startedAt: number | undefined, now: number,
): Partial<CanvasNode> {
  const failure = error instanceof Error ? error : new PluginError(
    GENERATION_ERROR_CODES.failed, String(error),
    { context: { moduleId: 'generation-core', operation: 'generate', nodeId: id, attemptId: attempt } },
  );
  const code = 'code' in failure && typeof failure.code === 'string'
    ? failure.code : GENERATION_ERROR_CODES.failed;
  const message = /permission_denied|\b403\b/i.test(failure.message)
    ? '权限被拒绝。请检查 API Key 配置。' : failure.message || '生成任务失败';
  return {
    status: 'error',
    errorMessage: message,
    generationDiagnosticCode: code,
    generationStartTime: undefined,
    generationAttemptId: undefined,
    generationDurationMs: startedAt === undefined ? undefined : now - startedAt,
    ...(startedAt === undefined ? {}
      : interruptedGenerationPatch(Object.assign(failure, { code }), attempt)),
  };
}

async function generatePatch(
  node: CanvasNode,
  request: Record<string, unknown>,
  runtime: GenerationRuntime,
  timeout: number,
  binding: GenerationBinding,
  id: string,
  owns: () => boolean,
): Promise<Partial<CanvasNode>> {
  if (node.type === 'Text')
    return { textContent: (await observeWithin(runtime.text(request), timeout)).text };
  const generate = node.type === 'Image' ? runtime.image
    : node.type === 'Video' ? runtime.video : runtime.audio;
  const result = await observeWithin(generate(request), timeout);
  if (!owns()) return {};
  const urls = (Array.isArray(result) ? result : [result]).map((url) => withTimestamp(url, runtime.now()));
  if (node.type === 'Image') {
    const metadata = await runtime.inspectImage(urls[0]).catch(() => ({}));
    if (!owns()) return {};
    const current = binding.getNodes().find((candidate) => candidate.id === id)!;
    return {
      ...mergeImageResultHistory({ resultUrl: current.resultUrl, resultUrls: current.resultUrls }, urls),
      ...('resultAspectRatio' in metadata ? { resultAspectRatio: metadata.resultAspectRatio } : {}),
    };
  }
  if (node.type === 'Video') return {
    resultUrl: urls[0],
    resultUrls: urls,
    lastFrame: undefined,
    resultAspectRatio: undefined,
    naturalWidth: undefined,
    naturalHeight: undefined,
    ...(await runtime.inspectVideo(urls[0]).catch(() => ({}))),
  };
  return { resultUrl: urls[0], resultUrls: urls };
}

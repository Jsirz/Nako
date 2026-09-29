import { loadModelCatalog } from '../config/modelCatalog.js';
import { createHash } from 'node:crypto';
import { NODE_ERROR, nodeError } from '../../../contracts/nodeExecution.js';

const baseOptions = ['aspectRatio', 'resolution', 'duration', 'imageMode', 'videoMode', 'audioMode', 'languageMode', 'mode',
  'temperature', 'maxTokens', 'systemPrompt', 'negativePrompt', 'seed', 'sound', 'audio', 'voice', 'speed', 'lyrics',
  'generate_audio', 'web_search', 'detail', 'quality', 'klingReferenceMode', 'klingFaceIntensity', 'klingSubjectIntensity', 'cost', 'midjourneyReferences'];
const forbidden = /(?:key|secret|credential|password|url|path|proxy|authorization|model|generatecount|^n$|^token$|access.?token)/i;
export const nodeModelAttemptId = context => createHash('sha256').update(JSON.stringify([context.runId, context.stepId])).digest('hex');

/** Resolve only the original scoped task; never generate or resolve a new model. */
export function createNodeModelObserver({ coordinator, recoverTask, applicationContext }) {
  return async context => {
    const attemptId = nodeModelAttemptId(context), nodeId = 'node-' + attemptId;
    let task = coordinator.getTask(nodeId);
    if (!task || task.attemptId !== attemptId || task.projectId !== context.projectId) return null;
    task = await recoverTask(task, applicationContext);
    if (!task || task.attemptId !== attemptId || task.projectId !== context.projectId) return null;
    return { status: task.status, recoveryPending: task.recoveryPending, type: task.kind,
      resultUrl: task.resultUrl, resultUrls: task.resultUrls, text: task.text, code: task.code, error: task.error };
  };
}
export function createNodeModelService({ generate, defaults, catalog = loadModelCatalog }) {
  return async function generateNode(input, context) {
    const kind = input.kind;
    const model = await defaults.resolve(kind, input.model);
    const config = catalog()[model];
    if (!config) throw nodeError(NODE_ERROR.INVALID, '模型未安装');
    const allowed = new Set([...baseOptions, ...(config.advancedParams || []).map(item => item.key).filter(key => !forbidden.test(key))]);
    const parameters = Object.fromEntries(Object.entries(input.options || {}).filter(([key]) => allowed.has(key)));
    const refs = input.references || [];
    const images = refs.filter(item => item.type === 'image').map(item => item.url);
    const videos = refs.filter(item => item.type === 'video').map(item => item.url);
    const audios = refs.filter(item => item.type === 'audio').map(item => item.url);
    const media = kind === 'video' ? { images, videos, audios } : {
      ...(images.length ? { imageBase64: images } : {}), ...(kind === 'text' && videos.length ? { videoUrl: videos[0] } : {}),
      ...(kind === 'audio' || audios.length ? { audios } : {}),
    };
    const attemptId = nodeModelAttemptId(context);
    return generate(kind, { ...parameters, ...media, [kind + 'Model']: model, prompt: String(input.prompt || ''),
      projectId: context.projectId, nodeId: 'node-' + attemptId, generationAttemptId: attemptId,
      ...(kind === 'text' ? {} : { generateCount: input.count ?? 1 }), agentAuthorizationId: context.authorizationId, agentPlanId: context.planId, signal: context.signal });
  };
}

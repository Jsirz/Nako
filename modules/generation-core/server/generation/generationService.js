import { PROVIDERS, resolveFinalExecutionContext } from './providerDispatch.js';
import { executeGenerationTask } from './generationExecution.js';
import { loadModelCatalog, normalizeModelDuration } from '../config/modelCatalog.js';

export function createGenerationService(options) {
  const image = createImageGenerationService(options);
  return async (kind, input) => {
    if (kind === 'image') return image(input);
    if (!['text', 'video', 'audio'].includes(kind)) throw Object.assign(new Error('Unsupported generation kind'), { code: 'UNSUPPORTED_GENERATION_PROVIDER' });
    const { applicationContext = {}, mediaService, generationCoordinator, defaultModels } = options;
    const model = await defaultModels.resolve(kind, input[kind + 'Model']);
    const request = { ...input, [kind + 'Model']: model };
    if (kind === 'video') request.duration = normalizeModelDuration(loadModelCatalog()[model], request.duration) ?? request.duration;
    const provider = PROVIDERS.get(model);
    const mode = request[kind + 'Mode'] || request.languageMode || request.mode;
    const executionContext = resolveFinalExecutionContext(model, mode);
    if (!executionContext || !provider) throw Object.assign(new Error('Unsupported model: ' + model), { code: 'UNSUPPORTED_GENERATION_PROVIDER' });
    return executeGenerationTask({
      kind, nodeId: request.nodeId, modelName: model, providerName: provider.providerName,
      executionContext, request, appContext: applicationContext, provider, coordinator: generationCoordinator,
      saveResult: result => {
        if (kind === 'text') {
          const persisted = { ...result, type: 'text', model, createdAt: new Date().toISOString() };
          (applicationContext.textResultCache ||= new Map()).set(request.nodeId, persisted);
          return result;
        }
        const urls = (Array.isArray(result) ? result : [result]).map((item, index) => mediaService.saveBuffer(
          item.buffer, request.projectId || 'default', kind === 'video' ? 'videos' : 'audios',
          item.format || (kind === 'video' ? 'mp4' : 'mp3'),
          { prompt: request.prompt, model, mode, duration: request.duration, aspectRatio: request.aspectRatio, resolution: request.resolution },
          index ? request.nodeId + '-' + index : request.nodeId,
        ).url);
        return urls.length === 1 ? { resultUrl: urls[0], type: kind } : { resultUrls: urls, type: kind };
      },
    });
  };
}

/** Explicit generation service shared by HTTP and Agent business workflows. */
export function createImageGenerationService({
  applicationContext = {},
  mediaService,
  generationCoordinator,
  defaultModels,
}) {
  const { saveBuffer: saveMediaBufferToFile, createId: generateAssetId } = mediaService;
  return async (request) => {
    if (defaultModels)
      request = {
        ...request,
        imageModel: await defaultModels.resolve('image', request.imageModel),
      };
    const { imageModel, nodeId, prompt, projectId, cost, aspectRatio, resolution, imageMode } =
      request;
    const provider = PROVIDERS.get(imageModel);
    if (!provider || !provider.generateImage) {
      throw Object.assign(new Error(`Unsupported or disabled image model: ${imageModel}`), {
        status: 400,
        code: 'UNSUPPORTED_GENERATION_PROVIDER',
      });
    }
    const concurrencyCtx = resolveFinalExecutionContext(imageModel, imageMode);
    if (!concurrencyCtx) {
      throw Object.assign(new Error('Cannot resolve image model'), {
        status: 400,
        code: 'UNSUPPORTED_GENERATION_PROVIDER',
      });
    }
    const response = await executeGenerationTask({
      kind: 'image',
      nodeId,
      modelName: imageModel,
      providerName: provider.providerName,
      executionContext: concurrencyCtx,
      request: request,
      appContext: applicationContext,
      provider,
      coordinator: generationCoordinator,
      saveResult: (providerResult) => {
        const results = Array.isArray(providerResult) ? providerResult : [providerResult];
        const savedResults = results.map((item, index) => {
          const assetId =
            index === 0 ? nodeId || generateAssetId() : `${nodeId || generateAssetId()}-${index}`;
          const saved = saveMediaBufferToFile(
            item.buffer,
            projectId || 'default',
            'images',
            item.format,
            {
              id: assetId,
              prompt,
              model: imageModel,
              mode: imageMode || '',
              aspectRatio,
              resolution,
              ...(provider.providerName === 'SeedVr2ImageProvider'
                ? { cost: null, costStatus: 'unknown', operation: 'seedvr2-upscale' }
                : { cost: typeof cost === 'number' ? cost : 0 }),
            },
            assetId,
          );
          return saved.url;
        });
        return savedResults.length === 1
          ? { resultUrl: savedResults[0], type: 'image' }
          : { resultUrls: savedResults, type: 'image' };
      },
    });

    return response;
  };
}

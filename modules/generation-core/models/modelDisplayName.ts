import { AUDIO_MODELS, IMAGE_MODELS, TEXT_MODELS, VIDEO_MODELS } from './catalog';

export function modelDisplayName(name: unknown, modelId?: unknown): string {
  const identity = typeof name === 'string' ? name.trim() : '';
  const executionId = typeof modelId === 'string' ? modelId.trim() : '';
  const models = [...TEXT_MODELS, ...IMAGE_MODELS, ...AUDIO_MODELS, ...VIDEO_MODELS];
  const current = models.find(entry => entry.name === identity);
  if (current?.displayName) return current.displayName;
  const labeled = models.find(entry => entry.displayName && (
    entry.name === executionId || Object.values(entry.endpoint).some(endpoint =>
      endpoint.model === identity || endpoint.model === executionId,
    )
  ));
  return labeled?.displayName || identity || executionId || '未知模型';
}

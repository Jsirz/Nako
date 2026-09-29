import { PROVIDERS } from './providerDispatch.js';
import { createGenerationTaskRecovery } from './generationTaskRecovery.js';

/** Shared read-only recovery for HTTP and node executions. Never submits work. */
export function createGenerationRecoveryService({ generationCoordinator, mediaService }) {
  const saveMediaBufferToFile = mediaService.saveBuffer;
  return createGenerationTaskRecovery({
    coordinator: generationCoordinator,
    resolveProvider: (task) => {
      const provider = PROVIDERS.get(task.modelName);
      const suffix = task.kind === 'image' ? 'Image' : 'Video';
      if (provider?.providerName !== task.providerName || !provider?.[`recover${suffix}`])
        return null;
      const params = provider.recoveryParameters(task);
      return {
        canRecover: (reference, context) =>
          provider[`canRecover${suffix}`](reference, params, context),
        recover: (record, context, signal) =>
          provider[`recover${suffix}`](
            task.kind === 'image' ? record : record.remoteTask,
            params,
            context,
            signal,
          ),
      };
    },
    saveResult: ({ buffer, format, results }, task) => {
      if (task.kind === 'image') {
        const resultUrls = results.map(
          (image) =>
            saveMediaBufferToFile(
              image.buffer,
              task.projectId || 'default',
              'images',
              image.format,
              {
                prompt: task.prompt,
                model: task.modelName,
                mode: task.imageMode || '',
                aspectRatio: task.aspectRatio,
                resolution: task.resolution,
                ...(task.providerName === 'SeedVr2ImageProvider'
                  ? { cost: null, costStatus: 'unknown', operation: 'seedvr2-upscale' }
                  : { cost: task.estimatedCost || 0 }),
                generationAttemptId: task.attemptId,
              },
              task.nodeId,
            ).url,
        );
        return { resultUrl: resultUrls[0], resultUrls, type: 'image' };
      }
      const saved = saveMediaBufferToFile(
        buffer,
        task.projectId || 'default',
        'videos',
        format || 'mp4',
        {
          prompt: task.prompt,
          model: task.modelName,
          mode: task.videoMode || '',
          aspectRatio: task.aspectRatio,
          resolution: task.resolution,
          duration: task.duration,
          cost: task.estimatedCost || 0,
          generationAttemptId: task.attemptId,
        },
        task.nodeId,
      );
      return { resultUrl: saved.url, type: 'video' };
    },
  });
}

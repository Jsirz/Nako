import { ERRORS, PluginError } from './errors.js';

/** Shared error contract for media validation and operation failures. */
export function mediaError(message, context = {}) {
  return new PluginError(ERRORS.invalidMedia, message, {
    status: 400,
    context: { moduleId: 'asset-media', operation: 'validateMedia', ...context },
  });
}

export class MediaArtifactError extends PluginError {
  constructor(message, operationCode = 'MEDIA_ARTIFACT_UNSUPPORTED') {
    super(ERRORS.invalidMedia, message, {
      status: 415, context: { moduleId: 'asset-media', operation: 'inspectArtifact', operationCode },
    });
    this.name = 'MediaArtifactError';
  }
}

export class MediaProbeError extends PluginError {
  constructor(message, status, operationCode, cause) {
    super(status >= 500 ? ERRORS.mediaStorage : ERRORS.invalidMedia, message, {
      status, cause, context: { moduleId: 'asset-media', operation: 'probeMedia', operationCode },
    });
    this.name = 'MediaProbeError';
  }
}

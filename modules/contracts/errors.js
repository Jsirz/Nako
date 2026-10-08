/** Platform-independent errors. Import this leaf from validators to avoid barrel cycles. */
export const ERRORS = Object.freeze({
  invalidManifest: 'PLUGIN_INVALID_MANIFEST', incompatible: 'PLUGIN_API_INCOMPATIBLE',
  duplicate: 'PLUGIN_DUPLICATE', missing: 'PLUGIN_NOT_FOUND', dependency: 'PLUGIN_DEPENDENCY',
  serviceMissing: 'SERVICE_NOT_FOUND', serviceDuplicate: 'SERVICE_DUPLICATE',
  permission: 'PLUGIN_PERMISSION_DENIED', busy: 'PLUGIN_BUSY', inactive: 'PLUGIN_INACTIVE',
  invalidMedia: 'INVALID_MEDIA_ASSET',
  invalidModel: 'INVALID_MODEL_CONFIGURATION',
  providerRequest: 'PROVIDER_REQUEST_FAILED',
  workFisherRequest: 'WORK_FISHER_REQUEST_FAILED',
  credentialMissing: 'PROVIDER_CREDENTIAL_MISSING',
  invalidProjectArchive: 'INVALID_PROJECT_ARCHIVE',
  projectTransfer: 'PROJECT_TRANSFER_FAILED',
  desktopUpdate: 'DESKTOP_UPDATE_FAILED',
  agentOperationSync: 'AGENT_OPERATION_SYNC_FAILED',
  nodePackage: 'NODE_PACKAGE_ERROR',
  mediaStorage: 'MEDIA_STORAGE_FAILED',
  mediaNotFound: 'MEDIA_NOT_FOUND',
  invalidCanvas: 'INVALID_CANVAS_OPERATION',
  invalidConfiguration: 'INVALID_CONFIGURATION',
  generationState: 'INVALID_GENERATION_TRANSITION',
  taskPersistence: 'GENERATION_TASK_PERSISTENCE_FAILED',
});
export class PluginError extends Error {
  constructor(code, message, { context = {}, status, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'PluginError';
    this.code = code;
    this.context = Object.freeze({ ...context });
    if (status !== undefined) this.status = status;
  }
}
export function protocolError(protocol, message, context = {}) {
  return new PluginError(ERRORS.invalidCanvas, message, {
    status: 400,
    context: { moduleId: 'contracts', protocol, operation: 'projectResult', ...context },
  });
}

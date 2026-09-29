/** Stable protocol shared by the browser, server and plugin authors. No platform imports. */
export const PLUGIN_API_VERSION = '1.0.0';
export const PLUGIN_TYPES = Object.freeze(['module', 'provider', 'workflow', 'storage', 'media', 'platform']);
export const SERVICES = Object.freeze({
  providers: 'generation.providers', project: 'project.repository', media: 'media.store',
  mediaProcessor: 'media.processor', generation: 'generation.service', workflow: 'workflow.service',
  credentials: 'identity.credentials', localRuntime: 'local.runtime',
});
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
});
export * from './agentProtocol.js';
export * from './agentSession.js';
export * from './pluginValidation.js';
export * from './nodeSdk.js';
export class PluginError extends Error {
  constructor(code, message) { super(message); this.name = 'PluginError'; this.code = code; }
}

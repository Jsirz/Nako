/** Stable protocol shared by the browser, server and plugin authors. No platform imports. */
export const PLUGIN_API_VERSION = '1.0.0';
export const PLUGIN_TYPES = Object.freeze(['module', 'provider', 'workflow', 'storage', 'media', 'platform']);
export const SERVICES = Object.freeze({
  providers: 'generation.providers', project: 'project.repository', media: 'media.store',
  mediaProcessor: 'media.processor', generation: 'generation.service', workflow: 'workflow.service',
  credentials: 'identity.credentials', localRuntime: 'local.runtime',
});
export { ERRORS, PluginError } from './errors.js';
export * from './agentProtocol.js';
export * from './agentSession.js';
export * from './pluginValidation.js';
export * from './nodeSdk.js';
export * from './generationAdmission.js';
export * from './agentTextGeneration.js';
export * from './generationService.js';
export * from './mediaDelivery.js';
export * from './identityErrors.js';
export * from './desktopErrors.js';
export * from './providerErrors.js';
export * from './generationErrors.js';
export * from './localRuntimeErrors.js';
export * from './agentErrors.js';
export * from './canvasErrors.js';
export * from './projectErrors.js';
export * from './storageErrors.js';

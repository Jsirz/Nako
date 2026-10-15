import { ServiceRegistry } from './index.js';

/** One backend process owns one registry. The application host supplies its services. */
export const serverServices = new ServiceRegistry();
/** @returns {import('../contracts/platformPaths').PlatformPathsService} */
export const platformPaths = () => serverServices.get('platform.paths');
/** @returns {import('../contracts/mediaRuntime').MediaRuntimeService} */
export const mediaRuntime = () => serverServices.get('media.runtime');
/** @returns {import('../contracts/mediaRuntime').MediaFileService} */
export const mediaFiles = () => serverServices.get('media.files');
/** @returns {import('../contracts/httpSecurity').IdentityHttpSecurity} */
export const httpSecurity = () => serverServices.get('identity.httpSecurity');
/** @returns {import('../contracts/mediaDelivery').ExternalMediaFetch} */
export const externalMediaFetch = () => serverServices.get('identity.externalUrlFetch');
/** @returns {import('../contracts/localRuntimeService').LocalRuntimeService} */
export const localPlatform = () => serverServices.get('local.runtime');
/** @returns {import('../contracts/localRuntimeService').DirectoryPickerService} */
export const directoryPicker = () => serverServices.get('platform.directories');
/** @returns {import('../contracts/generationReceipts').GenerationReceiptService} */
export const generationReceipts = () => serverServices.get('generation.receipts');
/** @returns {import('../contracts/index.js').WorkflowExecutors} */
export const workflowExecutors = () => serverServices.get('workflow.executors');
/** @returns {import('../contracts/workflowSupport').WorkflowSupportService} */
export const workflowSupport = () => serverServices.get('workflow.support');

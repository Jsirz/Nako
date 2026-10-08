export const ERRORS: Readonly<{
  invalidManifest: 'PLUGIN_INVALID_MANIFEST'; incompatible: 'PLUGIN_API_INCOMPATIBLE';
  duplicate: 'PLUGIN_DUPLICATE'; missing: 'PLUGIN_NOT_FOUND'; dependency: 'PLUGIN_DEPENDENCY';
  serviceMissing: 'SERVICE_NOT_FOUND'; serviceDuplicate: 'SERVICE_DUPLICATE';
  permission: 'PLUGIN_PERMISSION_DENIED'; busy: 'PLUGIN_BUSY'; inactive: 'PLUGIN_INACTIVE';
  invalidMedia: 'INVALID_MEDIA_ASSET'; invalidModel: 'INVALID_MODEL_CONFIGURATION';
  providerRequest: 'PROVIDER_REQUEST_FAILED'; workFisherRequest: 'WORK_FISHER_REQUEST_FAILED';
  credentialMissing: 'PROVIDER_CREDENTIAL_MISSING'; invalidProjectArchive: 'INVALID_PROJECT_ARCHIVE';
  projectTransfer: 'PROJECT_TRANSFER_FAILED'; desktopUpdate: 'DESKTOP_UPDATE_FAILED';
  agentOperationSync: 'AGENT_OPERATION_SYNC_FAILED'; nodePackage: 'NODE_PACKAGE_ERROR';
  mediaStorage: 'MEDIA_STORAGE_FAILED'; mediaNotFound: 'MEDIA_NOT_FOUND';
  invalidCanvas: 'INVALID_CANVAS_OPERATION'; invalidConfiguration: 'INVALID_CONFIGURATION';
  generationState: 'INVALID_GENERATION_TRANSITION'; taskPersistence: 'GENERATION_TASK_PERSISTENCE_FAILED';
}>;
export type ErrorCode = (typeof ERRORS)[keyof typeof ERRORS]
  | 'NON_LOCAL_COMFY_SERVER'
  | import('./identityErrors.js').IdentityErrorCode
  | (typeof import('./desktopErrors.js').DESKTOP_ERRORS)[keyof typeof import('./desktopErrors.js').DESKTOP_ERRORS]
  | (typeof import('./providerErrors.js').PROVIDER_ERRORS)[keyof typeof import('./providerErrors.js').PROVIDER_ERRORS]
  | import('./generationAdmission.js').GenerationAdmissionCode
  | import('./projectErrors.js').ProjectErrorCode
  | import('./projectErrors.js').ProjectTransferErrorCode
  | import('./projectErrors.js').UserScopeErrorCode
  | import('./storageErrors.js').StorageErrorCode
  | (typeof import('./generationErrors.js').GENERATION_ERROR_CODES)[keyof typeof import('./generationErrors.js').GENERATION_ERROR_CODES]
  | (typeof import('./agentErrors.js').AGENT_ERROR_CODES)[keyof typeof import('./agentErrors.js').AGENT_ERROR_CODES]
  | 'NODE_INVALID' | 'NODE_CAPABILITY_DENIED' | 'NODE_EXECUTOR_MISSING' | 'NODE_VERSION_MISMATCH'
  | 'NODE_EXECUTION_CANCELLED' | 'NODE_TIMEOUT' | 'NODE_REQUEST_CONFLICT' | 'NODE_BUDGET_EXCEEDED'
  | 'NODE_CONFIRMATION_REQUIRED' | 'NODE_EXECUTION_FAILED' | 'NODE_RUN_NOT_FOUND';
export interface ErrorOptions { context?: Record<string, unknown>; status?: number; cause?: unknown }
export class PluginError extends Error {
  code: ErrorCode;
  context: Readonly<Record<string, unknown>>;
  status?: number;
  constructor(code: ErrorCode, message: string, options?: ErrorOptions);
}
export function protocolError(protocol: string, message: string, context?: Record<string, unknown>): PluginError;

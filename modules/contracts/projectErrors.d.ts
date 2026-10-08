import { PluginError, type ErrorOptions } from './errors.js';
export const PROJECT_ERRORS: Readonly<{
  invalidDocument: 'INVALID_PROJECT_DOCUMENT'; request: 'PROJECT_REQUEST_FAILED';
  stale: 'STALE_WORKFLOW'; revisionConflict: 'REVISION_CONFLICT';
  recoveryCorrupted: 'RECOVERY_POINT_CORRUPTED'; storage: 'PROJECT_STORAGE_FAILED';
  configuration: 'PROJECT_CONFIGURATION_INVALID';
}>;
export const PROJECT_TRANSFER_ERRORS: Readonly<{
  invalid: 'INVALID_PROJECT_ARCHIVE'; tooLarge: 'ARCHIVE_TOO_LARGE'; invalidPath: 'ARCHIVE_PATH_INVALID';
  missing: 'ARCHIVE_NOT_FOUND'; tooManyEntries: 'TOO_MANY_ENTRIES';
  showcaseMissing: 'SHOWCASE_ARCHIVE_NOT_LISTED'; download: 'SHOWCASE_DOWNLOAD_FAILED';
}>;
export const USER_SCOPE_ERRORS: Readonly<{
  invalid: 'USER_SCOPE_INVALID'; missingSubject: 'USER_SCOPE_SUBJECT_MISSING';
  confusableSubject: 'USER_SCOPE_SUBJECT_CONFUSABLE'; nonCanonicalSubject: 'USER_SCOPE_SUBJECT_NON_CANONICAL';
  reservedSubject: 'USER_SCOPE_SUBJECT_RESERVED'; invalidSubject: 'USER_SCOPE_SUBJECT_INVALID';
  pathEscape: 'USER_SCOPE_PATH_ESCAPE'; invalidAllowlist: 'SHARED_RESOURCE_ALLOWLIST_INVALID';
  missingVerifier: 'AUTHENTICATION_VERIFIER_MISSING'; authenticationRequired: 'SERVER_AUTH_CONTEXT_REQUIRED';
  missingRoot: 'USER_SCOPE_ROOT_MISSING'; notAllowlisted: 'SHARED_RESOURCE_NOT_ALLOWLISTED';
  missingDirectoryService: 'USER_SCOPE_DIRECTORY_SERVICE_MISSING';
}>;
export type ProjectTransferErrorCode = (typeof PROJECT_TRANSFER_ERRORS)[keyof typeof PROJECT_TRANSFER_ERRORS];
export type UserScopeErrorCode = (typeof USER_SCOPE_ERRORS)[keyof typeof USER_SCOPE_ERRORS];
export type ProjectErrorCode = (typeof PROJECT_ERRORS)[keyof typeof PROJECT_ERRORS];
export class ProjectError extends PluginError {
  currentRevision?: number;
  constructor(code: ProjectErrorCode, message: string, options?: ErrorOptions);
}
export class ProjectTransferError extends PluginError {
  constructor(message: string, status?: number, code?: ProjectTransferErrorCode, context?: ErrorOptions['context']);
}
export class UserScopeError extends PluginError {
  constructor(message: string, code?: UserScopeErrorCode, status?: number);
}

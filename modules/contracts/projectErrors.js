import { PluginError } from './errors.js';

export const PROJECT_ERRORS = Object.freeze({
  invalidDocument: 'INVALID_PROJECT_DOCUMENT',
  request: 'PROJECT_REQUEST_FAILED',
  stale: 'STALE_WORKFLOW',
  revisionConflict: 'REVISION_CONFLICT',
  recoveryCorrupted: 'RECOVERY_POINT_CORRUPTED',
  storage: 'PROJECT_STORAGE_FAILED',
  configuration: 'PROJECT_CONFIGURATION_INVALID',
  videoInvalid: 'INVALID_SHOWCASE_VIDEO', videoMissing: 'SHOWCASE_VIDEO_NOT_LISTED',
  videoDownload: 'SHOWCASE_VIDEO_DOWNLOAD_FAILED', videoTooLarge: 'SHOWCASE_VIDEO_TOO_LARGE',
});

export const PROJECT_TRANSFER_ERRORS = Object.freeze({
  invalid: 'INVALID_PROJECT_ARCHIVE', tooLarge: 'ARCHIVE_TOO_LARGE',
  invalidPath: 'ARCHIVE_PATH_INVALID', missing: 'ARCHIVE_NOT_FOUND', tooManyEntries: 'TOO_MANY_ENTRIES',
  showcaseMissing: 'SHOWCASE_ARCHIVE_NOT_LISTED', download: 'SHOWCASE_DOWNLOAD_FAILED',
});
export const USER_SCOPE_ERRORS = Object.freeze({
  invalid: 'USER_SCOPE_INVALID', missingSubject: 'USER_SCOPE_SUBJECT_MISSING',
  confusableSubject: 'USER_SCOPE_SUBJECT_CONFUSABLE', nonCanonicalSubject: 'USER_SCOPE_SUBJECT_NON_CANONICAL',
  reservedSubject: 'USER_SCOPE_SUBJECT_RESERVED', invalidSubject: 'USER_SCOPE_SUBJECT_INVALID',
  pathEscape: 'USER_SCOPE_PATH_ESCAPE', invalidAllowlist: 'SHARED_RESOURCE_ALLOWLIST_INVALID',
  missingVerifier: 'AUTHENTICATION_VERIFIER_MISSING', authenticationRequired: 'SERVER_AUTH_CONTEXT_REQUIRED',
  missingRoot: 'USER_SCOPE_ROOT_MISSING', notAllowlisted: 'SHARED_RESOURCE_NOT_ALLOWLISTED',
  missingDirectoryService: 'USER_SCOPE_DIRECTORY_SERVICE_MISSING',
});

export class ProjectError extends PluginError {
  constructor(code, message, { context = {}, status, cause } = {}) {
    super(code, message, { context: { moduleId: 'project', ...context }, status, cause });
    this.name = 'ProjectError';
    if (context.currentRevision !== undefined) this.currentRevision = context.currentRevision;
  }
}

export class ProjectTransferError extends PluginError {
  constructor(message, status = 400, code = 'INVALID_PROJECT_ARCHIVE', context = {}) {
    super(code, message, { status, context: { moduleId: 'project', operation: 'archive', ...context } });
    this.name = 'ProjectTransferError';
  }
}

export class UserScopeError extends PluginError {
  constructor(message, code = 'USER_SCOPE_INVALID', status = 403) {
    super(code, message, { status, context: { moduleId: 'project', operation: 'resolveUserScope' } });
    this.name = 'UserScopeError';
  }
}

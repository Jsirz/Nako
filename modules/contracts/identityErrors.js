import { PluginError } from './errors.js';

export const IDENTITY_ERRORS = Object.freeze({
  credentialDecrypt: 'CREDENTIAL_DECRYPT_FAILED', credentialFormat: 'CREDENTIAL_FORMAT_INVALID',
  credentialScope: 'CREDENTIAL_SCOPE_DENIED', credentialConfiguration: 'CREDENTIAL_CONFIGURATION_INVALID',
  credentialTimeout: 'CREDENTIAL_PROTECTION_TIMEOUT', credentialProtection: 'CREDENTIAL_PROTECTION_FAILED',
  credentialRead: 'CREDENTIAL_READ_FAILED', credentialInvalid: 'CREDENTIAL_INVALID',
  preferenceInvalid: 'PREFERENCE_INVALID', preferenceTooLarge: 'PREFERENCE_TOO_LARGE', preferenceRead: 'PREFERENCE_READ_FAILED',
  backgroundInvalid: 'INVALID_BACKGROUND', backgroundAnimated: 'ANIMATED_BACKGROUND',
  backgroundTooLarge: 'BACKGROUND_TOO_LARGE', backgroundPixels: 'BACKGROUND_TOO_MANY_PIXELS',
  backgroundTimeout: 'BACKGROUND_PROCESSING_TIMEOUT', backgroundBusy: 'BACKGROUND_BUSY',
  backgroundStorage: 'BACKGROUND_STORAGE_UNAVAILABLE', backgroundNotFound: 'BACKGROUND_NOT_FOUND',
  backgroundRequest: 'BACKGROUND_REQUEST_FAILED', backgroundResponse: 'BACKGROUND_RESPONSE_INVALID',
  backgroundStorageError: 'BACKGROUND_STORAGE_ERROR', backgroundUpload: 'BACKGROUND_UPLOAD_FAILED',
  proxyInvalid: 'SAFE_PROXY_ERROR', proxyTooLarge: 'PROXY_RESPONSE_TOO_LARGE',
  proxyMediaType: 'PROXY_MEDIA_TYPE_REQUIRED', proxyUpstream: 'PROXY_UPSTREAM_ERROR', proxyFailed: 'SAFE_PROXY_FAILED',
  originInvalid: 'TRUSTED_ORIGIN_INVALID', authenticationInvalid: 'ACTIVE_USER_CONTEXT_INVALID',
  authenticationRequired: 'SERVER_AUTH_CONTEXT_REQUIRED',
  workspaceSelection: 'LOCAL_WORKSPACE_SELECTION_REQUIRED', workspaceInvalid: 'LOCAL_WORKSPACE_INVALID',
  workspaceRead: 'LOCAL_WORKSPACE_READ_FAILED',
  avatarInvalid: 'AVATAR_INVALID', avatarTooLarge: 'AVATAR_TOO_LARGE', avatarTimeout: 'AVATAR_READ_TIMEOUT',
  avatarRead: 'AVATAR_READ_FAILED', avatarCancelled: 'AVATAR_READ_CANCELLED',
  externalUnsafe: 'UNSAFE_EXTERNAL_URL', externalPrivate: 'PRIVATE_NETWORK_URL',
  externalRedirects: 'TOO_MANY_REDIRECTS', externalRequest: 'EXTERNAL_URL_REQUEST_FAILED',
});

export class IdentityError extends PluginError {
  constructor(code, message, operation, status = 500, cause) {
    super(code, message, { status, context: { moduleId: 'identity-account', operation },
      ...(cause === undefined ? {} : { cause }) });
  }
}

export const identityError = (code, message, operation, status = 500, cause) =>
  new IdentityError(code, message, operation, status, cause);

export function identityFailure(error, code, message, operation, status = 500) {
  return error instanceof PluginError && error.status !== undefined && error.context?.moduleId
    ? error : identityError(code, message, operation, status);
}

export function avatarCancelled(operation) {
  const error = identityError(IDENTITY_ERRORS.avatarCancelled, '头像读取已取消', operation, 499);
  error.name = 'AbortError';
  return error;
}

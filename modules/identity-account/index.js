export { createCredentialStore } from './credentialStore.js';
// Existing authentication and user-scope APIs remain the outer HTTP security boundary.
export { createActiveUserContext, attachActiveUserContext, getAuthenticatedRequest } from './server/security/localAuthentication.js';

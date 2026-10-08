import type { MediaDownloadScope } from './index.js';

export type HttpMiddleware<Request, Response> = (
  request: Request, response: Response, next: (error?: unknown) => void,
) => unknown;

/** The identity module owns authentication and library visibility checks. */
export interface IdentityHttpSecurity<Request = object, Response = object> {
  createProxyRouter(): HttpMiddleware<Request, Response>;
  createPublicLibraryGuard(): HttpMiddleware<Request, Response>;
  denyPrivateLibraryPath: HttpMiddleware<Request, Response>;
  getAuthenticatedScope(request: Request): MediaDownloadScope;
}

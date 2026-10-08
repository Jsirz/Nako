import { PluginError } from './errors.js';
/** Storage references never contain operating-system paths. */
export type MediaDeliveryReference =
  | { kind: 'library'; url: string }
  | { kind: 'thumbnail'; id: string };
export interface MediaByteRange { start: number; end: number }
/** Caller must close, including HEAD, conditional responses and disconnects. Read once. */
export interface MediaDelivery {
  contentType: string;
  byteLength: number;
  etag: string;
  lastModified: string;
  read(range?: MediaByteRange): AsyncIterable<Uint8Array>;
  close(): Promise<void>;
}
export interface MediaDeliveryStore {
  open(reference: MediaDeliveryReference): Promise<MediaDelivery>;
}
/** Public HTTP(S) only; implementations validate DNS and every redirect. */
export interface ExternalMediaFetch {
  fetch(url: string, options?: { method?: 'GET' | 'HEAD'; timeoutMs?: number }): Promise<{
    response: {
      ok: boolean;
      status: number;
      headers: Pick<Headers, 'get'>;
      body: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array> | null;
    };
    url: URL;
  }>;
}
export function mediaError(message: string, context?: Record<string, unknown>): PluginError;
export class MediaArtifactError extends PluginError {
  constructor(message: string, operationCode?: string);
}
export class MediaProbeError extends PluginError {
  constructor(message: string, status: number, operationCode: string, cause?: unknown);
}

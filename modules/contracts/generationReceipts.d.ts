export interface RemoteTaskReference {
  version: 1;
  taskId: string;
  providerName: string;
  modelFingerprint: string;
  endpointFingerprint: string;
  credentialFingerprint: string;
  queryEndpointFingerprint?: string;
}
export interface RemoteTaskContext {
  taskId?: string;
  providerName: string;
  modelId: string;
  submitUrl: string;
  queryUrl?: string;
  apiKey: string;
}
/** Receipts persist fingerprints only; raw credentials never leave this call. */
export interface GenerationReceiptService {
  remoteTaskReference(context: RemoteTaskContext): RemoteTaskReference | null;
  matchesRemoteTask(reference: unknown, context: RemoteTaskContext): boolean;
}

export interface MediaArtifact {
  kind: 'image' | 'video' | 'audio';
  storageType: 'images' | 'videos' | 'audios';
  extension: string;
  mimeType: string;
  maximumBytes: number;
  evidence: string;
  metadata?: Record<string, unknown>;
}
export interface MediaRuntimeService {
  resolveLocalPath(input: string): string | null;
  imageBase64(input: string): string | null;
  resolveArtifact(options: Record<string, unknown>): MediaArtifact;
  inspectArtifact(options: Record<string, unknown>): Promise<MediaArtifact>;
  createMetadataProbe(options?: Record<string, unknown>): (filePath: string, type: string) => Promise<Record<string, unknown>>;
  signStorage(options: Record<string, unknown>): { url: string; headers: Record<string, string> };
  validateRecoveredVideo(buffer: Uint8Array, signal?: AbortSignal): Promise<{ format: string; metadata: Record<string, unknown> }>;
  dimensions(modelId: string, resolution: string, aspectRatio: string): { width: number; height: number };
  seedreamDimensions(resolution: string, aspectRatio: string): { width: number; height: number } | null;
  createId(nodeId?: string): string;
  saveMetadata(directory: string, metadata: Record<string, unknown>): void;
  saveBuffer(buffer: Uint8Array, projectId: string, type: string, extension: string, metadata?: Record<string, unknown>, nodeId?: string): { id: string; path: string; url: string; filename: string };
  assetUrl(projectId: string, type: string, filename: string): string;
  normalizeAsset(metadata: Record<string, unknown>, projectId: string, type: string): Record<string, unknown>;
  listAssets(options: { libraryDirectory: string; type: string; projectId?: string; favoriteOnly?: boolean; limit?: number; offset?: number }): Promise<Record<string, unknown>[] | { assets: Record<string, unknown>[]; total: number; hasMore: boolean }>;
}

/** Filesystem adapter capabilities; no FFprobe process or image transforms here. */
export type MediaFileService = Omit<MediaRuntimeService, 'dimensions' | 'seedreamDimensions'>;
export interface MediaProbeService {
  create(options?: Record<string, unknown>): ReturnType<MediaRuntimeService['createMetadataProbe']>;
}

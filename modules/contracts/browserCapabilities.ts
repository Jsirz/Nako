/** Cross-module browser capabilities; implementations are registered by their owning plugins. */
export interface GenerationAvailability {
  blocked: boolean;
  modelId?: string;
  inFlight: number;
  maxConcurrent: number;
}
export interface GenerationUiService {
  concurrency(modelName: string, mode: string, signal?: AbortSignal): Promise<GenerationAvailability>;
  mountSettings(host: HTMLElement): () => void;
}
export interface ProjectPreferencesService {
  currentProjectId(): string | undefined;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface AccountUiService {
  applyAvatar(): void;
  setAvatarFile(file: File, options?: { signal?: AbortSignal }): Promise<unknown>;
  clearAvatar(): void;
  mountAppearance(host: HTMLElement): () => void;
}
export interface MediaSettingsService {
  mountSettings(host: HTMLElement): () => void;
}
export interface ProjectCacheSettingsService {
  mountSettings(host: HTMLElement): () => void;
}
export interface PromptCompositionService {
  compose(prompt: string, presets: unknown, type: string): string;
  imageAngle(value: unknown): string;
  expandTags(value: string, options?: { trailingParameters?: boolean }): string;
}
export interface ImageAngle {
  azimuth: number;
  elevation: number;
  zoom: number;
}

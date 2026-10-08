import type { CanvasNode } from './canvasDocument';
import type { CatalogMode } from './modelCatalog';
import type { GenerationAvailability } from './browserCapabilities';

export type VideoMediaInput = 'text' | 'image' | 'video' | 'audio';
export type VideoModeDefinition = Pick<CatalogMode, 'fixedDuration' | 'fixedAspectRatio' | 'referenceVideoDuration'> & {
  value: string;
  requiresVisualReference?: boolean;
  allowedInputs?: Partial<Record<VideoMediaInput, number>>;
};
export interface GenerationModel {
  name: string;
  source?: string;
  maxInputs?: number;
  resolutions?: string[];
  durationMinByResolution?: Record<string, number>;
  cost?: number | Partial<Record<string, number>>;
  costByMode?: Partial<Record<string, number | Partial<Record<string, number>>>>;
  priceTextByMode?: Record<string, Record<string, string>>;
  referenceUrlParams?: Partial<Record<'image' | 'video' | 'audio', string>>;
  timeEstimate?: string;
  fixedDuration?: number;
  advancedParams?: { key: string; default?: unknown; min?: number; max?: number }[];
  videoModes?: VideoModeDefinition[];
  imageModes?: VideoModeDefinition[];
  audioModes?: { value: string }[];
  languageModes?: { value: string }[];
}
export interface GenerationModels {
  imageModels: GenerationModel[];
  videoModels: GenerationModel[];
  textModels: GenerationModel[];
  audioModels: GenerationModel[];
}
export interface GenerationBinding {
  getNodes(): CanvasNode[];
  getProjectId(): string | undefined;
  isActive?(): boolean;
  updateNode(id: string, patch: Partial<CanvasNode>): void;
}
export interface GenerationAuthorization {
  authorizationId?: string;
  planId?: string;
  /** Rechecked after asynchronous preflight and before publication/submission. */
  valid(): boolean;
  request: string;
  submitted(attemptId: string): void;
  reserve?(attemptId: string): Promise<void>;
}
export interface GenerationMediaMetadata {
  resultAspectRatio?: string;
  aspectRatio?: string;
  lastFrame?: string;
}
export interface GenerationRuntime {
  image(request: Record<string, unknown>): Promise<string | string[]>;
  video(request: Record<string, unknown>): Promise<string | string[]>;
  audio(request: Record<string, unknown>): Promise<string | string[]>;
  text(request: Record<string, unknown>): Promise<Record<string, unknown> & { text: string }>;
  concurrency(modelName: string, mode: string, signal?: AbortSignal): Promise<GenerationAvailability>;
  inspectImage(url: string, timeoutMs?: number): Promise<GenerationMediaMetadata>;
  inspectVideo(url: string, timeoutMs?: number, includeLastFrame?: boolean): Promise<GenerationMediaMetadata>;
  now(): number;
}

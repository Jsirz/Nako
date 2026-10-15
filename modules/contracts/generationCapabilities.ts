import type { CanvasNode } from './canvasDocument';
import type { GenerationModels } from './generationUi';
import type { CatalogModel } from './modelCatalog';
import type { GenerationModel } from './generationUi';
import type { ImageModeAdapter } from './imageModes';
import type { VideoModeAdapter } from './videoModes';
import type { MidjourneyReferenceAdapter } from './midjourneyReferences';

export interface ModelCatalogService {
  list(kind: 'image' | 'video' | 'audio' | 'text'): CatalogModel[];
  displayName(name: unknown, modelId?: unknown): string;
}
export interface ModelAvailabilitySource {
  getModelGroups(projectId: string | null): Promise<Array<{ variants: Array<{ configured: boolean }> }>>;
}
export interface AgentModelAvailability {
  filter<T extends { id: string }>(models: readonly T[]): T[];
  refresh(): Promise<void>;
  subscribe(listener: () => void): () => void;
  emptyLabel(): string;
  openConnection(): void;
}
export interface GenerationPreparationService {
  prepare(nodes: CanvasNode[], node: CanvasNode, projectId: string | undefined,
    models: GenerationModels): Promise<Record<string, unknown>>;
  sources(options?: { signal?: AbortSignal }): Promise<Array<{
    source: string; label: string; media: Array<{ kind: string; models: Array<{ name: string; configured: boolean }> }>;
  }>>;
  availability(): AgentModelAvailability;
}

export interface GenerationInteractionService {
  imageModes(): ImageModeAdapter;
  videoModes(): VideoModeAdapter;
  imageReferences(): MidjourneyReferenceAdapter;
  mountModelPicker(host: HTMLElement, options: { names: string[]; currentName?: string; onSelect(name: string): void }): () => void;
  externalReferences(node: Record<string, unknown>, model?: GenerationModel): Array<{ kind: string; url: string }>;
  generateImage(request: Record<string, unknown>): Promise<string | string[]>;
  interruptedPatch(error: string | { code?: string; name?: string }, attemptId: string): Record<string, unknown>;
  registerWorkflowRecoveryOwner(nodeId: unknown): void;
}

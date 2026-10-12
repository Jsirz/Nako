export type ModelKind = 'text' | 'image' | 'video' | 'audio';
export type DefaultModelValues = Record<ModelKind, string>;
export function declaredModel(kind: ModelKind, node: Record<string, unknown>): string;
export interface DefaultModelsSnapshot {
  defaults: DefaultModelValues;
  candidates: Record<ModelKind, { name: string; configured: boolean }[]>;
}
/** Names include the source; defaults never replace an explicit model selection. */
export interface DefaultModelsService {
  read(): Promise<DefaultModelsSnapshot>;
  update(values: Partial<DefaultModelValues>): Promise<DefaultModelsSnapshot>;
  resolve(kind: ModelKind, requested?: string): Promise<string>;
}
export interface DefaultModelsClient {
  /** Returns only a configured default candidate; preserves an explicit requested model. */
  get(kind: ModelKind, requested?: string): string;
  resolve(kind: ModelKind, requested?: string): string;
  read(): Promise<DefaultModelsSnapshot>;
  update(values: Partial<DefaultModelValues>): Promise<DefaultModelsSnapshot>;
  subscribe(listener: () => void): () => void;
}
export interface PreferenceRepository {
  read(): Promise<{ values: Record<string, string> }>;
  update(changes: { set: Record<string, string> }): Promise<unknown>;
}

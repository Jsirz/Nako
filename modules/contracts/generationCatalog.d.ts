import type { CatalogModel, CatalogMode, CatalogParameter } from './modelCatalog';
import type { GenerationModel } from './generationUi';

/** Resolve public model names; the catalog implementation and its files remain private. */
export interface GenerationCatalogService {
  resolveImage(name: string): string | null;
}
/** Backend projection; UI-only fields such as kind/catalogOrder are not included. */
export interface BackendCatalogModel extends Pick<CatalogModel,
  'name' | 'canonicalModel' | 'provider' | 'source' | 'timeEstimate' | 'maxConcurrent' | 'useProxy'> {
  displayName?: string;
  selectable?: false;
  tier: string;
  brand: string | null;
  variantLabel: string | null;
  premium: boolean;
  cost: GenerationModel['cost'] | null;
  costByMode: GenerationModel['costByMode'] | null;
  rhPriceRules: Record<string, number> | null;
  estimatedCostByMode: unknown[] | null;
  observedTaskCost?: Record<string, unknown>;
  fixedDuration?: number;
  durationRange?: { default: number; min: number; max: number };
  priceNoteByMode: Record<string, unknown> | null;
  priceTextByMode: GenerationModel['priceTextByMode'] | null;
  priceFormula: string | null;
  tokenPricePerMillion: number | null;
  tokenVideoPricePerMillion: number | null;
  resolutionSurcharge: Record<string, number> | null;
  modelIdOverride?: false;
  referenceUrlParams?: GenerationModel['referenceUrlParams'];
  languageModes?: BackendCatalogMode[];
  imageModes?: BackendCatalogMode[];
  videoModes?: BackendCatalogMode[];
  audioModes?: BackendCatalogMode[];
  supportedReferenceTypes?: string[];
  supportedImageFormats?: string[];
  maxImageSizeMb?: number;
  advancedParams?: BackendCatalogParameter[];
  endpoint: Record<string, string | { url: string; model?: string }>;
  customModelId?: string;
}
export type BackendCatalogMode = Pick<CatalogMode, 'value' | 'allowedInputs' | 'requiresVisualReference'> & { label?: string };
export type BackendCatalogParameter = Pick<CatalogParameter, 'key' | 'default' | 'min' | 'max' | 'step' | 'unit'> & {
  label?: string;
  type?: string;
  options?: Array<{ label?: string; value: string | number | boolean }>;
};
/** Backend catalog snapshots contain trusted routing metadata, never credentials. */
export interface GenerationModelCatalogService {
  read(): Record<string, BackendCatalogModel>;
}

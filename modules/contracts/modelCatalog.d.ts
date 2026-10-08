import type { GenerationModel } from './generationUi';
export interface CatalogParameter {
  key: string;
  label: string;
  type: string;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string | number }[];
}
export interface CatalogMode {
  /** Mode override; -1 follows reference video timing instead of a duration slider. */
  fixedDuration?: number;
  /** Mode override, e.g. adaptive for source video aspect ratio. */
  fixedAspectRatio?: string;
  /** Accepted source-video duration in seconds, inclusive. */
  referenceVideoDuration?: { min: number; max: number };
  requiresVisualReference?: boolean;
  label: string;
  value: string;
  allowedInputs: { text?: number; image?: number; video?: number; audio?: number };
}
/** Stable declarative provider contribution, containing no runtime services or secrets. */
export interface CatalogModel extends GenerationModel {
  [key: string]: unknown;
  kind: 'text' | 'image' | 'video' | 'audio';
  name: string;
  displayName?: string;
  selectable?: boolean;
  /** False keeps protocol-specific IDs fixed across settings and runtime. */
  modelIdOverride?: boolean;
  canonicalModel: string;
  provider: string;
  source: string;
  brand?: string;
  variantLabel?: string;
  catalogOrder: number;
  description: string;
  timeEstimate: string;
  maxInputs: number;
  maxConcurrent: number;
  useProxy: boolean;
  resolutions: string[];
  aspectRatios: string[];
  supportedReferenceTypes: string[];
  supportedImageFormats: string[];
  maxImageSizeMb: number;
  maxResolution: string;
  fixedDuration?: number;
  durationMinByResolution?: Record<string, number>;
  languageModes?: CatalogMode[];
  imageModes?: CatalogMode[];
  videoModes?: CatalogMode[];
  audioModes?: CatalogMode[];
  advancedParams: CatalogParameter[];
  endpoint: Record<string, { url: string; model: string }>;
}

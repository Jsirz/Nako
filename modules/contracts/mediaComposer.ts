import type { GenerationModel } from './generationUi';
import type { CatalogMode } from './modelCatalog';

export interface ComposerNode {
  id: string;
  type: string;
  projectId?: string;
  parentIds?: string[];
  prompt?: string;
  imageModel?: string;
  videoModel?: string;
  imageMode?: string;
  videoMode?: string;
  resolution?: string;
  aspectRatio?: string;
  generateCount?: number;
  duration?: number;
  generate_audio?: boolean;
  speed?: string;
  errorMessage?: string;
  generationDurationMs?: number;
  [key: string]: unknown;
}
export interface ComposerAsset {
  id: string;
  type: string;
  url?: string;
  prompt?: string;
  textContent?: string;
  [key: string]: unknown;
}
export interface ComposerModel extends GenerationModel {
  advancedParams?: (NonNullable<GenerationModel['advancedParams']>[number] & {
    type?: string;
    step?: number;
    options?: { value: string | number | boolean; label: string }[];
  })[];
  imageModes?: Array<{ value: string; label: string }>;
  videoModes?: Array<
    Omit<CatalogMode, 'allowedInputs'> & { allowedInputs?: CatalogMode['allowedInputs'] }
  >;
  aspectRatios?: string[];
  resolutions?: string[];
}
export interface MediaComposerProps {
  data: ComposerNode;
  readOnly?: boolean;
  isLoading?: boolean;
  connectedImageNodes?: ComposerAsset[];
  onUpdate(id: string, patch: Partial<ComposerNode>): void;
  onGenerate(id: string): void;
  onSelect(id: string): void;
}

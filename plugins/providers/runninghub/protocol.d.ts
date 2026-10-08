import type { CatalogModel } from '../../../modules/contracts/modelCatalog';

type RunningHubModel = Pick<
  CatalogModel,
  | 'name'
  | 'canonicalModel'
  | 'provider'
  | 'source'
  | 'catalogOrder'
  | 'description'
  | 'timeEstimate'
  | 'maxInputs'
  | 'maxConcurrent'
  | 'useProxy'
  | 'resolutions'
  | 'aspectRatios'
  | 'supportedReferenceTypes'
  | 'advancedParams'
  | 'endpoint'
> & Partial<Pick<
  CatalogModel,
  | 'brand'
  | 'variantLabel'
  | 'supportedImageFormats'
  | 'maxImageSizeMb'
  | 'imageModes'
  | 'videoModes'
>> & {
  cost: number | Record<string, number>;
  rhPriceRules?: Record<string, number>;
  costByMode?: Record<string, Record<string, number>>;
  priceFormula?: string;
  tokenPricePerMillion?: number;
  tokenVideoPricePerMillion?: number;
  resolutionSurcharge?: Record<string, number>;
  priceTextByMode?: Record<string, Record<string, string>>;
};

export const CN_IMAGE_MODELS: RunningHubModel[];
export const CN_VIDEO_MODELS: RunningHubModel[];

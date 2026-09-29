export const ECLOUD_ENDPOINTS: Readonly<Record<'text' | 'image' | 'video' | 'audio', string>>;
export const ECLOUD_TEXT_MODELS: readonly (readonly [string, boolean])[];
export const ECLOUD_GLM_MODEL: string;
export const ECLOUD_MINIMAX: Readonly<{
  model: string;
  endpoint: string;
  aliases: readonly string[];
  profiles: Readonly<
    Record<
      string,
      Readonly<{ model: string; resolution: string; minDuration: number; queryModel?: string }>
    >
  >;
  modes: readonly string[];
  resolutions: readonly string[];
  ratios: readonly string[];
}>;
export function isEcloudMiniMaxModel(model: unknown): boolean;
export const ECLOUD_VIDEO_MODELS: Readonly<Record<string, string>>;
export const IMAGE_SIZES: Readonly<Record<string, readonly [number, number]>>;
export const VIDEO_RATIOS: readonly string[];
export const ECLOUD_SEEDANCE: Readonly<{
  model: string;
  resolvedModel: string;
  endpoint: string;
  modes: readonly string[];
  ratios: readonly string[];
  resolutions: readonly string[];
}>;

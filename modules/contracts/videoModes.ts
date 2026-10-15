import type { VideoModeDefinition } from './generationUi';
export type VideoInputCounts = {
  images: number;
  videos?: number;
  audios?: number;
};

export type VideoModeAdapter = {
  isAutomatic: (mode: string | null | undefined) => boolean;
  resolve: (
    mode: string | null | undefined,
    inputs: number | VideoInputCounts,
    supportedModes: readonly VideoModeDefinition[] | null | undefined,
  ) => string;
  supports: (
    supportedModes: readonly VideoModeDefinition[] | null | undefined,
    mode: string,
  ) => boolean;
  allowed: (
    mode: string,
    inputs: number | VideoInputCounts,
    supportedModes: readonly VideoModeDefinition[] | null | undefined,
  ) => boolean;
  label: (mode: string) => string;
};

export type ImageModeDefinition = { value: string };

export type ImageModeAdapter = {
  isAutomatic: (mode: string | null | undefined) => boolean;
  resolve: (mode: string | null | undefined, hasImageInput: boolean) => string;
  supports: (
    supportedModes: readonly ImageModeDefinition[] | null | undefined,
    mode: string,
  ) => boolean;
};

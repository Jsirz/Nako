import type { ImageModeDefinition, ImageModeAdapter } from '../../../contracts/imageModes';
export type { ImageModeDefinition, ImageModeAdapter } from '../../../contracts/imageModes';
import { getBrowserServices } from '../../../kernel/browser';




const STANDARD_IMAGE_MODES = new Set(['text-to-image', 'image-to-image']);

export function isAutomaticImageMode(mode: string | null | undefined): boolean {
  return !mode || STANDARD_IMAGE_MODES.has(mode);
}

export function resolveImageGenerationMode(
  currentMode: string | null | undefined,
  hasImageInput: boolean,
): string {
  if (!isAutomaticImageMode(currentMode)) return currentMode!;
  return hasImageInput ? 'image-to-image' : 'text-to-image';
}

export function supportsImageGenerationMode(
  supportedModes: readonly ImageModeDefinition[] | null | undefined,
  mode: string,
): boolean {
  return supportedModes?.some((candidate) => candidate.value === mode) ?? false;
}

declare global {
  interface Window {
    __NAKO_IMAGE_MODE__?: ImageModeAdapter;
  }
}

export function installImageModeAdapter(target: Window = window): ImageModeAdapter {
  const services = getBrowserServices(target);
  if (services.__NAKO_IMAGE_MODE__) return services.__NAKO_IMAGE_MODE__;

  const adapter: ImageModeAdapter = {
    isAutomatic: isAutomaticImageMode,
    resolve: resolveImageGenerationMode,
    supports: supportsImageGenerationMode,
  };
  services.__NAKO_IMAGE_MODE__ = adapter;
  return adapter;
}

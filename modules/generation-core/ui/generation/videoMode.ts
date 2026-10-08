import { getBrowserServices } from '../../../kernel/browser';
import type { VideoMediaInput, VideoModeDefinition } from '../../../contracts/generationUi';
export type { VideoMediaInput, VideoModeDefinition } from '../../../contracts/generationUi';

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

const TEXT_VIDEO_MODES = new Set(['text-to-video', 'omni-text-to-video']);

const FALLBACK_ALLOWED_INPUTS: Readonly<Record<string, Partial<Record<VideoMediaInput, number>>>> =
  {
    'text-to-video': { text: 1 },
    'omni-text-to-video': { text: 1 },
    'first-frame': { text: 1, image: 1 },
    'omni-image-to-video': { text: 1, image: 1 },
    'reference-video': { text: 1, image: 9 },
    multimodal: { text: 1, image: 9, video: 3, audio: 3 },
    'i2v-first-last-frame': { text: 1, image: 2 },
    'video-edit': { text: 1, video: 1 },
    'motion-control': { text: 1, image: 1, video: 1 },
  };

const MODE_LABELS: Readonly<Record<string, string>> = {
  'text-to-video': '文生视频',
  'omni-text-to-video': '文生视频',
  'first-frame': '首帧',
  'last-frame': '尾帧',
  'omni-image-to-video': '首帧',
  'reference-video': '多图参考',
  multimodal: '多图参考',
  'video-edit': '视频编辑',
  'i2v-first-last-frame': '首尾帧',
};

function normalizedInputs(inputs: number | VideoInputCounts): Required<VideoInputCounts> {
  if (typeof inputs === 'number') {
    return { images: Math.max(0, inputs), videos: 0, audios: 0 };
  }
  return {
    images: Math.max(0, inputs.images || 0),
    videos: Math.max(0, inputs.videos || 0),
    audios: Math.max(0, inputs.audios || 0),
  };
}

export function isAutomaticVideoMode(mode: string | null | undefined): boolean {
  return !mode;
}

export function isVideoGenerationModeAllowed(
  mode: string,
  inputs: number | VideoInputCounts,
  supportedModes: readonly VideoModeDefinition[] | null | undefined,
): boolean {
  const counts = normalizedInputs(inputs);
  if (mode === 'video-edit' && counts.videos === 0) return false;
  const connectedInputs: Array<[VideoMediaInput, number]> = [];
  if (counts.images > 0) connectedInputs.push(['image', counts.images]);
  if (counts.videos > 0) connectedInputs.push(['video', counts.videos]);
  if (counts.audios > 0) connectedInputs.push(['audio', counts.audios]);

  if (connectedInputs.length === 0) return TEXT_VIDEO_MODES.has(mode);

  const definition = supportedModes?.find((candidate) => candidate.value === mode);
  if (definition?.requiresVisualReference && !counts.images && !counts.videos) return false;
  const allowedInputs = definition?.allowedInputs || FALLBACK_ALLOWED_INPUTS[mode] || {};
  return connectedInputs.every(([input, count]) => (allowedInputs[input] || 0) >= count);
}

export function resolveVideoGenerationMode(
  currentMode: string | null | undefined,
  inputs: number | VideoInputCounts,
  supportedModes: readonly VideoModeDefinition[] | null | undefined,
): string {
  const counts = normalizedInputs(inputs);
  const supported = new Set((supportedModes || []).map((candidate) => candidate.value));
  if (
    currentMode &&
    supported.has(currentMode) &&
    isVideoGenerationModeAllowed(currentMode, counts, supportedModes)
  ) {
    return currentMode;
  }

  let preferred: readonly string[] = ['text-to-video', 'omni-text-to-video'];
  let fallback = 'text-to-video';

  if (counts.videos > 0) {
    preferred = ['video-edit', 'multimodal', 'motion-control'];
    fallback = 'video-edit';
  } else if (counts.audios > 0) {
    preferred = ['multimodal'];
    fallback = 'multimodal';
  } else if (counts.images === 0) {
    preferred = ['text-to-video', 'omni-text-to-video'];
    fallback = 'text-to-video';
  } else if (counts.images > 0) {
    preferred = [
      'first-frame',
      'omni-image-to-video',
      'i2v-first-last-frame',
      'reference-video',
      'multimodal',
    ];
    fallback = 'first-frame';
  }

  return (
    preferred.find(
      (mode) => supported.has(mode) && isVideoGenerationModeAllowed(mode, counts, supportedModes),
    ) || fallback
  );
}

export function supportsVideoGenerationMode(
  supportedModes: readonly VideoModeDefinition[] | null | undefined,
  mode: string,
): boolean {
  return supportedModes?.some((candidate) => candidate.value === mode) ?? false;
}

export function getVideoGenerationModeLabel(mode: string): string {
  return MODE_LABELS[mode] || mode;
}

declare global {
  interface Window {
    __NAKO_VIDEO_MODE__?: VideoModeAdapter;
  }
}

export function installVideoModeAdapter(target: Window = window): VideoModeAdapter {
  const services = getBrowserServices(target);
  if (services.__NAKO_VIDEO_MODE__) return services.__NAKO_VIDEO_MODE__;

  const adapter: VideoModeAdapter = {
    isAutomatic: isAutomaticVideoMode,
    resolve: resolveVideoGenerationMode,
    supports: supportsVideoGenerationMode,
    allowed: isVideoGenerationModeAllowed,
    label: getVideoGenerationModeLabel,
  };
  services.__NAKO_VIDEO_MODE__ = adapter;
  return adapter;
}

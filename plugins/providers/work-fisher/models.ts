import { MODEL_DEFINITIONS } from './protocol.js';

export const TEXT_MODELS = MODEL_DEFINITIONS.filter((model) => model.kind === 'text');
export const IMAGE_MODELS = MODEL_DEFINITIONS.filter((model) => model.kind === 'image');
export const VIDEO_MODELS = MODEL_DEFINITIONS.filter((model) => model.kind === 'video');
export const AUDIO_MODELS = MODEL_DEFINITIONS.filter((model) => model.kind === 'audio');

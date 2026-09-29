// Official MoMA docs: 99314, 99330, 99932, 100963, 100407–100410, 100771.
export const ECLOUD_ENDPOINTS = Object.freeze({
  text: 'https://moma.cmecloud.cn/v1/chat/completions',
  image: 'https://moma.cmecloud.cn/v1/aigc/multimodal-generation/generation',
  video: 'https://moma.cmecloud.cn/api/v1/services/aigc/video-generation/video-synthesis',
  audio: 'https://moma.cmecloud.cn/api/v1/services/aigc/multimodal-generation/generation',
});
export const ECLOUD_TEXT_MODELS = [
  ['qwen/qwen3.8-max', false],
  ['qwen/qwen3.7-max', false],
  ['qwen/qwen3-max', false],
  ['qwen/qwen3.7-plus', true],
  ['qwen/qwen3.6-plus', true],
  ['qwen/qwen3.5-plus', true],
  ['qwen/qwen3.6-flash', true],
  ['qwen/qwen3.5-flash', true],
  ['qwen/qwen3-vl-plus', true],
  ['zhipu/glm-5.3-flash', true],
];
export const ECLOUD_GLM_MODEL = 'zhipu/glm-5.3-flash';
// Article 100738: both resolutions use the namespaced ID in its executable examples.
export const ECLOUD_MINIMAX = Object.freeze({
  model: 'minimax/minimax-h3',
  aliases: Object.freeze(['MiniMax-H3', 'minimax/MiniMax-H3']),
  endpoint: 'https://moma.cmecloud.cn/v1/videos',
  modes: ['text-to-video', 'first-frame', 'last-frame', 'i2v-first-last-frame', 'multimodal'],
  resolutions: ['768p', '2K'],
  profiles: Object.freeze({
    '768p': Object.freeze({
      model: 'minimax/minimax-h3',
      resolution: '768P',
      minDuration: 5,
    }),
    '2k': Object.freeze({ model: 'minimax/minimax-h3', resolution: '2K', minDuration: 5 }),
  }),
  ratios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
});
export function isEcloudMiniMaxModel(model) {
  return model === ECLOUD_MINIMAX.model || ECLOUD_MINIMAX.aliases.includes(model);
}
export const ECLOUD_VIDEO_MODELS = Object.freeze({
  'text-to-video': 'qwen/happyhorse-1.1-t2v',
  'first-frame': 'qwen/happyhorse-1.1-i2v',
  'reference-video': 'qwen/happyhorse-1.1-r2v',
  'video-edit': 'qwen/happyhorse-1.0-video-edit',
});
export const IMAGE_SIZES = Object.freeze({
  '1:1': [2048, 2048],
  '16:9': [2688, 1536],
  '9:16': [1536, 2688],
  '4:3': [2368, 1728],
  '3:4': [1728, 2368],
});
export const VIDEO_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9'];

// Mobile Engine REST API: outline 110521; articles 100962, 99301 and 99154.
export const ECLOUD_SEEDANCE = Object.freeze({
  model: 'doubao-seedance-2.0',
  resolvedModel: 'doubao-seedance-2-0-260128',
  endpoint: 'https://zhenze-huhehaote.cmecloud.cn/api/v3/contents/generations/tasks',
  modes: ['text-to-video', 'first-frame', 'i2v-first-last-frame', 'multimodal'],
  ratios: ['16:9', '9:16', '1:1'],
  resolutions: ['480p', '720p', '1080p'],
});

import {
  ECLOUD_ENDPOINTS,
  ECLOUD_TEXT_MODELS,
  ECLOUD_VIDEO_MODELS,
  ECLOUD_SEEDANCE,
  ECLOUD_GLM_MODEL,
  ECLOUD_MINIMAX,
  IMAGE_SIZES,
  VIDEO_RATIOS,
} from './protocol.js';

const common = {
  source: 'ecloud',
  useProxy: false,
  maxConcurrent: 2,
  maxInputs: 10,
  cost: 0,
  resolutions: [] as string[],
  aspectRatios: [] as string[],
};
const billed = '以移动云 MoMA 实际账单为准';
const toggle = (key: string, label: string, value = false) => ({
  key,
  label,
  type: 'select',
  default: String(value),
  options: [
    { label: '关闭', value: 'false' },
    { label: '开启', value: 'true' },
  ],
});
export const TEXT_MODELS = ECLOUD_TEXT_MODELS.map(([id, vision], index) => {
  const model = String(id);
  const glm = model === ECLOUD_GLM_MODEL;
  const label = glm ? 'GLM-5.3-Flash' : model.split('/').slice(1).join('/');
  return {
    ...common,
    catalogOrder: 200 + index,
    name: `${label} · 移动云`,
    canonicalModel: label,
    provider: 'EcloudTextProvider',
    timeEstimate: '5min',
    description: glm
      ? '移动云 GLM-5.3-Flash 文本、图片与公网视频理解；思考模式始终开启，最大输出 128K Token。'
      : vision
        ? '移动云 MoMA 文本、图片与视频理解。'
        : '移动云 MoMA 文本对话与推理。',
    supportedReferenceTypes: vision ? ['text', 'image', 'video'] : ['text'],
    supportedImageFormats: vision ? ['jpeg', 'png', 'webp', 'gif'] : [],
    maxImageSizeMb: vision ? 10 : 0,
    maxResolution: '',
    languageModes: [
      {
        label: vision ? '视觉理解 / 对话' : '文本对话',
        value: 'multimodal-chat',
        allowedInputs: { text: 10, image: vision ? 10 : 0, video: vision ? 1 : 0 },
      },
    ],
    endpoint: { 'multimodal-chat': { url: ECLOUD_ENDPOINTS.text, model } },
    priceTextByMode: { 'multimodal-chat': { default: billed } },
    advancedParams: glm
      ? [
          {
            key: 'reasoning_effort',
            label: '思考强度',
            type: 'select',
            default: 'max',
            options: [
              { label: '低', value: 'low' },
              { label: '高', value: 'high' },
              { label: '最高', value: 'max' },
            ],
          },
        ]
      : [toggle('enable_thinking', '思考模式')],
  };
});
export const IMAGE_MODELS = [
  {
    ...common,
    catalogOrder: 220,
    name: 'Qwen-Image 2.0 Pro · 移动云',
    displayName: 'Qwen-Image-2.0-Pro · 移动云',
    canonicalModel: 'Qwen-Image 2.0 Pro',
    provider: 'EcloudImageProvider',
    timeEstimate: '5min',
    description: '移动云文生图与 1–3 张图片编辑，单次可生成 1–6 张 PNG。',
    supportedReferenceTypes: ['text', 'image'],
    supportedImageFormats: ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
    maxImageSizeMb: 10,
    maxResolution: '3072*3072',
    resolutions: ['1K', '2K'],
    aspectRatios: Object.keys(IMAGE_SIZES),
    imageModes: [
      { label: '文生图', value: 'text-to-image', allowedInputs: { text: 10, image: 0 } },
      { label: '图片编辑', value: 'image-to-image', allowedInputs: { text: 10, image: 3 } },
    ],
    endpoint: {
      'text-to-image': { url: ECLOUD_ENDPOINTS.image, model: 'qwen/qwen-image-2.0-pro' },
      'image-to-image': { url: ECLOUD_ENDPOINTS.image, model: 'qwen/qwen-image-2.0-pro' },
    },
    priceTextByMode: {
      'text-to-image': { default: billed },
      'image-to-image': { default: billed },
    },
    advancedParams: [
      { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 6 },
      toggle('prompt_extend', '提示词优化', true),
    ],
  },
];
const HAPPYHORSE_MODELS = [false, true].map((editing, index) => ({
  ...common,
  catalogOrder: 230 + index,
  name: editing ? 'HappyHorse 1.0 视频编辑 · 移动云' : 'HappyHorse 1.1 · 移动云',
  canonicalModel: editing ? 'HappyHorse 1.0 视频编辑' : 'HappyHorse 1.1',
  provider: 'EcloudVideoProvider',
  timeEstimate: '10min',
  description: editing
    ? '视频编辑需公网视频 URL；不自动上传本机视频。'
    : '文生视频、首帧和 1–9 张图片参考生成，3–15 秒。',
  supportedReferenceTypes: editing ? ['text', 'image', 'video'] : ['text', 'image'],
  supportedImageFormats: ['jpeg', 'png', 'webp'],
  maxImageSizeMb: 20,
  maxResolution: '',
  resolutions: ['720p', '1080p'],
  aspectRatios: [...VIDEO_RATIOS],
  videoModes: editing
    ? [
        {
          label: '视频编辑（公网视频）',
          value: 'video-edit',
          allowedInputs: { text: 10, image: 5, video: 1 },
        },
      ]
    : [
        {
          label: '文生视频',
          value: 'text-to-video',
          allowedInputs: { text: 10, image: 0, video: 0 },
        },
        {
          label: '首帧生视频（比例随原图）',
          value: 'first-frame',
          allowedInputs: { text: 10, image: 1, video: 0 },
        },
        {
          label: '图片参考生视频',
          value: 'reference-video',
          allowedInputs: { text: 10, image: 9, video: 0 },
        },
      ],
  endpoint: Object.fromEntries(
    Object.entries(ECLOUD_VIDEO_MODELS)
      .filter(([mode]) => (mode === 'video-edit') === editing)
      .map(([mode, model]) => [mode, { url: ECLOUD_ENDPOINTS.video, model }]),
  ),
  priceTextByMode: Object.fromEntries(
    Object.keys(ECLOUD_VIDEO_MODELS).map((mode) => [mode, { default: billed }]),
  ),
  advancedParams: editing
    ? [
        {
          key: 'audio_setting',
          label: '声音',
          type: 'select',
          default: 'auto',
          options: [
            { label: '自动', value: 'auto' },
            { label: '保留原声', value: 'origin' },
          ],
        },
      ]
    : [{ key: 'duration', label: '时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }],
}));
export const VIDEO_MODELS = [
  ...HAPPYHORSE_MODELS,
  {
    ...common,
    catalogOrder: 233,
    name: 'MiniMax-H3 · 移动云',
    canonicalModel: 'MiniMax-H3',
    provider: 'EcloudVideoProvider',
    timeEstimate: '20min',
    description:
      '移动云 MiniMax-H3：文生、首帧、尾帧、首尾帧及多模态参考。768P 与 2K 均为 5–15 秒。支持当前项目素材和公网地址。',
    maxInputs: 16,
    supportedReferenceTypes: ['text', 'image', 'video', 'audio'],
    supportedImageFormats: ['jpeg', 'png', 'webp'],
    maxImageSizeMb: 20,
    supportedAudioFormats: ['wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac'],
    maxAudioDurationSec: 15,
    maxResolution: '',
    resolutions: [...ECLOUD_MINIMAX.resolutions],
    durationMinByResolution: { '768p': 5, '2k': 5 },
    aspectRatios: [...ECLOUD_MINIMAX.ratios],
    referenceUrlParams: {
      image: 'reference_image_urls',
      video: 'reference_video_urls',
      audio: 'reference_audio_urls',
    },
    videoModes: [
      {
        label: '文生视频',
        value: 'text-to-video',
        allowedInputs: { text: 10, image: 0, video: 0, audio: 0 },
      },
      {
        label: '首帧生视频（比例随原图）',
        value: 'first-frame',
        allowedInputs: { text: 10, image: 1, video: 0, audio: 0 },
      },
      {
        label: '尾帧生视频（比例随原图）',
        value: 'last-frame',
        allowedInputs: { text: 10, image: 1, video: 0, audio: 0 },
      },
      {
        label: '首尾帧生视频',
        value: 'i2v-first-last-frame',
        allowedInputs: { text: 10, image: 2, video: 0, audio: 0 },
      },
      {
        label: '多模态参考',
        value: 'multimodal',
        requiresVisualReference: true,
        allowedInputs: { text: 10, image: 9, video: 3, audio: 3 },
      },
    ],
    endpoint: Object.fromEntries(
      ECLOUD_MINIMAX.modes.map((mode) => [
        mode,
        { url: ECLOUD_MINIMAX.endpoint, model: ECLOUD_MINIMAX.model },
      ]),
    ),
    priceTextByMode: Object.fromEntries(
      ECLOUD_MINIMAX.modes.map((mode) => [mode, { default: billed }]),
    ),
    advancedParams: [
      { key: 'duration', label: '时长', type: 'slider', default: 5, min: 5, max: 15, unit: 's' },
      {
        key: 'reference_image_urls',
        label: '图片公网地址（空格分隔；首尾帧按顺序）',
        type: 'text',
        default: '',
      },
      { key: 'reference_video_urls', label: '视频公网地址（空格分隔）', type: 'text', default: '' },
      { key: 'reference_audio_urls', label: '音频公网地址（空格分隔）', type: 'text', default: '' },
    ],
  },
  {
    ...common,
    catalogOrder: 232,
    name: 'Seedance 2.0 · 移动云',
    canonicalModel: 'Seedance 2.0',
    provider: 'EcloudVideoProvider',
    timeEstimate: '20min',
    description:
      '移动引擎 Seedance 2.0：文生、首帧、首尾帧、多模态参考。REST 调用需公网素材或已审核 asset 地址；高级设置可输入地址。',
    maxInputs: 16,
    supportedReferenceTypes: ['text', 'image', 'video', 'audio'],
    supportedImageFormats: ['jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'],
    maxImageSizeMb: 30,
    supportedAudioFormats: ['wav', 'mp3'],
    maxAudioDurationSec: 15,
    maxResolution: '',
    resolutions: [...ECLOUD_SEEDANCE.resolutions],
    aspectRatios: [...ECLOUD_SEEDANCE.ratios],
    referenceUrlParams: {
      image: 'reference_image_urls',
      video: 'reference_video_urls',
      audio: 'reference_audio_urls',
    },
    videoModes: [
      {
        label: '文生视频',
        value: 'text-to-video',
        allowedInputs: { text: 10, image: 0, video: 0, audio: 0 },
      },
      {
        label: '首帧生视频',
        value: 'first-frame',
        allowedInputs: { text: 10, image: 1, video: 0, audio: 0 },
      },
      {
        label: '首尾帧生视频',
        value: 'i2v-first-last-frame',
        allowedInputs: { text: 10, image: 2, video: 0, audio: 0 },
      },
      {
        label: '多模态参考 / 编辑延长',
        value: 'multimodal',
        requiresVisualReference: true,
        allowedInputs: { text: 10, image: 9, video: 3, audio: 3 },
      },
    ],
    endpoint: Object.fromEntries(
      ECLOUD_SEEDANCE.modes.map((mode) => [
        mode,
        { url: ECLOUD_SEEDANCE.endpoint, model: ECLOUD_SEEDANCE.model },
      ]),
    ),
    priceTextByMode: Object.fromEntries(
      ECLOUD_SEEDANCE.modes.map((mode) => [mode, { default: billed }]),
    ),
    advancedParams: [
      { key: 'duration', label: '时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' },
      {
        key: 'reference_image_urls',
        label: '图片公网 / asset 地址（空格分隔；首尾帧按顺序）',
        type: 'text',
        default: '',
      },
      {
        key: 'reference_video_urls',
        label: '视频公网 / asset 地址（空格分隔）',
        type: 'text',
        default: '',
      },
      {
        key: 'reference_audio_urls',
        label: '音频公网 / asset 地址（空格分隔）',
        type: 'text',
        default: '',
      },
      {
        key: 'seed',
        label: '随机种子（-1 为随机）',
        type: 'number',
        default: -1,
        min: -1,
        max: 4294967295,
      },
      toggle('watermark', '水印'),
    ],
  },
];
export const AUDIO_MODELS = [
  {
    ...common,
    catalogOrder: 240,
    name: 'Qwen3-TTS-Flash · 移动云',
    canonicalModel: 'Qwen3-TTS-Flash',
    provider: 'EcloudAudioProvider',
    timeEstimate: '3min',
    description: '文本转语音，返回 WAV；使用 MoMA Cherry 音色。',
    supportedReferenceTypes: ['text'],
    supportedAudioFormats: [] as string[],
    maxAudioDurationSec: 0,
    audioModes: [{ label: '文本转语音', value: 'text-to-speech', allowedInputs: { text: 10 } }],
    endpoint: { 'text-to-speech': { url: ECLOUD_ENDPOINTS.audio, model: 'qwen/qwen3-tts-flash' } },
    priceTextByMode: { 'text-to-speech': { default: billed } },
    advancedParams: [
      {
        key: 'language_type',
        label: '语种',
        type: 'select',
        default: 'Auto',
        options: [
          'Auto',
          'Chinese',
          'English',
          'German',
          'Italian',
          'Portuguese',
          'Spanish',
          'Japanese',
          'Korean',
          'French',
          'Russian',
        ].map((value) => ({ label: value, value })),
      },
    ],
  },
];

export const IMAGE_MODELS = [
{ catalogOrder: 57,
        name: 'SeedVR2 高清放大 · RH',
        description: '图片工具栏专用；按 RH 云端应用公开字段接入，使用应用默认放大设置。费用以 RunningHub 账单为准。',
        provider: 'SeedVr2ImageProvider', source: 'runninghub', canonicalModel: 'SeedVR2',
        timeEstimate: '20min', maxConcurrent: 1, useProxy: false, maxInputs: 1,
        supportedReferenceTypes: ['image'], supportedImageFormats: ['png', 'jpeg', 'webp'],
        maxImageSizeMb: 30, resolutions: ['Auto'], aspectRatios: ['Auto'], cost: undefined,
        imageModes: [{ label: '高清放大', value: 'image-to-image', allowedInputs: { image: 1 } }],
        endpoint: { 'image-to-image': { url: 'https://www.runninghub.cn/task/openapi/ai-app/run', model: '2097920992202022914' } },
        advancedParams: [],
    }
];
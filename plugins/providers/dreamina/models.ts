export const IMAGE_MODELS = [
{ catalogOrder: 18,
        name:                       'Seedream 5.0 Pro · 即梦 CLI',
        brand:                      'Seedream',
        description:                '使用当前账号登录的即梦 CLI；按即梦积分账单扣费，1K 档会按 CLI 的 1.5K 档提交。',
        timeEstimate:               '15min',
        provider:                   'DreaminaCliImageProvider',
        source:                     'dreamina_cli',
        canonicalModel:             'Seedream v5 Pro',
        maxConcurrent:              1,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             25,
        maxResolution:              '6240*6240',
        resolutions:                ['1K', '2K', '4K'],
        aspectRatios:               ['1:1', '2:3', '3:2', '9:16', '16:9', '3:4', '4:3', '21:9'],
        cost:                       0,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image': { url: 'local:dreamina-cli', model: '5.0Pro' },
            'image-to-image': { url: 'local:dreamina-cli', model: '5.0Pro' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 10 }
        ]
    }
];
export const VIDEO_MODELS = [
{ catalogOrder: 65,
        name:                       'Seedance 2.5 · 即梦 CLI',
        brand:                      'Seedance',
        description:                '即梦 CLI 的 Seedance 2.5（仅限具备权限的即梦账号）；按即梦积分账单扣费。',
        timeEstimate:               '30min',
        provider:                   'DreaminaCliVideoProvider',
        source:                     'dreamina_cli',
        canonicalModel:             'Seedance 2.5',
        maxConcurrent:              1,
        useProxy:                   false,
        maxInputs:                  50,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['480p', '720p', '1080p'],
        aspectRatios:               ['1:1', '3:4', '16:9', '4:3', '9:16', '21:9'],
        cost:                       0,
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 1 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 30, 'video': 10, 'audio': 10 } }
        ],
        endpoint: {
            'text-to-video': { url: 'local:dreamina-cli', model: 'seedance2.5' },
            'first-frame': { url: 'local:dreamina-cli', model: 'seedance2.5' },
            'i2v-first-last-frame': { url: 'local:dreamina-cli', model: 'seedance2.5' },
            'multimodal': { url: 'local:dreamina-cli', model: 'seedance2.5' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 30, unit: 's' }
        ]
    },
{ catalogOrder: 66,
        name:                       'Seedance 2.0 Fast · 即梦 CLI',
        brand:                      'Seedance',
        description:                '即梦 CLI 的 Seedance 2.0 Fast；当前公开命令只支持 720p，按即梦积分账单扣费。',
        timeEstimate:               '15min',
        provider:                   'DreaminaCliVideoProvider',
        source:                     'dreamina_cli',
        canonicalModel:             'Seedance 2.0 Fast',
        maxConcurrent:              1,
        useProxy:                   false,
        maxInputs:                  12,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['720p'],
        aspectRatios:               ['1:1', '3:4', '16:9', '4:3', '9:16', '21:9'],
        cost:                       0,
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 1 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', requiresVisualReference: true, allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'local:dreamina-cli', model: 'seedance2.0fast' },
            'first-frame': { url: 'local:dreamina-cli', model: 'seedance2.0fast' },
            'i2v-first-last-frame': { url: 'local:dreamina-cli', model: 'seedance2.0fast' },
            'multimodal': { url: 'local:dreamina-cli', model: 'seedance2.0fast' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 67,
        name:                       'Seedance 2.0 Mini · 即梦 CLI',
        brand:                      'Seedance',
        description:                '即梦 CLI 的 Seedance 2.0 Mini；当前公开命令只支持 720p，按即梦积分账单扣费。',
        timeEstimate:               '15min',
        provider:                   'DreaminaCliVideoProvider',
        source:                     'dreamina_cli',
        canonicalModel:             'Seedance 2.0 Mini',
        maxConcurrent:              1,
        useProxy:                   false,
        maxInputs:                  12,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['720p'],
        aspectRatios:               ['1:1', '3:4', '16:9', '4:3', '9:16', '21:9'],
        cost:                       0,
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 1 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', requiresVisualReference: true, allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'local:dreamina-cli', model: 'seedance2.0mini' },
            'first-frame': { url: 'local:dreamina-cli', model: 'seedance2.0mini' },
            'i2v-first-last-frame': { url: 'local:dreamina-cli', model: 'seedance2.0mini' },
            'multimodal': { url: 'local:dreamina-cli', model: 'seedance2.0mini' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 68,
        name:                       'Seedance 2.0 · 即梦 CLI',
        brand:                      'Seedance',
        description:                '即梦 CLI 的 Seedance 2.0；当前公开命令只支持 720p，按即梦积分账单扣费。',
        timeEstimate:               '15min',
        provider:                   'DreaminaCliVideoProvider',
        source:                     'dreamina_cli',
        canonicalModel:             'Seedance 2.0',
        maxConcurrent:              1,
        useProxy:                   false,
        maxInputs:                  12,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['720p'],
        aspectRatios:               ['1:1', '3:4', '16:9', '4:3', '9:16', '21:9'],
        cost:                       0,
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 1 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', requiresVisualReference: true, allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'local:dreamina-cli', model: 'seedance2.0' },
            'first-frame': { url: 'local:dreamina-cli', model: 'seedance2.0' },
            'i2v-first-last-frame': { url: 'local:dreamina-cli', model: 'seedance2.0' },
            'multimodal': { url: 'local:dreamina-cli', model: 'seedance2.0' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    }
];
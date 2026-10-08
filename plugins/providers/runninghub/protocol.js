export const CN_IMAGE_MODELS = [
{ catalogOrder: 54,
        name:                       'Seedream v5 Pro · RH CN站',
        description:                'RH CN 站 seedream-v5-pro，牌价 236 万像素以内每张 0.27 元、超出 0.54 元；图生图另计输入图 0.018 元一张，首张免费',
        timeEstimate:               '3min',
        provider:                   'RunningHubImageProvider',
        source:                     'runninghub',
        canonicalModel:             'Seedream v5 Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       { "1K": 0.27, "2K": 0.54, "4K": 0.54 },
        rhPriceRules: {
            'total|text-to-image|1k|*|*|*': 0.27,
            'total|text-to-image|2k|*|*|*': 0.54,
            'total|text-to-image|4k|*|*|*': 0.54,
            'total|image-to-image|1k|*|*|*': 0.27,
            'total|image-to-image|2k|*|*|*': 0.54,
            'total|image-to-image|4k|*|*|*': 0.54,
            'image-surcharge|image-to-image|*|1|*|1+': 0.018
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.cn/openapi/v2/seedream-v5-pro/text-to-image', model: 'seedream-v5-pro' },
            'image-to-image': { url: 'https://www.runninghub.cn/openapi/v2/seedream-v5-pro/image-to-image', model: 'seedream-v5-pro' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 55,
        name:                       'Qwen Image 3.0 · RH CN站',
        description:                'RH CN 站千问 3.0，牌价每张 0.16 元；图像编辑另计输入图 0.02 元一张',
        timeEstimate:               '3min',
        provider:                   'RunningHubImageProvider',
        source:                     'runninghub',
        canonicalModel:             'Qwen Image 3.0',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       { "1K": 0.16, "2K": 0.16 },
        rhPriceRules: {
            'total|text-to-image|1k|*|*|*': 0.16,
            'total|text-to-image|2k|*|*|*': 0.16,
            'total|image-to-image|1k|*|*|*': 0.16,
            'total|image-to-image|2k|*|*|*': 0.16,
            'image-surcharge|image-to-image|*|0|*|1+': 0.02
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.cn/openapi/v2/alibaba/qwen-image-3.0/text-to-image', model: 'alibaba/qwen-image-3.0' },
            'image-to-image': { url: 'https://www.runninghub.cn/openapi/v2/alibaba/qwen-image-3.0/image-edit', model: 'alibaba/qwen-image-3.0' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 56,
        name:                       'Qwen Image 3.0 Pro · RH CN站',
        description:                'RH CN 站千问 3.0 Pro，牌价 1K 每张 0.23 元、2K 0.45 元；图像编辑另计输入图 0.02 元一张',
        timeEstimate:               '3min',
        provider:                   'RunningHubImageProvider',
        source:                     'runninghub',
        canonicalModel:             'Qwen Image 3.0 Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       { "1K": 0.23, "2K": 0.45 },
        rhPriceRules: {
            'total|text-to-image|1k|*|*|*': 0.23,
            'total|text-to-image|2k|*|*|*': 0.45,
            'total|image-to-image|1k|*|*|*': 0.23,
            'total|image-to-image|2k|*|*|*': 0.45,
            'image-surcharge|image-to-image|*|0|*|1+': 0.02
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.cn/openapi/v2/alibaba/qwen-image-3.0-pro/text-to-image', model: 'alibaba/qwen-image-3.0-pro' },
            'image-to-image': { url: 'https://www.runninghub.cn/openapi/v2/alibaba/qwen-image-3.0-pro/image-edit', model: 'alibaba/qwen-image-3.0-pro' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    }
];

export const CN_VIDEO_MODELS = [
{ catalogOrder: 69,
        name:                       'Seedance 2.5 · RH CN站',
        brand:                      'Seedance',
        description:                'RH CN站 Seedance 2.5。按 completion tokens 动态计费；来源比价会按当前比例、分辨率与时长换算为任务估价。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Seedance 2.5',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['480p', '720p', '1080p', '2k', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        priceFormula:               'seedance-output-tokens',
        tokenPricePerMillion:       87.5,
        tokenVideoPricePerMillion:  52.5,
        resolutionSurcharge:        { '1080p': 0.32, '2k': 0.42, '4k': 0.63 },
        priceTextByMode: {
            'text-to-video': {
                'default': '¥87.5/百万 tokens',
                '480p': '¥87.5/百万 tokens',
                '720p': '¥87.5/百万 tokens',
                '1080p': '¥87.5/百万 tokens + ¥0.32/秒',
                '2k': '¥87.5/百万 tokens + ¥0.42/秒',
                '4k': '¥87.5/百万 tokens + ¥0.63/秒'
            },
            'first-frame': {
                'default': '¥87.5/百万 tokens',
                '480p': '¥87.5/百万 tokens',
                '720p': '¥87.5/百万 tokens',
                '1080p': '¥87.5/百万 tokens + ¥0.32/秒',
                '2k': '¥87.5/百万 tokens + ¥0.42/秒',
                '4k': '¥87.5/百万 tokens + ¥0.63/秒'
            },
            'multimodal': {
                'default': '¥52.5–87.5/百万 tokens',
                '480p': '¥52.5–87.5/百万 tokens',
                '720p': '¥52.5–87.5/百万 tokens',
                '1080p': '¥52.5–87.5/百万 tokens + ¥0.32/秒',
                '2k': '¥52.5–87.5/百万 tokens + ¥0.42/秒',
                '4k': '¥52.5–87.5/百万 tokens + ¥0.63/秒'
            }
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/bytedance/seedance-2.5-token/text-to-video', model: 'seedance-2.5-token' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/bytedance/seedance-2.5-token/image-to-video', model: 'seedance-2.5-token' },
            'multimodal': { url: 'https://www.runninghub.cn/openapi/v2/bytedance/seedance-2.5-token/multimodal-video', model: 'seedance-2.5-token' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 30, unit: 's' }
        ]
    },
{ catalogOrder: 70,
        name:                       'Seedance 2.0 · RH CN站',
        brand:                      'Seedance',
        description:                'RH CN站 Seedance 2.0 当前画布价；无参考按生成秒计费，有参考按 RH 时长档计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Seedance 2.0',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['480p', '720p', '1080p', '2k', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '480p': 0.6, '720p': 1.2, '1080p': 1.48, '2k': 1.62, '4k': 1.83 },
        rhPriceRules: {
            'rate|text-to-video|480p|*|*|*': 0.6,
            'rate|text-to-video|720p|*|*|*': 1.2,
            'rate|text-to-video|1080p|*|*|*': 1.48,
            'rate|text-to-video|2k|*|*|*': 1.62,
            'rate|text-to-video|4k|*|*|*': 1.83,
            'rate|first-frame|480p|*|*|*': 0.6,
            'rate|first-frame|720p|*|*|*': 1.2,
            'rate|first-frame|1080p|*|*|*': 1.48,
            'rate|first-frame|2k|*|*|*': 1.62,
            'rate|first-frame|4k|*|*|*': 1.83,
            'rate|multimodal|480p|*|*|0': 0.6,
            'rate|multimodal|720p|*|*|0': 1.2,
            'rate|multimodal|1080p|*|*|0': 1.48,
            'rate|multimodal|2k|*|*|0': 1.62,
            'rate|multimodal|4k|*|*|0': 1.83,
            'floor-rate|multimodal|480p|*|*|1+': 0.4,
            'floor-rate|multimodal|720p|*|*|1+': 0.8,
            'floor-rate|multimodal|1080p|*|*|1+': 0.8,
            'floor-rate|multimodal|2k|*|*|1+': 0.8,
            'floor-rate|multimodal|4k|*|*|1+': 0.8,
            'floor-duration|multimodal|*|4|*|1+': 7,
            'floor-duration|multimodal|*|5|*|1+': 9,
            'floor-duration|multimodal|*|6|*|1+': 10,
            'floor-duration|multimodal|*|7|*|1+': 12,
            'floor-duration|multimodal|*|8|*|1+': 14,
            'floor-duration|multimodal|*|9|*|1+': 15,
            'floor-duration|multimodal|*|10|*|1+': 17,
            'floor-duration|multimodal|*|11|*|1+': 19,
            'floor-duration|multimodal|*|12|*|1+': 20,
            'floor-duration|multimodal|*|13|*|1+': 22,
            'floor-duration|multimodal|*|14|*|1+': 24,
            'floor-duration|multimodal|*|15|*|1+': 25,
            'surcharge-rate|multimodal|1080p|*|*|1+': 0.28,
            'surcharge-rate|multimodal|2k|*|*|1+': 0.42,
            'surcharge-rate|multimodal|4k|*|*|1+': 0.63
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/text-to-video', model: 'sparkvideo-2.0' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/image-to-video', model: 'sparkvideo-2.0' },
            'multimodal': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/multimodal-video', model: 'sparkvideo-2.0' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 71,
        name:                       'Seedance 2.0 Fast · RH CN站',
        brand:                      'Seedance',
        description:                'RH CN站 Seedance 2.0 Fast 当前画布价；无参考按生成秒计费，有参考按 RH 时长档计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Seedance 2.0 Fast',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['480p', '720p', '1080p', '2k', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '480p': 0.5, '720p': 1.0, '1080p': 1.28, '2k': 1.42, '4k': 1.63 },
        rhPriceRules: {
            'rate|text-to-video|480p|*|*|*': 0.5,
            'rate|text-to-video|720p|*|*|*': 1.0,
            'rate|text-to-video|1080p|*|*|*': 1.28,
            'rate|text-to-video|2k|*|*|*': 1.42,
            'rate|text-to-video|4k|*|*|*': 1.63,
            'rate|first-frame|480p|*|*|*': 0.5,
            'rate|first-frame|720p|*|*|*': 1.0,
            'rate|first-frame|1080p|*|*|*': 1.28,
            'rate|first-frame|2k|*|*|*': 1.42,
            'rate|first-frame|4k|*|*|*': 1.63,
            'rate|multimodal|480p|*|*|0': 0.5,
            'rate|multimodal|720p|*|*|0': 1.0,
            'rate|multimodal|1080p|*|*|0': 1.28,
            'rate|multimodal|2k|*|*|0': 1.42,
            'rate|multimodal|4k|*|*|0': 1.63,
            'floor-rate|multimodal|480p|*|*|1+': 0.3,
            'floor-rate|multimodal|720p|*|*|1+': 0.6,
            'floor-rate|multimodal|1080p|*|*|1+': 0.6,
            'floor-rate|multimodal|2k|*|*|1+': 0.6,
            'floor-rate|multimodal|4k|*|*|1+': 0.6,
            'floor-duration|multimodal|*|4|*|1+': 7,
            'floor-duration|multimodal|*|5|*|1+': 9,
            'floor-duration|multimodal|*|6|*|1+': 10,
            'floor-duration|multimodal|*|7|*|1+': 12,
            'floor-duration|multimodal|*|8|*|1+': 14,
            'floor-duration|multimodal|*|9|*|1+': 15,
            'floor-duration|multimodal|*|10|*|1+': 17,
            'floor-duration|multimodal|*|11|*|1+': 19,
            'floor-duration|multimodal|*|12|*|1+': 20,
            'floor-duration|multimodal|*|13|*|1+': 22,
            'floor-duration|multimodal|*|14|*|1+': 24,
            'floor-duration|multimodal|*|15|*|1+': 25,
            'surcharge-rate|multimodal|1080p|*|*|1+': 0.28,
            'surcharge-rate|multimodal|2k|*|*|1+': 0.42,
            'surcharge-rate|multimodal|4k|*|*|1+': 0.63
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-fast/text-to-video', model: 'sparkvideo-2.0-fast' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-fast/image-to-video', model: 'sparkvideo-2.0-fast' },
            'multimodal': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-fast/multimodal-video', model: 'sparkvideo-2.0-fast' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 72,
        name:                       'Seedance 2.0 Mini · RH CN站',
        brand:                      'Seedance',
        description:                'RH CN站 Seedance 2.0 Mini 当前画布价；无参考按生成秒计费，有参考按 RH 时长档计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Seedance 2.0 Mini',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['480p', '720p', '1080p', '2k', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '480p': 0.3, '720p': 0.6, '1080p': 0.88, '2k': 1.02, '4k': 1.23 },
        rhPriceRules: {
            'rate|text-to-video|480p|*|*|*': 0.3,
            'rate|text-to-video|720p|*|*|*': 0.6,
            'rate|text-to-video|1080p|*|*|*': 0.88,
            'rate|text-to-video|2k|*|*|*': 1.02,
            'rate|text-to-video|4k|*|*|*': 1.23,
            'rate|first-frame|480p|*|*|*': 0.3,
            'rate|first-frame|720p|*|*|*': 0.6,
            'rate|first-frame|1080p|*|*|*': 0.88,
            'rate|first-frame|2k|*|*|*': 1.02,
            'rate|first-frame|4k|*|*|*': 1.23,
            'rate|multimodal|480p|*|*|0': 0.3,
            'rate|multimodal|720p|*|*|0': 0.6,
            'rate|multimodal|1080p|*|*|0': 0.88,
            'rate|multimodal|2k|*|*|0': 1.02,
            'rate|multimodal|4k|*|*|0': 1.23,
            'floor-rate|multimodal|480p|*|*|1+': 0.2,
            'floor-rate|multimodal|720p|*|*|1+': 0.4,
            'floor-rate|multimodal|1080p|*|*|1+': 0.4,
            'floor-rate|multimodal|2k|*|*|1+': 0.4,
            'floor-rate|multimodal|4k|*|*|1+': 0.4,
            'floor-duration|multimodal|*|4|*|1+': 7,
            'floor-duration|multimodal|*|5|*|1+': 9,
            'floor-duration|multimodal|*|6|*|1+': 10,
            'floor-duration|multimodal|*|7|*|1+': 12,
            'floor-duration|multimodal|*|8|*|1+': 14,
            'floor-duration|multimodal|*|9|*|1+': 15,
            'floor-duration|multimodal|*|10|*|1+': 17,
            'floor-duration|multimodal|*|11|*|1+': 19,
            'floor-duration|multimodal|*|12|*|1+': 20,
            'floor-duration|multimodal|*|13|*|1+': 22,
            'floor-duration|multimodal|*|14|*|1+': 24,
            'floor-duration|multimodal|*|15|*|1+': 25,
            'surcharge-rate|multimodal|1080p|*|*|1+': 0.28,
            'surcharge-rate|multimodal|2k|*|*|1+': 0.42,
            'surcharge-rate|multimodal|4k|*|*|1+': 0.63
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/text-to-video', model: 'sparkvideo-2.0-mini' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/image-to-video', model: 'sparkvideo-2.0-mini' },
            'multimodal': { url: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/multimodal-video', model: 'sparkvideo-2.0-mini' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 73,
        name:                       'Kling O3 · RH CN站',
        brand:                      'Kling',
        description:                'RH CN站 Kling O3 带声音牌价（¥/秒）。文生/首帧、参考、编辑分别计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Kling O3',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '720p': 0.69, '1080p': 0.69 },
        costByMode: {
            'text-to-video': { '720p': 0.69, '1080p': 0.69 },
            'first-frame': { '720p': 0.69, '1080p': 0.69 },
            'reference-video': { '720p': 0.72, '1080p': 0.72 },
            'video-edit': { '720p': 0.81, '1080p': 0.81 }
        },
        rhPriceRules: {
            'rate|text-to-video|*|*|*|*': 0.69,
            'rate|text-to-video|*|*|false|*': 0.52,
            'rate|first-frame|*|*|*|*': 0.69,
            'rate|first-frame|*|*|false|*': 0.52,
            'rate|reference-video|*|*|*|*': 0.72,
            'rate|reference-video|*|*|false|*': 0.54,
            'input-video-rate|video-edit|*|*|*|*': 0.81
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 9 } },
            { label: '视频编辑', value: 'video-edit', allowedInputs: { 'text': 10, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-std/text-to-video', model: 'kling-video-o3-std' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-std/image-to-video', model: 'kling-video-o3-std' },
            'reference-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-std/reference-to-video', model: 'kling-video-o3-std' },
            'video-edit': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-std/video-edit', model: 'kling-video-o3-std' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 74,
        name:                       'Kling O3 Pro · RH CN站',
        brand:                      'Kling',
        description:                'RH CN站 Kling O3 Pro 带声音牌价（¥/秒）。文生/首帧、参考、编辑分别计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Kling O3',
        variantLabel:               'Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '720p': 0.87, '1080p': 0.87 },
        costByMode: {
            'text-to-video': { '720p': 0.87, '1080p': 0.87 },
            'first-frame': { '720p': 0.87, '1080p': 0.87 },
            'reference-video': { '720p': 0.90, '1080p': 0.90 },
            'video-edit': { '720p': 1.08, '1080p': 1.08 }
        },
        rhPriceRules: {
            'rate|text-to-video|*|*|*|*': 0.87,
            'rate|text-to-video|*|*|false|*': 0.69,
            'rate|first-frame|*|*|*|*': 0.87,
            'rate|first-frame|*|*|false|*': 0.69,
            'rate|reference-video|*|*|*|*': 0.90,
            'rate|reference-video|*|*|false|*': 0.72,
            'input-video-rate|video-edit|*|*|*|*': 1.08
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 7 } },
            { label: '视频编辑', value: 'video-edit', allowedInputs: { 'text': 10, 'image': 4, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-pro/text-to-video', model: 'kling-video-o3-pro' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-pro/image-to-video', model: 'kling-video-o3-pro' },
            'reference-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-pro/reference-to-video', model: 'kling-video-o3-pro' },
            'video-edit': { url: 'https://www.runninghub.cn/openapi/v2/kling-video-o3-pro/video-edit', model: 'kling-video-o3-pro' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 75,
        name:                       'Kling V3 Turbo · RH CN站',
        brand:                      'Kling',
        description:                'RH CN站 Kling V3 Turbo。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Kling V3 Turbo',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '720p': 0.74, '1080p': 0.74 },
        rhPriceRules: {
            'rate|text-to-video|*|*|*|*': 0.74,
            'rate|first-frame|*|*|*|*': 0.74
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-v3-turbo-std/text-to-video', model: 'kling-v3-turbo-std' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/kling-v3-turbo-std/image-to-video', model: 'kling-v3-turbo-std' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 76,
        name:                       'Kling V3.0 · RH CN站',
        brand:                      'Kling',
        description:                'RH CN站 Kling V3.0。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Kling V3.0',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '720p': 0.78, '1080p': 0.78 },
        rhPriceRules: {
            'rate|text-to-video|*|*|*|*': 0.78,
            'rate|text-to-video|*|*|false|*': 0.52,
            'rate|first-frame|*|*|*|*': 0.78,
            'rate|first-frame|*|*|false|*': 0.52
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-v3.0-std/text-to-video', model: 'kling-v3.0-std' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/kling-v3.0-std/image-to-video', model: 'kling-v3.0-std' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 77,
        name:                       'Kling V3 4K · RH CN站',
        brand:                      'Kling',
        description:                'RH CN站 Kling V3 4K。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Kling V3 4K',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '4k': 2.7 },
        rhPriceRules: {
            'rate|text-to-video|4k|*|*|*': 2.7,
            'rate|first-frame|4k|*|*|*': 2.7
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/kling-v3-4k/text-to-video', model: 'kling-v3-4k' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/kling-v3-4k/image-to-video', model: 'kling-v3-4k' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 78,
        name:                       'MiniMax H3 · RH CN站',
        brand:                      'MiniMax',
        description:                'RH CN站 MiniMax H3 当前画布价；输出视频按分辨率与生成秒计费，多参图片前 5 张免费，超出后每张 ¥0.20。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'MiniMax H3',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['768p', '2k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '768p': 0.38, '2k': 0.62 },
        rhPriceRules: {
            'rate|text-to-video|768p|*|*|*': 0.38,
            'rate|text-to-video|2k|*|*|*': 0.62,
            'rate|first-frame|768p|*|*|*': 0.38,
            'rate|first-frame|2k|*|*|*': 0.62,
            'rate|multimodal|768p|*|*|*': 0.38,
            'rate|multimodal|2k|*|*|*': 0.62,
            'image-surcharge|multimodal|*|5|*|1+': 0.20
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '全能参考', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'video': 3, 'audio': 3 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/minimax/hailuo-h3/text-to-video', model: 'hailuo-h3' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/minimax/hailuo-h3/image-to-video', model: 'hailuo-h3' },
            'multimodal': { url: 'https://www.runninghub.cn/openapi/v2/minimax/hailuo-h3/multimodal-to-video', model: 'hailuo-h3' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 5, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 79,
        name:                       'Vidu Q3 Pro · RH CN站',
        brand:                      'Vidu',
        description:                'RH CN站 Vidu Q3 Pro。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Vidu Q3 Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['540p', '720p', '1080p', '2k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '540p': 0.31, '720p': 0.66, '1080p': 0.70, '2k': 1.09 },
        rhPriceRules: {
            'rate|text-to-video|540p|*|*|*': 0.31,
            'rate|text-to-video|720p|*|*|*': 0.66,
            'rate|text-to-video|1080p|*|*|*': 0.70,
            'rate|first-frame|540p|*|*|*': 0.31,
            'rate|first-frame|720p|*|*|*': 0.66,
            'rate|first-frame|1080p|*|*|*': 0.70,
            'rate|first-frame|2k|*|*|*': 1.09,
            'rate|i2v-first-last-frame|540p|*|*|*': 0.31,
            'rate|i2v-first-last-frame|720p|*|*|*': 0.66,
            'rate|i2v-first-last-frame|1080p|*|*|*': 0.70
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/vidu/text-to-video-q3-pro', model: 'vidu' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/vidu/image-to-video-q3-pro', model: 'vidu' },
            'i2v-first-last-frame': { url: 'https://www.runninghub.cn/openapi/v2/vidu/start-end-to-video-q3-pro', model: 'vidu' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 1, max: 16, unit: 's' }
        ]
    },
{ catalogOrder: 80,
        name:                       'Vidu Q3 Turbo · RH CN站',
        brand:                      'Vidu',
        description:                'RH CN站 Vidu Q3 Turbo 牌价（¥/秒）；文生、首帧、首尾帧同价。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Vidu Q3 Turbo',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        resolutions:                ['540p', '720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '540p': 0.18, '720p': 0.27, '1080p': 0.35 },
        rhPriceRules: {
            'rate|text-to-video|540p|*|*|*': 0.18,
            'rate|text-to-video|720p|*|*|*': 0.27,
            'rate|text-to-video|1080p|*|*|*': 0.35,
            'rate|first-frame|540p|*|*|*': 0.18,
            'rate|first-frame|720p|*|*|*': 0.27,
            'rate|first-frame|1080p|*|*|*': 0.35,
            'rate|i2v-first-last-frame|540p|*|*|*': 0.18,
            'rate|i2v-first-last-frame|720p|*|*|*': 0.27,
            'rate|i2v-first-last-frame|1080p|*|*|*': 0.35
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.cn/openapi/v2/vidu/text-to-video-q3-turbo', model: 'vidu' },
            'first-frame': { url: 'https://www.runninghub.cn/openapi/v2/vidu/image-to-video-q3-turbo', model: 'vidu' },
            'i2v-first-last-frame': { url: 'https://www.runninghub.cn/openapi/v2/vidu/start-end-to-video-q3-turbo', model: 'vidu' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 81,
        name:                       'Vidu Q3 Reference · RH CN站',
        brand:                      'Vidu',
        description:                'RH CN站 Vidu Q3 独立参考生视频。支持 1–7 张参考图、3–16 秒和 540p/720p/1080p。',
        timeEstimate:               '15min',
        provider:                   'RunningHubVideoProvider',
        source:                     'runninghub',
        canonicalModel:             'Vidu Q3 Reference',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        resolutions:                ['540p', '720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3"],
        cost:                       { '540p': 0.22, '720p': 0.44, '1080p': 0.55 },
        rhPriceRules: {
            'rate|reference-video|540p|*|*|*': 0.22,
            'rate|reference-video|720p|*|*|*': 0.44,
            'rate|reference-video|1080p|*|*|*': 0.55
        },
        videoModes: [
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 7 } }
        ],
        endpoint: {
            'reference-video': { url: 'https://www.runninghub.cn/openapi/v2/vidu/reference-to-video-q3', model: 'vidu' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 16, unit: 's' }
        ]
    },
];

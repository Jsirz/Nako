export const IMAGE_MODELS = [
{ catalogOrder: 42,
        name:                       'GPT Image 2 · RH AI站',
        description:                'RH AI 站 gpt-image-2 官方稳定版；采用当前画布 medium 画质档人民币价格',
        timeEstimate:               '5min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'GPT Image 2',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       { "1K": 0.38, "2K": 0.76, "4K": 1.13 },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-g-2-official/text-to-image', model: 'rhart-image-g-2-official' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-g-2-official/image-to-image', model: 'rhart-image-g-2-official' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 43,
        name:                       'GPT Image 2 · RH AI站低价',
        premium:                    true,
        tier:                       'budget',
        description:                'RH AI 站低价渠道，当前画布人民币一口价；分辨率不可控，介意请用官方稳定版',
        timeEstimate:               '5min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'GPT Image 2',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.10,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-g-2/text-to-image', model: 'rhart-image-g-2' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-g-2/image-to-image', model: 'rhart-image-g-2' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 44,
        name:                       'Nano Banana Pro · RH AI站',
        description:                'RH AI 站 nano-banana-pro 官方稳定版；采用当前画布人民币价格',
        timeEstimate:               '5min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { "1K": 0.80, "2K": 1.00, "4K": 1.50 },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-pro-official/text-to-image', model: 'rhart-image-n-pro-official' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-pro-official/edit', model: 'rhart-image-n-pro-official' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 45,
        name:                       'Nano Banana Pro · RH AI站低价',
        premium:                    true,
        tier:                       'budget',
        description:                'RH AI 站低价渠道；采用当前画布人民币价格，稳定性不保证',
        timeEstimate:               '5min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { "1K": 0.40, "2K": 0.40, "4K": 0.50 },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-pro/text-to-image', model: 'rhart-image-n-pro' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-pro/edit', model: 'rhart-image-n-pro' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 46,
        name:                       'Nano Banana 2 · RH AI站',
        description:                'RH AI 站 nano-banana-2 官方稳定版；采用当前画布人民币价格',
        timeEstimate:               '5min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana 2',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  14,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { "1K": 0.49, "2K": 0.74, "4K": 0.99 },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 14 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 14, 'image': 14 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash-official/text-to-image', model: 'rhart-image-n-g31-flash-official' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash-official/image-to-image', model: 'rhart-image-n-g31-flash-official' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 47,
        name:                       'Nano Banana 2 · RH AI站低价',
        premium:                    true,
        tier:                       'budget',
        description:                'RH AI 站低价渠道；采用当前画布人民币价格，稳定性不保证',
        timeEstimate:               '5min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana 2',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  14,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { "1K": 0.19, "2K": 0.19, "4K": 0.30 },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 14 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 14, 'image': 14 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash/text-to-image', model: 'rhart-image-n-g31-flash' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash/image-to-image', model: 'rhart-image-n-g31-flash' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 48,
        name:                       'Nano Banana 1 · RH AI站',
        description:                'RH AI 站初代 nano-banana 官方稳定版；采用当前画布人民币一口价',
        timeEstimate:               '3min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana 1',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.20,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-v1-official/text-to-image', model: 'rhart-image-v1-official' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-v1-official/edit', model: 'rhart-image-v1-official' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 49,
        name:                       'Nano Banana 1 · RH AI站低价',
        premium:                    true,
        tier:                       'budget',
        description:                'RH AI 站低价渠道，折算自 $0.01 一口价；稳定性不保证',
        timeEstimate:               '3min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana 1',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.07,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-v1/text-to-image', model: 'rhart-image-v1' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-v1/edit', model: 'rhart-image-v1' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 50,
        name:                       'Nano Banana 2 Lite · RH AI站',
        description:                'RH AI 站 nano-banana-2-lite 官方稳定版；采用当前画布人民币一口价',
        timeEstimate:               '3min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana 2 Lite',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.22,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash-lite/text-to-image', model: 'rhart-image-n-g31-flash-lite' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash-lite/image-to-image', model: 'rhart-image-n-g31-flash-lite' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 51,
        name:                       'Nano Banana 2 Lite · RH AI站低价',
        premium:                    true,
        tier:                       'budget',
        description:                'RH AI 站低价渠道，折算自 $0.01 一口价；稳定性不保证',
        timeEstimate:               '3min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Nano Banana 2 Lite',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.07,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash-lite/text-to-image', model: 'rhart-image-n-g31-flash-lite' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-n-g31-flash-lite/image-to-image', model: 'rhart-image-n-g31-flash-lite' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 52,
        name:                       'Grok 2 · RH AI站',
        brand:                      'Grok 2',
        description:                'RH AI 站 grok-imagine-image 官方稳定版；采用当前画布人民币一口价',
        timeEstimate:               '3min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Grok 2',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  1,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.14,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 1 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 1, 'image': 1 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-x-official/text-to-image', model: 'rhart-image-x-official' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-x-official/edit', model: 'rhart-image-x-official' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 53,
        name:                       'Grok 2 · RH AI站低价',
        brand:                      'Grok 2',
        premium:                    true,
        tier:                       'budget',
        description:                'RH AI 站低价渠道；采用当前画布人民币一口价，稳定性不保证',
        timeEstimate:               '3min',
        provider:                   'RunningHubGlobalImageProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Grok 2',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  1,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             20,
        resolutions:                ["1K", "2K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        cost:                       0.08,
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 1 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 1, 'image': 1 } }
        ],
        endpoint: {
            'text-to-image':  { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-g/text-to-image', model: 'rhart-image-g' },
            'image-to-image': { url: 'https://www.runninghub.ai/openapi/v2/rhart-image-g/image-to-image', model: 'rhart-image-g' }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
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
export const VIDEO_MODELS = [
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
{ catalogOrder: 82,
        name:                       'Seedance 2.0 Fast · RH AI站',
        brand:                      'Seedance',
        description:                'RH AI站 Seedance 2.0 Fast 当前画布人民币价；无参考按生成秒计费，有参考按 RH 时长档计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Seedance 2.0 Fast',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['480p', '720p', '1080p', '2k', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '480p': 0.56, '720p': 1.12, '1080p': 1.40, '2k': 1.54, '4k': 1.75 },
        rhPriceRules: {
            'rate|text-to-video|480p|*|*|*': 0.56,
            'rate|text-to-video|720p|*|*|*': 1.12,
            'rate|text-to-video|1080p|*|*|*': 1.40,
            'rate|text-to-video|2k|*|*|*': 1.54,
            'rate|text-to-video|4k|*|*|*': 1.75,
            'rate|first-frame|480p|*|*|*': 0.56,
            'rate|first-frame|720p|*|*|*': 1.12,
            'rate|first-frame|1080p|*|*|*': 1.40,
            'rate|first-frame|2k|*|*|*': 1.54,
            'rate|first-frame|4k|*|*|*': 1.75,
            'rate|multimodal|480p|*|*|0': 0.56,
            'rate|multimodal|720p|*|*|0': 1.12,
            'rate|multimodal|1080p|*|*|0': 1.40,
            'rate|multimodal|2k|*|*|0': 1.54,
            'rate|multimodal|4k|*|*|0': 1.75,
            'floor-rate|multimodal|480p|*|*|1+': 0.35,
            'floor-rate|multimodal|720p|*|*|1+': 0.70,
            'floor-rate|multimodal|1080p|*|*|1+': 0.70,
            'floor-rate|multimodal|2k|*|*|1+': 0.70,
            'floor-rate|multimodal|4k|*|*|1+': 0.70,
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
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video/sparkvideo-2.0-fast/text-to-video', model: 'sparkvideo-2.0-fast' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video/sparkvideo-2.0-fast/image-to-video', model: 'sparkvideo-2.0-fast' },
            'multimodal': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video/sparkvideo-2.0-fast/multimodal-video', model: 'sparkvideo-2.0-fast' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 83,
        name:                       'Kling O3 · RH AI站',
        brand:                      'Kling',
        description:                'RH AI站 Kling O3 带声音牌价（¥/秒）。与 CN 站为独立账号和 API Key；文生/首帧、参考、编辑分别计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Kling O3',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video', 'audio'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '720p': 0.70, '1080p': 0.70 },
        costByMode: {
            'text-to-video': { '720p': 0.70, '1080p': 0.70 },
            'first-frame': { '720p': 0.70, '1080p': 0.70 },
            'reference-video': { '720p': 0.70, '1080p': 0.70 },
            'video-edit': { '720p': 0.77, '1080p': 0.77 }
        },
        rhPriceRules: {
            'rate|text-to-video|*|*|*|*': 0.70,
            'rate|text-to-video|*|*|false|*': 0.56,
            'rate|first-frame|*|*|*|*': 0.70,
            'rate|first-frame|*|*|false|*': 0.56,
            'rate|reference-video|*|*|*|*': 0.70,
            'rate|reference-video|*|*|false|*': 0.56,
            'input-video-rate|video-edit|*|*|*|*': 0.77
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 9 } },
            { label: '视频编辑', value: 'video-edit', allowedInputs: { 'text': 10, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-std/text-to-video', model: 'kling-video-o3-std' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-std/image-to-video', model: 'kling-video-o3-std' },
            'reference-video': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-std/reference-to-video', model: 'kling-video-o3-std' },
            'video-edit': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-std/video-edit', model: 'kling-video-o3-std' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 84,
        name:                       'Kling O3 Pro · RH AI站',
        brand:                      'Kling',
        description:                'RH AI站 Kling O3 Pro 带声音牌价（¥/秒）。与 CN 站为独立账号和 API Key；文生/首帧、参考、编辑分别计费。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Kling O3',
        variantLabel:               'Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '720p': 0.91, '1080p': 0.91 },
        costByMode: {
            'text-to-video': { '720p': 0.91, '1080p': 0.91 },
            'first-frame': { '720p': 0.91, '1080p': 0.91 },
            'reference-video': { '720p': 0.91, '1080p': 0.91 },
            'video-edit': { '720p': 1.05, '1080p': 1.05 }
        },
        rhPriceRules: {
            'rate|text-to-video|*|*|*|*': 0.91,
            'rate|text-to-video|*|*|false|*': 0.70,
            'rate|first-frame|*|*|*|*': 0.91,
            'rate|first-frame|*|*|false|*': 0.70,
            'rate|reference-video|*|*|*|*': 0.91,
            'rate|reference-video|*|*|false|*': 0.70,
            'input-video-rate|video-edit|*|*|*|*': 1.05
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 7 } },
            { label: '视频编辑', value: 'video-edit', allowedInputs: { 'text': 10, 'image': 4, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-pro/text-to-video', model: 'kling-video-o3-pro' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-pro/image-to-video', model: 'kling-video-o3-pro' },
            'reference-video': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-pro/reference-to-video', model: 'kling-video-o3-pro' },
            'video-edit': { url: 'https://www.runninghub.ai/openapi/v2/kling-video-o3-pro/video-edit', model: 'kling-video-o3-pro' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 85,
        name:                       'Vidu Q3 Turbo · RH AI站',
        brand:                      'Vidu',
        description:                'RH AI站 Vidu Q3 Turbo 牌价（¥/秒）。与 CN 站为独立账号和 API Key；文生、首帧、首尾帧同价。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Vidu Q3 Turbo',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        resolutions:                ['540p', '720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '540p': 0.21, '720p': 0.28, '1080p': 0.42 },
        rhPriceRules: {
            'rate|text-to-video|540p|*|*|*': 0.21,
            'rate|text-to-video|720p|*|*|*': 0.28,
            'rate|text-to-video|1080p|*|*|*': 0.42,
            'rate|first-frame|540p|*|*|*': 0.21,
            'rate|first-frame|720p|*|*|*': 0.28,
            'rate|first-frame|1080p|*|*|*': 0.42,
            'rate|i2v-first-last-frame|540p|*|*|*': 0.21,
            'rate|i2v-first-last-frame|720p|*|*|*': 0.28,
            'rate|i2v-first-last-frame|1080p|*|*|*': 0.42
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/vidu/text-to-video-q3-turbo', model: 'vidu' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/vidu/image-to-video-q3-turbo', model: 'vidu' },
            'i2v-first-last-frame': { url: 'https://www.runninghub.ai/openapi/v2/vidu/start-end-to-video-q3-turbo', model: 'vidu' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 86,
        name:                       'Vidu Q3 Reference · RH AI站',
        brand:                      'Vidu',
        description:                'RH AI站 Vidu Q3 独立参考生视频。与 CN 站为独立账号和 API Key；支持 1–7 张参考图、3–16 秒和 540p/720p/1080p。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Vidu Q3 Reference',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        resolutions:                ['540p', '720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3"],
        cost:                       { '540p': 0.28, '720p': 0.49, '1080p': 0.63 },
        rhPriceRules: {
            'rate|reference-video|540p|*|*|*': 0.28,
            'rate|reference-video|720p|*|*|*': 0.49,
            'rate|reference-video|1080p|*|*|*': 0.63
        },
        videoModes: [
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 7 } }
        ],
        endpoint: {
            'reference-video': { url: 'https://www.runninghub.ai/openapi/v2/vidu/reference-to-video-q3', model: 'vidu' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 16, unit: 's' }
        ]
    },
{ catalogOrder: 87,
        name:                       'Grok · RH AI站',
        brand:                      'Grok',
        description:                'RH AI站 Grok-官方稳定版。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Grok',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['480p', '720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '480p': 0.56, '720p': 0.98, '1080p': 1.75 },
        rhPriceRules: {
            'rate|text-to-video|480p|*|*|*': 0.56,
            'rate|text-to-video|720p|*|*|*': 0.98,
            'rate|text-to-video|1080p|*|*|*': 1.75,
            'rate|first-frame|480p|*|*|*': 0.56,
            'rate|first-frame|720p|*|*|*': 0.98,
            'image-surcharge|first-frame|*|0|*|1+': 0.07,
            'rate|reference-video|480p|*|*|*': 0.56,
            'rate|reference-video|720p|*|*|*': 0.98,
            'image-surcharge|reference-video|*|0|*|1+': 0.07,
            'input-video-rate|video-edit|*|*|*|*': 0.42,
            'total|video-extend|*|6|*|*': 1.89,
            'total|video-extend|*|10|*|*': 3.15
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 9 } },
            { label: '视频编辑', value: 'video-edit', allowedInputs: { 'text': 10, 'video': 1 } },
            { label: '视频延长', value: 'video-extend', allowedInputs: { 'text': 10, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g-official/text-to-video-v1.5', model: 'rhart-video-g-official' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g-official/image-to-video-v1.5', model: 'rhart-video-g-official' },
            'reference-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g-official/reference-to-video-v1.5', model: 'rhart-video-g-official' },
            'video-edit': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g-official/edit-video', model: 'rhart-video-g-official' },
            'video-extend': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g-official/video-extend', model: 'rhart-video-g-official' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 88,
        name:                       'Grok · RH AI站低价',
        brand:                      'Grok',
        description:                'RH AI站 Grok-低价渠道版。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Grok',
        tier:                       'budget',
        premium:                    true,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['480p', '720p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        cost:                       { '480p': 0.21, '720p': 0.21 },
        rhPriceRules: {
            'rate|text-to-video|480p|*|*|*': 0.21,
            'rate|text-to-video|720p|*|*|*': 0.21,
            'rate|first-frame|480p|*|*|*': 0.21,
            'rate|first-frame|720p|*|*|*': 0.21
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g/text-to-video', model: 'rhart-video-g' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-g/image-to-video', model: 'rhart-video-g' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 6, min: 6, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 89,
        name:                       'Veo 3.1 Lite · RH AI站',
        brand:                      'Veo',
        description:                'RH AI站 Veo-Lite。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Veo 3.1 Lite',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        fixedDuration:              8,
        cost:                       { '720p': 0.35, '1080p': 0.56 },
        rhPriceRules: {
            'rate|text-to-video|720p|8|*|*': 0.35,
            'rate|text-to-video|1080p|8|*|*': 0.56,
            'rate|first-frame|720p|8|*|*': 0.35,
            'rate|first-frame|1080p|8|*|*': 0.56,
            'total|i2v-first-last-frame|720p|8|*|*': 2.52,
            'total|i2v-first-last-frame|1080p|8|*|*': 4.06
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-lite-official/text-to-video', model: 'rhart-video-v3.1-lite-official' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-lite-official/image-to-video', model: 'rhart-video-v3.1-lite-official' },
            'i2v-first-last-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-lite-official/start-end-to-video', model: 'rhart-video-v3.1-lite-official' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 90,
        name:                       'Veo 3.1 Fast · RH AI站',
        brand:                      'Veo',
        description:                'RH AI站 Veo-Fast。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Veo 3.1 Fast',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        fixedDuration:              8,
        cost:                       { '720p': 0.8925, '1080p': 0.8925, '4k': 0.8925 },
        rhPriceRules: {
            'total|text-to-video|720p|8|*|*': 7.14,
            'total|text-to-video|720p|8|false|*': 4.76,
            'total|text-to-video|1080p|8|*|*': 7.14,
            'total|text-to-video|1080p|8|false|*': 4.76,
            'total|text-to-video|4k|8|*|*': 7.14,
            'total|text-to-video|4k|8|false|*': 4.76,
            'total|first-frame|720p|8|*|*': 7.14,
            'total|first-frame|720p|8|false|*': 4.76,
            'total|first-frame|1080p|8|*|*': 7.14,
            'total|first-frame|1080p|8|false|*': 4.76,
            'total|first-frame|4k|8|*|*': 7.14,
            'total|first-frame|4k|8|false|*': 4.76,
            'total|reference-video|720p|8|*|*': 5.04,
            'total|reference-video|720p|8|false|*': 4.06,
            'total|reference-video|1080p|8|*|*': 6.02,
            'total|reference-video|1080p|8|false|*': 5.04,
            'total|video-extend|*|8|*|*': 6.65
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 9 } },
            { label: '视频延长', value: 'video-extend', allowedInputs: { 'text': 10, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast-official/text-to-video', model: 'rhart-video-v3.1-fast-official' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast-official/image-to-video', model: 'rhart-video-v3.1-fast-official' },
            'reference-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast-official/reference-to-video', model: 'rhart-video-v3.1-fast-official' },
            'video-extend': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast-official/video-extend', model: 'rhart-video-v3.1-fast-official' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 91,
        name:                       'Veo 3.1 Pro · RH AI站',
        brand:                      'Veo',
        description:                'RH AI站 Veo-Pro。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Veo 3.1 Pro',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        fixedDuration:              8,
        cost:                       { '720p': 2.38, '1080p': 2.38, '4k': 2.38 },
        rhPriceRules: {
            'total|text-to-video|720p|8|*|*': 19.04,
            'total|text-to-video|720p|8|false|*': 9.52,
            'total|text-to-video|1080p|8|*|*': 19.04,
            'total|text-to-video|1080p|8|false|*': 9.52,
            'total|text-to-video|4k|8|*|*': 19.04,
            'total|text-to-video|4k|8|false|*': 9.52,
            'total|first-frame|720p|8|*|*': 19.04,
            'total|first-frame|720p|8|false|*': 9.52,
            'total|first-frame|1080p|8|*|*': 19.04,
            'total|first-frame|1080p|8|false|*': 9.52,
            'total|first-frame|4k|8|*|*': 19.04,
            'total|first-frame|4k|8|false|*': 9.52,
            'total|reference-video|720p|8|*|*': 19.04,
            'total|reference-video|720p|8|false|*': 9.52,
            'total|reference-video|1080p|8|*|*': 19.04,
            'total|reference-video|1080p|8|false|*': 9.52,
            'total|reference-video|4k|8|*|*': 19.04,
            'total|reference-video|4k|8|false|*': 9.52,
            'total|video-extend|*|8|*|*': 17.64
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多图参考', value: 'reference-video', allowedInputs: { 'text': 10, 'image': 9 } },
            { label: '视频延长', value: 'video-extend', allowedInputs: { 'text': 10, 'video': 1 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro-official/text-to-video', model: 'rhart-video-v3.1-pro-official' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro-official/image-to-video', model: 'rhart-video-v3.1-pro-official' },
            'reference-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro-official/reference-to-video', model: 'rhart-video-v3.1-pro-official' },
            'video-extend': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro-official/video-extend', model: 'rhart-video-v3.1-pro-official' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 92,
        name:                       'Veo 3.1 Fast · RH AI站低价',
        brand:                      'Veo',
        description:                'RH AI站 Veo-Fast-低价渠道版。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Veo 3.1 Fast',
        tier:                       'budget',
        premium:                    true,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        fixedDuration:              8,
        cost:                       { '720p': 0.175, '1080p': 0.175, '4k': 0.175 },
        rhPriceRules: {
            'total|text-to-video|720p|8|*|*': 1.40,
            'total|text-to-video|1080p|8|*|*': 1.40,
            'total|text-to-video|4k|8|*|*': 1.40,
            'total|first-frame|720p|8|*|*': 1.40,
            'total|first-frame|1080p|8|*|*': 1.40,
            'total|first-frame|4k|8|*|*': 1.40,
            'total|i2v-first-last-frame|720p|8|*|*': 1.40,
            'total|i2v-first-last-frame|1080p|8|*|*': 1.40,
            'total|i2v-first-last-frame|4k|8|*|*': 1.40
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast/text-to-video', model: 'rhart-video-v3.1-fast' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast/image-to-video', model: 'rhart-video-v3.1-fast' },
            'i2v-first-last-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-fast/start-end-to-video', model: 'rhart-video-v3.1-fast' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 93,
        name:                       'Veo 3.1 Pro · RH AI站低价',
        brand:                      'Veo',
        description:                'RH AI站 Veo-Pro-低价渠道版。版本切法与 RunningHub 自己的模型选择器一致。',
        timeEstimate:               '15min',
        provider:                   'RunningHubGlobalVideoProvider',
        source:                     'runninghub_global',
        canonicalModel:             'Veo 3.1 Pro',
        tier:                       'budget',
        premium:                    true,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        resolutions:                ['720p', '1080p', '4k'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        fixedDuration:              8,
        cost:                       { '720p': 0.11375, '1080p': 0.14875, '4k': 0.20125 },
        rhPriceRules: {
            'total|text-to-video|720p|8|*|*': 0.91,
            'total|text-to-video|1080p|8|*|*': 1.19,
            'total|text-to-video|4k|8|*|*': 1.61,
            'total|first-frame|720p|8|*|*': 0.91,
            'total|first-frame|1080p|8|*|*': 1.19,
            'total|first-frame|4k|8|*|*': 1.61,
            'total|i2v-first-last-frame|720p|8|*|*': 0.91,
            'total|i2v-first-last-frame|1080p|8|*|*': 1.19,
            'total|i2v-first-last-frame|4k|8|*|*': 1.61
        },
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首帧', value: 'first-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-video': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro/text-to-video', model: 'rhart-video-v3.1-pro' },
            'first-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro/image-to-video', model: 'rhart-video-v3.1-pro' },
            'i2v-first-last-frame': { url: 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro/start-end-to-video', model: 'rhart-video-v3.1-pro' }
        },
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    }
];
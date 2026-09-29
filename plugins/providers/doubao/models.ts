export const TEXT_MODELS = [
{ catalogOrder: 0,
        name:                       '豆包大语言2.0-mini',
        description:                '低成本、高并发、多模态极致速度',
        timeEstimate:               '2min',
        provider:                   'DoubaoTextProvider',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0.01,
        languageModes: [
            { label: '多模态对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10, 'video': 1 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                model: 'doubao-seed-2-0-mini-260428'
            }
        },
        advancedParams: [
            {
                key: 'reasoning', label: '思考强度', type: 'select', default: 'minimal', options: [
                    { label: '高', value: 'high' },
                    { label: '中等', value: 'medium' },
                    { label: '低', value: 'low' },
                    { label: '关闭', value: 'minimal' }
                ]
            },
            {
                key: 'detail', label: '图片细节', type: 'select', default: 'low', options: [
                    { label: '超高', value: 'xhigh' },
                    { label: '高', value: 'high' },
                    { label: '低', value: 'low' }
                ]
            }
        ]
    },
{ catalogOrder: 1,
        name:                       '豆包大语言2.0-lite',
        description:                '豆包 2.0 lite 官方多模态大语言模型，费用以官方账单为准',
        timeEstimate:               '2min',
        provider:                   'DoubaoTextProvider',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                [],
        aspectRatios:               [],
        languageModes: [
            { label: '多模态对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10, 'video': 1 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                model: 'doubao-seed-2-0-lite-260428'
            }
        },
        advancedParams: [
            {
                key: 'reasoning', label: '思考强度', type: 'select', default: 'medium', options: [
                    { label: '高', value: 'high' },
                    { label: '中等', value: 'medium' },
                    { label: '低', value: 'low' },
                    { label: '关闭', value: 'minimal' }
                ]
            },
            {
                key: 'detail', label: '图片细节', type: 'select', default: 'low', options: [
                    { label: '超高', value: 'xhigh' },
                    { label: '高', value: 'high' },
                    { label: '低', value: 'low' }
                ]
            }
        ]
    },
{ catalogOrder: 2,
        name:                       '豆包大语言2.1-pro',
        description:                '豆包 2.1 pro 官方多模态大语言模型，费用以官方账单为准',
        timeEstimate:               '2min',
        provider:                   'DoubaoTextProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                [],
        aspectRatios:               [],
        languageModes: [
            { label: '多模态对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10, 'video': 1 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                model: 'doubao-seed-2-1-pro-260628'
            }
        },
        advancedParams: [
            {
                key: 'reasoning', label: '思考强度', type: 'select', default: 'high', options: [
                    { label: '高', value: 'high' },
                    { label: '中等', value: 'medium' },
                    { label: '低', value: 'low' },
                    { label: '关闭', value: 'minimal' }
                ]
            },
            {
                key: 'detail', label: '图片细节', type: 'select', default: 'low', options: [
                    { label: '超高', value: 'xhigh' },
                    { label: '高', value: 'high' },
                    { label: '低', value: 'low' }
                ]
            }
        ]
    },
{ catalogOrder: 3,
        name:                       '豆包大语言2.1-turbo',
        description:                '豆包 2.1 turbo 官方多模态大语言模型，费用以官方账单为准',
        timeEstimate:               '2min',
        provider:                   'DoubaoTextProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                [],
        aspectRatios:               [],
        languageModes: [
            { label: '多模态对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10, 'video': 1 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                model: 'doubao-seed-2-1-turbo-260628'
            }
        },
        advancedParams: [
            {
                key: 'reasoning', label: '思考强度', type: 'select', default: 'high', options: [
                    { label: '高', value: 'high' },
                    { label: '中等', value: 'medium' },
                    { label: '低', value: 'low' },
                    { label: '关闭', value: 'minimal' }
                ]
            },
            {
                key: 'detail', label: '图片细节', type: 'select', default: 'low', options: [
                    { label: '超高', value: 'xhigh' },
                    { label: '高', value: 'high' },
                    { label: '低', value: 'low' }
                ]
            }
        ]
    },
{ catalogOrder: 4,
        name:                       '豆包大语言2.0-pro',
        description:                '高性能、高精度、多模态深度推理',
        timeEstimate:               '2min',
        provider:                   'DoubaoTextProvider',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0.05,
        languageModes: [
            { label: '多模态对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10, 'video': 1 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                model: 'doubao-seed-2-0-pro-260215'
            }
        },
        advancedParams: [
            {
                key: 'reasoning', label: '思考强度', type: 'select', default: 'minimal', options: [
                    { label: '高', value: 'high' },
                    { label: '中等', value: 'medium' },
                    { label: '低', value: 'low' },
                    { label: '关闭', value: 'minimal' }
                ]
            },
            {
                key: 'detail', label: '图片细节', type: 'select', default: 'low', options: [
                    { label: '超高', value: 'xhigh' },
                    { label: '高', value: 'high' },
                    { label: '低', value: 'low' }
                ]
            }
        ]
    }
];
export const IMAGE_MODELS = [
{ catalogOrder: 21,
        name:                       '豆包图片4.0(多参考)',
        description:                '美感、匹配、一致与速度',
        timeEstimate:               '1min',
        provider:                   'DoubaoImageProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
        cost: {
            "512": 0.2,
            "1K": 0.2,
            "2K": 0.2,
            "4K": 0.2
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10} }
        ],
        endpoint: {
            'text-to-image': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
                model: 'doubao-seedream-4-0-250828'
            },
            'image-to-image': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
                model: 'doubao-seedream-4-0-250828'
            }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 4 }
        ]
    },
{ catalogOrder: 22,
        name:                       '豆包图片4.5(多参考)',
        description:                '美感、匹配、一致与速度++',
        timeEstimate:               '1min',
        provider:                   'DoubaoImageProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                ["2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
        cost: {
            "512": 0.25,
            "1K": 0.25,
            "2K": 0.25,
            "4K": 0.25
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
                model: 'doubao-seedream-4-5-251128'
            },
            'image-to-image': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
                model: 'doubao-seedream-4-5-251128'
            }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 4 }
        ]
    },
{ catalogOrder: 23,
        name:                       '豆包图片5.0-lite',
        description:                '知识广、一致性、支持联网搜索',
        timeEstimate:               '1min',
        provider:                   'DoubaoImageProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp', 'bmp', 'tiff'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                ["2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
        cost: {
            "512": 0.22,
            "1K": 0.22,
            "2K": 0.22,
            "4K": 0.22
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'text-to-image': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
                model: 'doubao-seedream-5-0-260128'
            },
            'image-to-image': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
                model: 'doubao-seedream-5-0-260128'
            }
        },
        advancedParams: [
            { key: 'web_search', label: '联网搜索', type: 'toggle', default: false },
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 4 }
        ]
    }
];
export const VIDEO_MODELS = [
{ catalogOrder: 104,
        name:                       '豆包视频2.0',
        canonicalModel:             'Seedance 2.0',
        description:                '字节视频生成seedance 2.0',
        timeEstimate:               '5min',
        provider:                   'DoubaoVideoProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'audio', 'video'],
        cost: {
            '480p': 0.60,
            '720p': 1.35,
            '1080p': 1.35
        },
        resolutions:                ['480p', '720p', '1080p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '多模态', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'audio': 3, 'video': 3 } },
        ],
        endpoint: {
            'text-to-video': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
                model: 'doubao-seedance-2-0-260128'
            },
            'i2v-first-last-frame': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
                model: 'doubao-seedance-2-0-260128'
            },
            'multimodal': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
                model: 'doubao-seedance-2-0-260128'
            }
        },
        generate_audio:             true,
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 4, min: 4, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 105,
        name:                       '豆包视频2.0 fast',
        canonicalModel:             'Seedance 2.0 Fast',
        description:                '字节视频生成seedance 2.0 fast',
        timeEstimate:               '5min',
        provider:                   'DoubaoVideoProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'audio', 'video'],
        cost: {
            '480p': 0.37,
            '720p': 1.35,
            '1080p': 1.35
        },
        resolutions:                ['480p', '720p'],
        aspectRatios:               ["1:1", "9:16", "16:9", "3:4", "4:3", "21:9"],
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 1 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 1, 'image': 2 } },
            { label: '多模态', value: 'multimodal', allowedInputs: { 'text': 10, 'image': 9, 'audio': 3, 'video': 3 } },
        ],
        endpoint: {
            'text-to-video': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
                model: 'doubao-seedance-2-0-fast-260128'
            },
            'i2v-first-last-frame': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
                model: 'doubao-seedance-2-0-fast-260128'
            },
            'multimodal': {
                url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
                model: 'doubao-seedance-2-0-fast-260128'
            }
        },
        generate_audio:             true,
        advancedParams: [
            { key: 'duration', label: '生成时长', type: 'slider', default: 4, min: 4, max: 15, unit: 's' }
        ]
    }
];
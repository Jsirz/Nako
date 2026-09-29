export const TEXT_MODELS = [
{ catalogOrder: 5,
        name:                       'DeepSeek-V4-Flash',
        description:                '极速文本推理与深度思考，不支持图片或视频输入',
        timeEstimate:               '1min',
        provider:                   'DeepSeekProvider',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text'],
        supportedImageFormats:      [],
        maxImageSizeMb:             0,
        maxResolution:              '',
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0.02,
        languageModes: [
            { label: '文本对话', value: 'multimodal-chat', allowedInputs: { 'text': 10 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://api.deepseek.com/chat/completions',
                model: 'deepseek-v4-flash'
            }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'high', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最高', value: 'max' }
                ]
            }]
    },
{ catalogOrder: 6,
        name:                       'DeepSeek-V4-Pro',
        description:                '高性能文本推理与深度思考，不支持图片或视频输入',
        timeEstimate:               '1min',
        provider:                   'DeepSeekProvider',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text'],
        supportedImageFormats:      [],
        maxImageSizeMb:             0,
        maxResolution:              '',
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0.025,
        languageModes: [
            { label: '文本对话', value: 'multimodal-chat', allowedInputs: { 'text': 10 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://api.deepseek.com/chat/completions',
                model: 'deepseek-v4-pro'
            }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'high', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最高', value: 'max' }
                ]
            }]
    },
{ catalogOrder: 7,
        name:                       'DeepSeek-V4.1-Flash',
        description:                'DeepSeek V4.1 Flash 文本推理与深度思考，不支持图片或视频输入。',
        timeEstimate:               '1min',
        provider:                   'DeepSeekProvider',
        source:                     'official',
        canonicalModel:             'DeepSeek-V4.1-Flash',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text'],
        supportedImageFormats:      [],
        maxImageSizeMb:             0,
        maxResolution:              '',
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0,
        priceTextByMode: {
            'multimodal-chat': { 'default': '按官方 Token 账单结算' }
        },
        languageModes: [
            { label: '文本对话', value: 'multimodal-chat', allowedInputs: { 'text': 10 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://api.deepseek.com/chat/completions',
                model: 'deepseek-flash'
            }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'high', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最高', value: 'max' }
                ]
            }
        ]
    },
{ catalogOrder: 8,
        name:                       'DeepSeek-V4-Flash-Vision-Exp',
        description:                'DeepSeek 官方实验性视觉理解模型；支持图片、截图与图表分析，不生成图片。',
        timeEstimate:               '1min',
        provider:                   'DeepSeekProvider',
        source:                     'official',
        canonicalModel:             'DeepSeek-V4-Flash-Vision-Exp',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'gif', 'webp'],
        maxImageSizeMb:             32,
        maxResolution:              '8192*8192',
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0,
        priceTextByMode: {
            'multimodal-chat': { 'default': '按官方峰/谷 Token 账单结算（图片折算为输入 Token）' }
        },
        languageModes: [
            { label: '视觉理解', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'multimodal-chat': {
                url: 'https://api.deepseek.com/chat/completions',
                model: 'deepseek-v4-flash-vision-exp'
            }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'high', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最高', value: 'max' }
                ]
            },
            {
                key: 'detail', label: '图片细节', type: 'select', default: 'auto', options: [
                    { label: '自动', value: 'auto' },
                    { label: '原图', value: 'original' },
                    { label: '低（更快）', value: 'low' }
                ]
            }
        ]
    }
];
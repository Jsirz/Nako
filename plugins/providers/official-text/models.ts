export const TEXT_MODELS = [
{ catalogOrder: 9,
        name:                       'GLM 5.3',
        description:                '智谱 GLM 5.3 官方直连；支持低、高、最大三档思考强度。',
        timeEstimate:               '2min',
        provider:                   'GlmTextProvider',
        source:                     'official',
        canonicalModel:             'GLM 5.3',
        brand:                      'GLM',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text'],
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
            'multimodal-chat': { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-5.3' }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'max', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最大', value: 'max' }
                ]
            }
        ]
    },
{ catalogOrder: 10,
        name:                       'GLM 5.3 Flash',
        description:                '智谱 GLM 5.3 Flash 官方直连；低延迟、高性价比。',
        timeEstimate:               '1min',
        provider:                   'GlmTextProvider',
        source:                     'official',
        canonicalModel:             'GLM 5.3 Flash',
        brand:                      'GLM',
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
            'multimodal-chat': { 'default': '按官方 Token 账单结算' }
        },
        languageModes: [
            { label: '多模态对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 10 } }
        ],
        endpoint: {
            'multimodal-chat': { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-5.3-flash' }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'max', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最大', value: 'max' }
                ]
            }
        ]
    },
{ catalogOrder: 11,
        name:                       'Kimi K3',
        description:                'Kimi 官方直连；按官方输入与输出 Token 账单结算。',
        timeEstimate:               '2min',
        provider:                   'KimiTextProvider',
        source:                     'official',
        canonicalModel:             'Kimi K3',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0,
        priceTextByMode: {
            'multimodal-chat': { 'default': '按官方 Token 账单结算' }
        },
        languageModes: [
            { label: '图文对话', value: 'multimodal-chat', allowedInputs: { 'text': 10, 'image': 9 } }
        ],
        endpoint: {
            'multimodal-chat': { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'kimi-k3' }
        },
        advancedParams: [
            {
                key: 'reasoning_effort', label: '思考强度', type: 'select', default: 'max', options: [
                    { label: '低', value: 'low' },
                    { label: '高', value: 'high' },
                    { label: '最高', value: 'max' }
                ]
            }
        ]
    }
];
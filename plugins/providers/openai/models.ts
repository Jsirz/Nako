export const IMAGE_MODELS = [
{ catalogOrder: 24,
        name:                       'GPT Image 2',
        canonicalModel:             'GPT Image 2',
        description:                'GPT 强力图像生成模型',
        timeEstimate:               '2min',
        provider:                   'GptImageProvider',
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png', 'webp'],
        maxImageSizeMb:             10,
        maxResolution:              '4096*4096',
        resolutions:                ["1K", "2K", "4K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3", "5:4", "4:5", "21:9", "2:1"],
        cost: {
            "1K": 0.20,
            "2K": 0.30,
            "4K": 0.75
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 10 } },
            { label: '遮罩修图', value: 'image-inpainting', allowedInputs: { 'text': 10, 'image': 2 } }
        ],
        endpoint: {
            'text-to-image': {
                url: 'https://api.openai.com/v1/images/generations',
                model: 'gpt-image-2'
            },
            'image-to-image': {
                url: 'https://api.openai.com/v1/images/edits',
                model: 'gpt-image-2'
            },
            'image-inpainting': {
                url: 'https://api.openai.com/v1/images/edits',
                model: 'gpt-image-2'
            }
        },
        advancedParams: [
            {
                key: 'quality', label: '生成质量', type: 'select', default: 'auto', options: [
                    { label: '自动', value: 'auto' },
                    { label: '低', value: 'low' },
                    { label: '中', value: 'medium' },
                    { label: '高', value: 'high' }
                ]
            },
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 4 }
        ]
    }
];
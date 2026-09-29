export const IMAGE_MODELS = [
{ catalogOrder: 19,
        name:                       '即梦图片3.0',
        description:                '影视质感,文字更准',
        timeEstimate:               '1min',
        provider:                   'JimengImageProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image'],
        supportedImageFormats:      ['jpeg', 'png'],
        maxImageSizeMb:             4.7,
        maxResolution:              '4096*4096',
        resolutions:                ["1K", "2K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
        cost: {
            "512": 0.2,
            "1K": 0.2,
            "2K": 0.2,
            "4K": 0.2
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } },
            { label: '图生图', value: 'image-to-image', allowedInputs: { 'text': 10, 'image': 1 } }
        ],
        endpoint: {
            'text-to-image': {
                url: 'https://visual.volcengineapi.com/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31',
                model: 'jimeng_t2i_v30'
            },
            'image-to-image': {
                url: 'https://visual.volcengineapi.com/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31',
                model: 'jimeng_i2i_v30'
            }
        },
        advancedParams: [
            { key: 'use_pre_llm', label: '提示词优化', type: 'toggle', default: true },
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    },
{ catalogOrder: 20,
        name:                       '即梦图片3.1',
        description:                '丰富的美学多样性,画面鲜明生动',
        timeEstimate:               '1min',
        provider:                   'JimengImageProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text'],
        supportedImageFormats:      [],
        maxImageSizeMb:             0,
        maxResolution:              '',
        resolutions:                ["1K", "2K"],
        aspectRatios:               ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
        cost: {
            "512": 0.2,
            "1K": 0.2,
            "2K": 0.2,
            "4K": 0.2
        },
        imageModes: [
            { label: '文生图', value: 'text-to-image', allowedInputs: { 'text': 10 } }
        ],
        endpoint: {
            'text-to-image': {
                url: 'https://visual.volcengineapi.com/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31',
                model: 'jimeng_t2i_v31'
            }
        },
        advancedParams: [
            { key: 'use_pre_llm', label: '提示词优化', type: 'toggle', default: true },
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    }
];
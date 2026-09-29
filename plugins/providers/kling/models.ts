export const VIDEO_MODELS = [
{ catalogOrder: 106,
        name:                       '可灵 Kling-V3',
        canonicalModel:             'Kling V3.0',
        description:                '快手旗舰级视频生成模型 V3',
        timeEstimate:               '5min',
        provider:                   'KlingVideoProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        cost: {
            '720p': 0.8,
            '1080p': 1.2
        },
        resolutions:                ['720p'],
        aspectRatios:               ["1:1", "9:16", "16:9"],
        videoModes: [
            { label: '文生视频', value: 'text-to-video', allowedInputs: { 'text': 10 } },
            { label: '首尾帧', value: 'i2v-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '动作控制', value: 'motion-control', allowedInputs: { 'text': 10, 'image': 1, 'video': 1 } },
        ],
        endpoint: {
            'text-to-video': {
                url: 'https://api-beijing.klingai.com/v1/videos/text2video',
                model: 'kling-v3'
            },
            'i2v-first-last-frame': {
                url: 'https://api-beijing.klingai.com/v1/videos/image2video',
                model: 'kling-v3'
            },
            'motion-control': {
                url: 'https://api-beijing.klingai.com/v1/videos/motion-control',
                model: 'kling-v3'
            }
        },
        generate_audio:             true,
        advancedParams: [
            {
                key: 'mode', label: '模式', type: 'select', default: 'std', options: [
                    { label: '标准', value: 'std' },
                    { label: '高级', value: 'pro' },
                    { label: '4K', value: '4k' }
                ]
            },
            {
                key: 'character_orientation', label: '动作朝向', type: 'select', default: 'video', options: [
                    { label: '按图片角色', value: 'image' },
                    { label: '按视频角色', value: 'video' }
                ]
            },
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 15, unit: 's' }
        ]
    },
{ catalogOrder: 107,
        name:                       '可灵 Kling-V3-Omni',
        canonicalModel:             'Kling O3',
        description:                '快手旗舰级全模态视频生成模型',
        timeEstimate:               '5min',
        provider:                   'KlingVideoProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'image', 'video'],
        cost: {
            '720p': 0.8,
            '1080p': 1.2
        },
        resolutions:                ['720p'],
        aspectRatios:               ["1:1", "9:16", "16:9"],
        videoModes: [
            { label: '文生视频', value: 'omni-text-to-video', allowedInputs: { 'text': 10 } },
            { label: '图生视频', value: 'omni-image-to-video', allowedInputs: { 'text': 10, 'image': 4 } },
            { label: '首尾帧', value: 'omni-first-last-frame', allowedInputs: { 'text': 10, 'image': 2 } },
            { label: '视频编辑', value: 'omni-video-edit', allowedInputs: { 'text': 10, 'image': 4, 'video': 1 } },
            { label: '视频参考', value: 'omni-video-ref', allowedInputs: { 'text': 10, 'image': 4, 'video': 1 } },
        ],
        endpoint: {
            'omni-text-to-video': {
                url: 'https://api-beijing.klingai.com/v1/videos/omni-video',
                model: 'kling-v3-omni'
            },
            'omni-image-to-video': {
                url: 'https://api-beijing.klingai.com/v1/videos/omni-video',
                model: 'kling-v3-omni'
            },
            'omni-first-last-frame': {
                url: 'https://api-beijing.klingai.com/v1/videos/omni-video',
                model: 'kling-v3-omni'
            },
            'omni-video-edit': {
                url: 'https://api-beijing.klingai.com/v1/videos/omni-video',
                model: 'kling-v3-omni'
            },
            'omni-video-ref': {
                url: 'https://api-beijing.klingai.com/v1/videos/omni-video',
                model: 'kling-v3-omni'
            }
        },
        generate_audio:             true,
        advancedParams: [
            {
                key: 'mode', label: '模式', type: 'select', default: 'std', options: [
                    { label: '标准', value: 'std' },
                    { label: '高级', value: 'pro' },
                    { label: '4K', value: '4k' }
                ]
            },
            { key: 'duration', label: '生成时长', type: 'slider', default: 5, min: 3, max: 10, unit: 's' }
        ]
    }
];
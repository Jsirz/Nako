export const AUDIO_MODELS = [
{ catalogOrder: 58,
        name:                       'Mureka 音乐',
        description:                '支持音乐与音效生成',
        timeEstimate:               '5min',
        provider:                   'MurekaAudioProvider',
        selectable:                 false,
        maxConcurrent:              0,
        useProxy:                   false,
        maxInputs:                  10,
        supportedReferenceTypes:    ['text', 'audio'],
        supportedAudioFormats:      ['mp3', 'm4a'],
        maxAudioDurationSec:        30,
        resolutions:                [],
        aspectRatios:               [],
        cost:                       0.2,
        audioModes: [
            { label: '歌词音乐', value: 'lyrics-to-music', allowedInputs: { 'text': 10 } },
            { label: '背景音乐', value: 'instrumental', allowedInputs: { 'text': 10 } }
        ],
        endpoint: {
            'lyrics-to-music': {
                url: 'https://api.mureka.cn/v1/song/generate',
                model: 'auto'
            },
            'instrumental': {
                url: 'https://api.mureka.cn/v1/instrumental/generate',
                model: 'auto'
            }
        },
        advancedParams: [
            { key: 'generateCount', label: '生成数量', type: 'slider', default: 1, min: 1, max: 1 }
        ]
    }
];
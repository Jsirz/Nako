export const analysis = () => ({ version: 1, summary: '两个镜头', audioStatus: 'analyzed', shots: [
  { id: 's1', start: 0, end: 2, keyframes: [1], description: '人物走进房间', framing: '全景', camera: '固定', motion: '向前走', dialogue: '你好', music: '钢琴', soundEffects: '脚步' },
  { id: 's2', start: 2, end: 4, keyframes: [3], description: '窗外风景', framing: '近景', camera: '平移', motion: '树叶摇动', dialogue: '', music: '钢琴', soundEffects: '风声' },
] });
export const source = () => ({ url: '/library/media/p/videos/input.mp4', type: 'video', duration: 4, width: 1280, height: 720, fps: 25, hasAudio: true, fingerprint: 'source-hash' });
export const extracted = () => ({ id: 'result1', source: source(), choices: { storyboard: true, motion: true, sound: true }, analysis: analysis(),
  shots: analysis().shots.map(shot => ({ ...shot, frames: [{ assetId: 'frame-' + shot.id, type: 'image', url: `/library/media/p/images/${shot.id}.png`, projectId: 'p', time: shot.keyframes[0] }],
    clip: { assetId: 'clip-' + shot.id, type: 'video', url: `/library/media/p/videos/${shot.id}.mp4`, projectId: 'p' },
    audio: { assetId: 'audio-' + shot.id, type: 'audio', url: `/library/media/p/audios/${shot.id}.mp3`, projectId: 'p' } })) });

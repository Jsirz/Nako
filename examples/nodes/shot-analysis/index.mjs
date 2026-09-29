// No provider imports, keys, URLs or filesystem code: business logic only.
async function analyze({ inputs, parameters }, context) {
  context.progress('提取视频关键帧');
  const media = await context.call('media.inspect', typeof inputs.video === 'string' ? { url: inputs.video, type: 'video' } : inputs.video, 'inspect');
  context.progress('分析镜头');
  const result = await context.call('models.generate', {
    kind: 'text', model: parameters.textModel, prompt: parameters.prompt,
    references: media.frames, options: { languageMode: 'multimodal-chat' },
  }, 'analyze');
  return { analysis: result.text, frames: media.frames };
}
export const executors = {
  analyze,
  async recreate(input, context) {
    const analysis = await analyze(input, context);
    context.progress('生成参考图');
    const image = await context.call('models.generate', { kind: 'image', model: input.parameters.imageModel,
      prompt: analysis.analysis, options: { imageMode: 'text-to-image' } }, 'image');
    context.progress('生成视频');
    const video = await context.call('models.generate', { kind: 'video', model: input.parameters.videoModel,
      prompt: analysis.analysis, references: [image], options: { videoMode: 'image-to-video' } }, 'video');
    return { analysis: analysis.analysis, image, video };
  },
};

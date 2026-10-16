export async function shotAnalysis({ inputs, parameters }, context) {
  const video = inputs.video || parameters.video;
  const reuse = Boolean(parameters.reuseRunId);
  const choices = { storyboard: parameters.storyboard !== false, motion: parameters.motion !== false, sound: parameters.sound !== false };
  context.progress('正在准备分析视频');
  const prepared = await context.call('media.prepareAnalysis', { video, choices, includeProxy: !reuse }, 'prepare-video');
  let value;
  if (reuse) {
    context.progress('正在读取已缓存的分析，不调用模型');
    const key = 'shot.' + parameters.reuseRunId;
    const saved = await context.call('storage.get', { key }, 'read-analysis');
    if (saved?.source?.fingerprint === prepared.source.fingerprint && saved?.source?.url === prepared.source.url && saved?.nodeId === context.nodeId) {
      const shots = [];
      for (let i = 0; i < saved.count; i++) shots.push(await context.call('storage.get', { key: key + '.' + i }, 'read-shot-' + i));
      value = parameters.analysis || { ...saved.analysis, shots };
    }
  } else {
    context.progress('正在分析分镜、动态与声音');
    const response = await context.call('models.generate', { kind: 'text', model: 'Qwen 3.8 Max · Work-Fisher',
      prompt: prepared.prompt, references: [prepared.video], options: { languageMode: 'multimodal-chat', maxTokens: 32768 } }, 'analyze-video');
    value = response.text;
  }
  context.progress('正在校验分镜时间');
  const analysis = await context.call('media.validateAnalysis', { analysis: value, duration: prepared.source.duration, hasAudio: prepared.source.hasAudio }, 'validate-analysis');
  // Persist each shot separately to stay below the host's 64 KiB storage limit.
  const key = 'shot.' + context.runId;
  for (let i = 0; i < analysis.shots.length; i++) await context.call('storage.set', { key: key + '.' + i, value: analysis.shots[i] }, 'save-shot-' + i);
  await context.call('storage.set', { key, value: { nodeId: context.nodeId, source: prepared.source, count: analysis.shots.length,
    analysis: { version: analysis.version, summary: analysis.summary, audioStatus: analysis.audioStatus } } }, 'save-analysis');
  context.progress('正在从原视频提取画面、动态与原声');
  const result = await context.call('media.extractAnalysis', { video, choices, analysis, fingerprint: prepared.source.fingerprint }, 'extract-shots');
  context.progress('拉片完成');
  return { analysis: result };
}

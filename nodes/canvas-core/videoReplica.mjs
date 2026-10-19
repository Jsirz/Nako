export async function videoReplica({ inputs, parameters }, context) {
  const video = inputs.video || parameters.video, reuse = Boolean(parameters.reuseRunId);
  const choices = { storyboard: true, motion: true, sound: true };
  context.progress('正在准备复刻视频');
  const prepared = await context.call('media.prepareAnalysis', { video, choices, purpose: 'video-replica', includeProxy: !reuse }, 'prepare-video');
  let value;
  if (reuse) {
    context.progress('正在读取已保存的分镜与资产');
    const key = 'replica.' + parameters.reuseRunId;
    const saved = await context.call('storage.get', { key }, 'read-analysis');
    if (saved?.source?.fingerprint === prepared.source.fingerprint && saved?.source?.url === prepared.source.url && saved?.nodeId === context.nodeId) {
      const shots = [], assets = [];
      for (let i = 0; i < saved.count; i++) shots.push(await context.call('storage.get', { key: key + '.shot.' + i }, 'read-shot-' + i));
      for (let i = 0; i < saved.assetCount; i++) assets.push(await context.call('storage.get', { key: key + '.asset.' + i }, 'read-asset-' + i));
      value = parameters.analysis || { ...saved.analysis, shots, assets };
    }
  } else {
    context.progress('正在分析视频分镜、角色、场景与元素');
    const response = await context.call('models.generate', { kind: 'text', model: 'Qwen 3.8 Max · Work-Fisher',
      prompt: prepared.prompt, references: [prepared.video], options: { languageMode: 'multimodal-chat', maxTokens: 32768 } }, 'analyze-replica');
    value = response.text;
  }
  const { assets, ...analysis } = await context.call('media.validateReplica', {
    analysis: value, duration: prepared.source.duration, hasAudio: prepared.source.hasAudio,
  }, 'validate-replica');
  const key = 'replica.' + context.runId;
  for (let i = 0; i < analysis.shots.length; i++) await context.call('storage.set', { key: key + '.shot.' + i, value: analysis.shots[i] }, 'save-shot-' + i);
  for (let i = 0; i < assets.length; i++) await context.call('storage.set', { key: key + '.asset.' + i, value: assets[i] }, 'save-asset-' + i);
  await context.call('storage.set', { key, value: { nodeId: context.nodeId, source: prepared.source, count: analysis.shots.length, assetCount: assets.length,
    analysis: { version: analysis.version, summary: analysis.summary, audioStatus: analysis.audioStatus } } }, 'save-analysis');
  context.progress('正在提取分镜画面与参考片段');
  const result = await context.call('media.extractAnalysis', { video, choices, analysis, fingerprint: prepared.source.fingerprint }, 'extract-replica');
  context.progress('分镜与资产分析完成，请设置替换资产');
  return { analysis: { ...result, assets } };
}

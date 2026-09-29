/** Only built-in single-step generation has a known output mapping. Never rerun package code. */
export function createNodeGenerationRecovery(generation) {
  return async ({ run, steps }) => {
    if (run.nodes?.length !== 1 || steps.length !== 1) return null;
    const node = run.nodes[0], step = steps[0];
    if (node.pluginId !== 'nako.canvas-core' || !['image', 'video', 'audio', 'text'].includes(node.type) ||
        step.key !== `${node.id}:generate` || step.capability !== 'models.generate') return null;
    const task = await generation.observeNode({ projectId: run.projectId, runId: run.id, stepId: step.key });
    if (!task || task.type !== node.type) return null;
    if (task.status === 'success') {
      const urls = task.resultUrls?.length ? task.resultUrls : [task.resultUrl].filter(Boolean);
      if (node.type !== 'text' && !urls.length) return null;
      const value = node.type === 'text' ? { text: String(task.text ?? '') }
        : { type: node.type, url: urls[0], urls };
      return { status: 'success', results: { [node.id]: { [node.type]: node.type === 'text' ? value.text : value } },
        steps: { [step.key]: value } };
    }
    if (['loading', 'queued', 'unknown'].includes(task.status))
      return { status: 'pending', error: task.error || '正在核对原生成任务，请勿重复生成。' };
    return { status: 'error', code: task.code, error: task.error || '原生成任务未完成' };
  };
}

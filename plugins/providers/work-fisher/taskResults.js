import { download } from './media.js';
import { failure } from './client.js';
export function taskState(kind, profile, payload) {
  if (kind === 'video')
    return { ids: [payload.id], status: payload.status, urls: [payload.metadata?.url] };
  const task = payload.data || payload;
  const ids = [
    payload.task_id,
    task.task_id,
    ...(profile === 'music' || profile === 'midjourney' ? [task.id] : []),
  ].filter((value) => value != null);
  let urls = [];
  if (profile === 'music') {
    const result = task.result || {};
    urls = [
      ...(Array.isArray(result.music) ? result.music : []),
      ...(Array.isArray(result.stems) ? result.stems : []),
    ].map((item) => item.audio_url || item.url);
    if (!urls.length)
      urls = Array.isArray(result.audio_urls) ? result.audio_urls : [result.audio_url];
  } else if (profile === 'midjourney')
    urls = Array.isArray(task.image_urls)
      ? task.image_urls
      : [task.grid_image_url || task.image_url || task.result_url];
  else {
    const content = task.data?.content || {};
    urls = Array.isArray(content[kind + '_urls'])
      ? content[kind + '_urls']
      : [content[kind + '_url'] || task.result_url];
  }
  return { ids, status: task.status, urls };
}
export async function readTaskResults({ kind, ctx, taskId, client, fetcher, signal, params }) {
  const payload = await client(ctx.queryUrl + encodeURIComponent(taskId), {
    apiKey: ctx.apiKey,
    signal,
    task: true,
  });
  const current = taskState(kind, ctx.profileId, payload);
  if (!current.ids.length || current.ids.some((id) => String(id) !== taskId))
    return { status: 'unknown', reason: 'task_mismatch' };
  const status = String(current.status || '').toLowerCase();
  if (
    [
      'queued',
      'in_progress',
      'submitted',
      'not_start',
      'running',
      'pending',
      'processing',
    ].includes(status)
  )
    return { status: 'pending' };
  if (['failed', 'failure', 'cancelled', 'canceled', 'expired', 'error'].includes(status))
    return {
      status: 'failed',
      error: failure(
        /adaptive/i.test(JSON.stringify(payload.error || payload.metadata?.error || '')) &&
          /duration/i.test(JSON.stringify(payload.error || payload.metadata?.error || ''))
          ? '模型将本次请求识别为视频编辑。请选择“视频编辑”模式，跟随原视频比例和时长，并使用 4～30 秒的参考视频。'
          : 'Work-Fisher 已确认原任务失败或取消。',
        { providerTaskFailed: true },
      ),
    };
  const urls = [...new Set(current.urls.filter((url) => typeof url === 'string' && url))];
  if (!['completed', 'success', 'succeeded'].includes(status) || !urls.length || urls.length > 100)
    return { status: 'unknown' };
  const results = [];
  for (const url of urls)
    results.push({ ...(await download(fetcher, url, kind, signal, params)), url });
  return { status: 'success', results };
}

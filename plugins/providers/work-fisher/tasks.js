import { setTimeout as delay } from 'node:timers/promises';
import {
  matchesRemoteTask,
  remoteTaskReference,
} from '../../../modules/generation-core/api/server/generation/generationTaskRecovery.js';
import { failure } from './client.js';
import { connection as resolveConnection } from './connection.js';
import { readTaskResults } from './taskResults.js';
export async function queryTask({ kind, reference, params, config, client, fetcher, signal }) {
  const ctx = resolveConnection(kind, params, config);
  if (!matchesRemoteTask(reference, ctx)) return { status: 'unknown', reason: 'settings_changed' };
  const result = await readTaskResults({
    kind,
    ctx,
    taskId: reference.taskId,
    client,
    fetcher,
    signal,
    params,
  });
  return matchesRemoteTask(reference, resolveConnection(kind, params, config))
    ? result
    : { status: 'unknown' };
}
async function recoverImages(task, params, config, client, fetcher, signal) {
  const references = task.remoteTasks || [];
  if (
    !Number.isInteger(task.requestedCount) ||
    task.requestedCount < 1 ||
    task.requestedCount > 10 ||
    !references.length ||
    references.length !== task.remoteSubmissionCount ||
    references.some((ref) => !matchesRemoteTask(ref, resolveConnection('image', params, config)))
  )
    return { status: 'unknown' };
  const results = [],
    urls = new Set();
  let failureError;
  for (const reference of references) {
    const result = await queryTask({
      kind: 'image',
      reference,
      params,
      config,
      client,
      fetcher,
      signal,
    });
    if (result.status === 'failed') {
      failureError = result.error;
      continue;
    }
    if (result.status !== 'success') return result;
    for (const item of result.results)
      if (!urls.has(item.url)) {
        urls.add(item.url);
        results.push(item);
      }
  }
  if (!results.length)
    return failureError ? { status: 'failed', error: failureError } : { status: 'unknown' };
  return {
    status: results.length >= task.requestedCount ? 'success' : 'partial',
    results: results
      .slice(0, task.requestedCount)
      .map(({ buffer, format }) => ({ buffer, format })),
  };
}
export function recoveryMethods(kind, client, fetcher) {
  const suffix = kind[0].toUpperCase() + kind.slice(1);
  return {
    ['canRecover' + suffix](reference, params, config) {
      try {
        return Boolean(matchesRemoteTask(reference, resolveConnection(kind, params, config)));
      } catch {
        return false;
      }
    },
    async ['recover' + suffix](reference, params, config, signal) {
      if (kind === 'image')
        return recoverImages(reference, params, config, client, fetcher, signal);
      const result = await queryTask({ kind, reference, params, config, signal, client, fetcher });
      return result.status === 'success'
        ? { status: 'success', buffer: result.results[0].buffer, format: result.results[0].format }
        : result;
    },
  };
}
export async function runTask({
  kind,
  body,
  params,
  config,
  connection,
  client,
  fetcher,
  wait = delay,
  now = Date.now,
  slot = 0,
}) {
  params.signal?.throwIfAborted();
  config.generationTaskSubmitting?.(slot);
  let taskId, created;
  try {
    created = await client(connection.submitUrl, {
      apiKey: connection.apiKey,
      body,
      signal: params.signal,
    });
    taskId = String(created.task_id || created.data?.[0]?.task_id || created.id || '').trim();
  } catch (error) {
    taskId = String(error.publicTaskId || '');
    if (!taskId || !error.submissionUncertain) throw error;
  }
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(taskId))
    throw Object.assign(failure('Work-Fisher 未返回有效任务 ID。'), { submissionUncertain: true });
  const reference = remoteTaskReference({ ...connection, taskId });
  config.generationTaskSubmitted?.(reference, slot);
  const deadline = now() + 1800000;
  while (now() < deadline) {
    await wait(5000, undefined, { signal: params.signal });
    let result;
    try {
      result =
        kind === 'audio'
          ? await readTaskResults({
              kind,
              ctx: connection,
              taskId,
              client,
              fetcher,
              signal: params.signal,
              params,
            })
          : await queryTask({
              kind,
              reference,
              params,
              config,
              client,
              fetcher,
              signal: params.signal,
            });
    } catch (error) {
      if (!params.signal?.aborted && error.retryable) continue;
      throw error;
    }
    if (result.status === 'pending') continue;
    if (result.status === 'failed') throw result.error;
    if (result.status === 'success') return result.results;
    throw failure('Work-Fisher 返回了未知任务状态，请保留任务 ID。');
  }
  throw failure('等待 Work-Fisher 结果超时，可稍后查询原任务。', {
    code: 'WORK_FISHER_TIMEOUT',
    status: 504,
  });
}

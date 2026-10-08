import { BaseProvider } from '../../../modules/generation-providers/api/server/providers/baseProvider.js';
import { providerErrorsFor } from '../../../modules/contracts/providerErrors.js';
import { publicMediaUrl } from './media.js';
import { upstreamError } from './settings.js';
const { downloadError, wrapError } = providerErrorsFor('ecloud');

// The transport is injected once; model handlers only build protocol-specific bodies.
export function createEcloudTransport(fetcher) {
  async function request(url, {
    apiKey, body, signal, async = false, useProxy = false, taskResponse = false, queryModel,
  }) {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(body ? 300_000 : 30_000);
    const options = {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(async ? { 'X-DashScope-Async': 'enable' } : {}),
        ...(queryModel ? { 'X-Model-Name': queryModel } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    BaseProvider.injectProxy(options, useProxy);
    let response;
    try {
      response = await fetcher(url, options);
    } catch (error) {
      const failure = wrapError(error, body ? 'submit' : 'poll');
      if (body) failure.submissionUncertain = true;
      throw failure;
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw Object.assign(upstreamError(response.status), {
        submissionUncertain: Boolean(body) && (response.ok || response.status >= 500),
      });
    }
    const terminalTask = taskResponse && payload?.id
      && ['failed', 'cancelled', 'expired'].includes(payload.status);
    if (!response.ok || payload?.code || (payload?.error && !terminalTask)
      || Number(payload?.status_code) >= 400) {
      const error = upstreamError(!response.ok ? response.status : Number(payload?.status_code) || 502, payload);
      if (body && response.status >= 500) error.submissionUncertain = true;
      throw wrapError(error, body ? 'submit' : 'poll');
    }
    return payload;
  }

  async function download(url, format, params) {
    const target = publicMediaUrl(url);
    const timeout = AbortSignal.timeout(120_000);
    const options = {
      signal: params.signal ? AbortSignal.any([params.signal, timeout]) : timeout,
      redirect: 'error',
    };
    BaseProvider.injectProxy(options, params.useProxy);
    const response = await fetcher(target, options); // Never send the model credential to a media host.
    if (!response.ok) throw downloadError(`移动云结果下载失败（HTTP ${response.status}），请保留原任务。`, {
      status: response.status, upstreamStatus: response.status,
    });
    const max = (format === 'mp4' ? 512 : 100) * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > max) {
      await response.body?.cancel();
      throw downloadError('移动云结果超过本机下载大小限制。');
    }
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > max) throw downloadError('移动云结果超过本机下载大小限制。');
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const valid = format === 'png'
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : format === 'wav'
        ? buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE'
        : buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
    if (!valid) throw downloadError('移动云结果不是预期的媒体文件，未保存无效内容。');
    return { buffer, format };
  }
  return { request, download };
}

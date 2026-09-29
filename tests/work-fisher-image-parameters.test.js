import { expect, it, vi } from 'vitest';
import { createWorkFisherHandlers } from '../plugins/providers/work-fisher/implementation.js';
import { imageBody } from '../plugins/providers/work-fisher/requests.js';
import { connection } from '../plugins/providers/work-fisher/connection.js';
import { createClient } from '../plugins/providers/work-fisher/client.js';
import { classifyGenerationError } from '../modules/generation-core/server/generation/generationErrors.js';

const config = { WORK_FISHER_API_KEY: 'fixture-only' };
const params = variant => ({ imageModel: 'workfisher-image-g-v2.5-' + variant,
  imageMode: 'text-to-image', url: 'https://api.work-fisher.com/v1/image/generations',
  prompt: 'fixture', resolution: '1K', aspectRatio: '1:1' });
const media = { images: [], videos: [], audios: [] };
const requestBody = input => imageBody(input, connection('image', input, config), media);

it.each(['flare', 'sunburst'])('%s default PNG submits without the JPEG/WebP-only option and completes', async variant => {
  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const fetcher = vi.fn(async (url, options) => {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      // Strict upstream fixture reproduces the documented PNG parameter rejection.
      if (body.output_format === 'png' && 'output_compression' in body)
        return Response.json({ error: { message: 'output_compression is not supported for png' } }, { status: 400 });
      return Response.json({ task_id: 'task-png' });
    }
    if (url.endsWith('/task-png')) return Response.json({ data: { task_id: 'task-png', status: 'SUCCESS',
      data: { content: { image_url: 'https://media.example.test/result.png' } } } });
    return new Response(image);
  });
  const result = await createWorkFisherHandlers({ fetcher, wait: async () => {} }).WorkFisherImageProvider
    .generateImage(params(variant), config);
  expect(result).toEqual({ buffer: image, format: 'png' });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('output_compression');
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});

it.each(['jpeg', 'webp'])('keeps integer compression for %s, including zero', output_format => {
  for (const output_compression of [0, 80, 100]) expect(requestBody({ ...params('sunburst'),
    output_format, output_compression })).toMatchObject({ output_format, output_compression });
  expect(() => requestBody({ ...params('sunburst'), output_format, output_compression: 50.5 })).toThrow(/整数/);
});

it('omits stale compression after switching back to PNG and keeps lowprice options separate', () => {
  expect(requestBody({ ...params('sunburst'), output_format: 'png', output_compression: 80 })).not.toHaveProperty('output_compression');
  expect(requestBody(params('lowprice'))).not.toHaveProperty('output_compression');
  expect(requestBody(params('lowprice'))).not.toHaveProperty('output_format');
  expect(() => requestBody({ ...params('sunburst'), output_format: 'jpeg', background: 'transparent' })).toThrow(/透明/);
});

it.each([400, 401, 402, 422, 429, 503])('preserves HTTP %i and a safe message instead of a generic network error', async status => {
  const fetcher = vi.fn(async () => Response.json({ error: { message: 'private prompt or credential' } },
    { status, headers: { 'x-request-id': 'request-fixture' } }));
  const error = await createClient(fetcher)('https://api.work-fisher.com/v1/image/generations',
    { apiKey: 'fixture', body: {} }).catch(error => error);
  expect(error.upstreamStatus).toBe(status);
  expect(error.diagnostics).toMatchObject({ stage: 'submit', httpStatus: status, upstreamRequestId: 'request-fixture' });
  const classified = classifyGenerationError(error);
  expect(classified).toMatchObject({ code: 'WORK_FISHER_REQUEST_FAILED', status });
  expect(classified.message).toContain('HTTP ' + status);
  expect(classified.message).not.toContain('private prompt');
  expect(error.submissionUncertain).toBe(status >= 500);
  expect(fetcher).toHaveBeenCalledOnce();
});

import { it, expect, vi } from 'vitest';
import { useServerCapabilities } from './helpers/serverCapabilities.js';
useServerCapabilities();
import { createEcloudHandlers } from '../plugins/providers/ecloud/implementation.js';
import { seedanceRequest } from '../plugins/providers/ecloud/seedance.js';
import {
  ECLOUD_SEEDANCE as protocol,
  ECLOUD_ENDPOINTS,
} from '../plugins/providers/ecloud/protocol.js';
import { remoteTaskReference } from '../modules/generation-core/server/generation/generationTaskRecovery.js';
import { classifyGenerationError } from '../modules/generation-core/server/generation/generationErrors.js';
import { loadModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import {
  buildVideoRequest,
  effectiveVideoMode,
  externalReferenceMedia,
} from '../modules/generation-core/ui/generation/canvasGenerationRequests';
import { isVideoGenerationModeAllowed } from '../modules/generation-core/ui/generation/videoMode';

const config = { ECLOUD_API_KEY: 'fixture-seedance-key' };
const base = {
  videoModel: protocol.model,
  prompt: '一只猫在草地奔跑',
  url: protocol.endpoint,
  resolution: '1080p',
  aspectRatio: '16:9',
  duration: 8,
};
const png = 'https://media.example.test/input.png',
  video = 'https://media.example.test/in.mp4',
  audio = 'https://media.example.test/in.wav';
const mp4 = Buffer.from([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115, 111, 109,
]);
const json = (value, status = 200) => Response.json(value, { status });
const receipt = () =>
  remoteTaskReference({
    taskId: 'cgt-saved',
    providerName: 'EcloudVideoProvider',
    modelId: protocol.model,
    submitUrl: protocol.endpoint,
    queryUrl: protocol.endpoint + '/',
    apiKey: config.ECLOUD_API_KEY,
  });

it.each(protocol.modes)(
  'submits Seedance %s to the documented REST gateway and saves the result',
  async (mode) => {
    const inputs =
      mode === 'text-to-video'
        ? {}
        : mode === 'first-frame'
          ? { images: [png] }
          : mode === 'i2v-first-last-frame'
            ? { images: [png, 'asset://asset-last'] }
            : { images: [png], videos: [video], audios: [audio] };
    const saved = vi.fn(),
      submitting = vi.fn(),
      wait = vi.fn(async () => {});
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ id: 'cgt-test', model: protocol.resolvedModel }))
      .mockResolvedValueOnce(json({ id: 'cgt-test', status: 'queued' }))
      .mockResolvedValueOnce(json({ id: 'cgt-test', status: 'running' }))
      .mockResolvedValueOnce(
        json({
          id: 'cgt-test',
          model: protocol.resolvedModel,
          status: 'succeeded',
          content: { video_url: 'https://media.example.test/result.mp4' },
        }),
      )
      .mockResolvedValueOnce(new Response(mp4));
    const result = await createEcloudHandlers({ fetcher, wait }).EcloudVideoProvider.generateVideo(
      { ...base, ...inputs, videoMode: mode, generate_audio: false, seed: 4294967295 },
      { ...config, generationTaskSubmitting: submitting, generationTaskSubmitted: saved },
    );
    expect(result).toEqual({ buffer: mp4, format: 'mp4' });
    expect(submitting).toHaveBeenCalledOnce();
    expect(saved).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(protocol.endpoint);
    expect(options.headers).toEqual({
      Authorization: 'Bearer ' + config.ECLOUD_API_KEY,
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      model: protocol.model,
      duration: 8,
      resolution: '1080p',
      ratio: '16:9',
      generate_audio: false,
      watermark: false,
      seed: 4294967295,
    });
    expect(body.input).toBeUndefined();
    expect(body.parameters).toBeUndefined();
    const roles = body.content.slice(1).map((item) => item.role);
    expect(roles).toEqual(
      mode === 'text-to-video'
        ? []
        : mode === 'first-frame'
          ? ['first_frame']
          : mode === 'i2v-first-last-frame'
            ? ['first_frame', 'last_frame']
            : ['reference_image', 'reference_video', 'reference_audio'],
    );
    expect(wait.mock.calls.map((call) => call[0])).toEqual([10000, 10000]);
    expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
    expect(fetcher.mock.calls[1][0]).toBe(protocol.endpoint + '/cgt-test');
    expect(fetcher.mock.calls[4][1].headers).toBeUndefined();
    expect(JSON.stringify(saved.mock.calls)).not.toContain(config.ECLOUD_API_KEY);
  },
);

it('recovers without the original input or a second POST and isolates keys/endpoints', async () => {
  const fetcher = vi.fn(async () => json({ id: 'cgt-saved', status: 'running' }));
  const p = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  const params = { videoModel: protocol.model, url: protocol.endpoint };
  expect(await p.recoverVideo(receipt(), params, { ECLOUD_API_KEY: 'changed' })).toEqual({
    status: 'unknown',
  });
  expect(p.canRecoverVideo(receipt(), { ...params, url: ECLOUD_ENDPOINTS.video }, config)).toBe(
    false,
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(await p.recoverVideo(receipt(), params, config)).toEqual({ status: 'pending' });
  expect(fetcher.mock.calls[0][1].method).toBe('GET');
  fetcher.mockResolvedValueOnce(json({ error: { code: 'ResourceNotFound' } }, 404));
  expect(await p.recoverVideo(receipt(), params, config)).toEqual({ status: 'unknown' });
  fetcher.mockResolvedValueOnce(
    json({ id: 'other-task', status: 'succeeded', content: { video_url: video } }),
  );
  expect(await p.recoverVideo(receipt(), params, config)).toEqual({ status: 'unknown' });
});

it('handles failed, cancelled and expired tasks as confirmed terminal outcomes', async () => {
  for (const status of ['failed', 'cancelled', 'expired']) {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ id: 'cgt-test' }))
      .mockResolvedValueOnce(
        json({
          id: 'cgt-test',
          status,
          error: { code: 'ContentRejected', message: 'private diagnostic' },
        }),
      );
    await expect(
      createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(base, config),
    ).rejects.toMatchObject({ code: 'ECLOUD_TASK_FAILED', providerTaskFailed: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  }
});

it('does not replay uncertain submissions or resubmit after a result download fails', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('socket reset'));
  await expect(
    createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(base, config),
  ).rejects.toMatchObject({ submissionUncertain: true });
  expect(fetcher).toHaveBeenCalledOnce();
  const saved = vi.fn();
  fetcher
    .mockReset()
    .mockResolvedValueOnce(json({ id: 'cgt-saved' }))
    .mockResolvedValueOnce(
      json({ id: 'cgt-saved', status: 'succeeded', content: { video_url: video } }),
    )
    .mockResolvedValueOnce(new Response('expired', { status: 403 }));
  const p = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  await expect(
    p.generateVideo(base, { ...config, generationTaskSubmitted: saved }),
  ).rejects.toThrow('下载失败');
  expect(saved).toHaveBeenCalledOnce();
  expect(p.canRecoverVideo(saved.mock.calls[0][0], base, config)).toBe(true);
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});

it('stops polling on cancellation and bounds the wait without cancelling remote work', async () => {
  const controller = new AbortController();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ id: 'cgt-test' }))
    .mockResolvedValueOnce(json({ id: 'cgt-test', status: 'running' }));
  const wait = async () => {
    controller.abort();
    controller.signal.throwIfAborted();
  };
  await expect(
    createEcloudHandlers({ fetcher, wait }).EcloudVideoProvider.generateVideo(
      { ...base, signal: controller.signal },
      config,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  let now = 0;
  fetcher
    .mockReset()
    .mockResolvedValueOnce(json({ id: 'cgt-test' }))
    .mockResolvedValueOnce(json({ id: 'cgt-test', status: 'queued' }));
  await expect(
    createEcloudHandlers({
      fetcher,
      now: () => now,
      wait: async () => {
        now = 1200000;
      },
    }).EcloudVideoProvider.generateVideo(base, config),
  ).rejects.toThrow('超时');
  expect(fetcher.mock.calls.some(([, options]) => options.method === 'DELETE')).toBe(false);
});

it('validates modes, input counts, public URLs and parameters before contacting the gateway', async () => {
  const fetcher = vi.fn(),
    p = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  const invalid = [
    { duration: 3 },
    { duration: 16 },
    { seed: 4294967296 },
    { aspectRatio: '4:3' },
    { resolution: '2k' },
    { videoMode: 'first-frame' },
    { videoMode: 'i2v-first-last-frame', images: [png] },
    { videoMode: 'multimodal', audios: [audio] },
    { videoMode: 'multimodal', images: Array(10).fill(png) },
    { videoMode: 'multimodal', videos: Array(4).fill(video) },
    { videoMode: 'multimodal', images: [png], audios: Array(4).fill(audio) },
    { videoMode: 'first-frame', images: ['/library/media/project/images/local.png'] },
    { videoMode: 'first-frame', images: ['http://127.0.0.1/private.png'] },
    { videoMode: 'first-frame', images: ['data:image/png;base64,AAAA'] },
    { videoMode: 'first-frame', images: ['asset://../other'] },
    { url: ECLOUD_ENDPOINTS.video },
  ];
  for (const patch of invalid)
    await expect(p.generateVideo({ ...base, ...patch }, config)).rejects.toMatchObject({
      code: 'ECLOUD_INVALID_INPUT',
    });
  await expect(p.generateVideo(base, { ARK_API_KEY: 'other-provider-key' })).rejects.toMatchObject({
    code: 'PROVIDER_CREDENTIAL_MISSING',
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(seedanceRequest({ ...base, duration: -1 }).duration).toBe(-1);
});

it('sanitizes gateway credential errors and never retries rejected paid requests', async () => {
  const fetcher = vi.fn(async () =>
    json({ error: { message: config.ECLOUD_API_KEY, type: 'invalid_authentication_error' } }, 403),
  );
  const error = await createEcloudHandlers({ fetcher })
    .EcloudVideoProvider.generateVideo(base, config)
    .catch((error) => error);
  expect(classifyGenerationError(error)).toMatchObject({
    code: 'ECLOUD_AUTH_FAILED',
    retryable: false,
  });
  expect(error.message).not.toContain(config.ECLOUD_API_KEY);
  expect(fetcher).toHaveBeenCalledOnce();
});

it('carries advanced reference URLs through canvas mode selection and the generation request', async () => {
  const model = loadModelCatalog()['Seedance 2.0 · 移动云'];
  expect(model.provider).toBe('EcloudVideoProvider');
  const node = {
    id: 'video',
    type: 'Video',
    videoModel: model.name,
    prompt: '创作',
    reference_image_urls: png + '\nasset://asset-last',
    duration: 6,
  };
  const models = { imageModels: [], videoModels: [model], audioModels: [], textModels: [] };
  expect(externalReferenceMedia(node, model)).toHaveLength(2);
  expect(effectiveVideoMode([], node, model)).toBe('i2v-first-last-frame');
  const request = await buildVideoRequest([], node, node.prompt, 'project', models);
  expect(request).toMatchObject({
    videoMode: 'i2v-first-last-frame',
    images: [png, 'asset://asset-last'],
    duration: 6,
  });
  expect(
    seedanceRequest({ ...request, videoModel: protocol.model })
      .content.slice(1)
      .map((item) => item.role),
  ).toEqual(['first_frame', 'last_frame']);
  const mixed = { ...node, reference_video_urls: video, reference_audio_urls: audio };
  expect(effectiveVideoMode([], mixed, model)).toBe('multimodal');
  expect((await buildVideoRequest([], mixed, node.prompt, 'project', models)).audios).toEqual([
    audio,
  ]);
  expect(
    isVideoGenerationModeAllowed('multimodal', { images: 0, audios: 1 }, model.videoModes),
  ).toBe(false);
  expect(isVideoGenerationModeAllowed('first-frame', { images: 2 }, model.videoModes)).toBe(false);
});

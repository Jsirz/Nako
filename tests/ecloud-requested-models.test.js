import { afterEach, expect, it, vi } from 'vitest';
import './helpers/modelCatalog.js';
import { useServerCapabilities } from './helpers/serverCapabilities.js';
useServerCapabilities();
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createEcloudHandlers } from '../plugins/providers/ecloud/implementation.js';
import { minimaxRequest } from '../plugins/providers/ecloud/minimax.js';
import { VIDEO_MODELS } from '../plugins/providers/ecloud/models';
import {
  ECLOUD_MINIMAX as protocol,
  ECLOUD_GLM_MODEL,
  ECLOUD_ENDPOINTS,
} from '../plugins/providers/ecloud/protocol.js';
import { BaseProvider } from '../modules/generation-providers/server/providers/baseProvider.js';
import { remoteTaskReference } from '../modules/generation-core/server/generation/generationTaskRecovery.js';
import { loadModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import { modelParameters } from '../plugins/platform/text-transport/modelConfig.js';
import { canvasAgentModels } from '../modules/agent/ui/agent/canvasAgentModels';
import {
  buildVideoRequest,
  effectiveVideoMode,
} from '../modules/generation-core/ui/generation/canvasGenerationRequests';
import { changeComposerModel } from '../modules/canvas-ui/ui/nodes/mediaComposer';
import { classifyGenerationError } from '../modules/generation-core/server/generation/generationErrors.js';

const config = { ECLOUD_API_KEY: 'fixture-moma-only' };
const base = {
  videoModel: protocol.model,
  url: protocol.endpoint,
  prompt: '电影镜头',
  resolution: '768p',
  duration: 5,
  aspectRatio: '16:9',
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=',
  'base64',
);
const image = `data:image/png;base64,${png.toString('base64')}`;
const video = 'https://media.example.test/reference.mp4';
const audio = 'https://media.example.test/reference.mp3';
const mp4 = Buffer.from([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115, 111, 109,
]);
const json = (value, status = 200) => Response.json(value, { status });
const bodyAt = (mock, index = 0) => JSON.parse(mock.mock.calls[index][1].body);
const receipt = () =>
  remoteTaskReference({
    taskId: 'h3-task',
    providerName: 'EcloudVideoProvider',
    modelId: protocol.model,
    submitUrl: protocol.endpoint,
    queryUrl: protocol.endpoint + '/',
    apiKey: config.ECLOUD_API_KEY,
  });
const task = (status, extra = {}) => ({
  task: { id: 'h3-task', model: 'MiniMax-H3', status, ...extra },
});
afterEach(() => vi.restoreAllMocks());

it.each(['768p', '2K'])(
  'recovers a completed %s task through the MoMA model-routed GET gateway without resubmitting',
  async (resolution) => {
    const fetcher = vi.fn(async (url, options) => {
      if (url === video) {
        expect(options.headers).toBeUndefined();
        return new Response(mp4);
      }
      expect(url).toBe(protocol.endpoint + '/h3-task');
      expect(options.method).toBe('GET');
      // Live gateway behavior: omitted header -> empty 404; unprefixed -> invalid task_id.
      if (!options.headers['X-Model-Name']) return new Response(null, { status: 404 });
      if (options.headers['X-Model-Name'] !== 'minimax/minimax-h3')
        return json({ error: { message: 'invalid task_id (2013)' } }, 400);
      return json(task('succeeded', { content: { url: video } }));
    });
    const provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
    expect(await provider.recoverVideo(receipt(), { ...base, resolution }, config)).toEqual({
      status: 'success',
      buffer: mp4,
      format: 'mp4',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
  },
);

it.each(['minimax/minimax-h3', 'MiniMax-H3', 'minimax/MiniMax-H3'])(
  'routes %s to the MiniMax endpoint and normalizes submissions at both resolutions',
  async (videoModel) => {
    const catalog = loadModelCatalog()['MiniMax-H3 · 移动云'];
    const source = VIDEO_MODELS.find((model) => model.name === catalog.name);
    expect(catalog.endpoint).toEqual(source.endpoint);
    for (const endpoint of Object.values(catalog.endpoint)) {
      expect(endpoint).toEqual({ model: 'minimax/minimax-h3', url: protocol.endpoint });
    }
    for (const resolution of ['768p', '2K']) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
        .mockResolvedValueOnce(
          json(task('succeeded', { model: videoModel, content: { url: video } })),
        )
        .mockResolvedValueOnce(new Response(mp4));
      const provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
      await provider.generateVideo({ ...base, videoModel, resolution }, config);
      expect(bodyAt(fetcher).model).toBe('minimax/minimax-h3');
      expect(fetcher.mock.calls[0][0]).toBe(protocol.endpoint);
      expect(fetcher.mock.calls[0][1].method).toBe('POST');
      expect(fetcher.mock.calls[1][0]).toBe(protocol.endpoint + '/h3-task');
      expect(fetcher.mock.calls[1][1].method).toBe('GET');
      expect(fetcher.mock.calls[1][1].headers['X-Model-Name']).toBe('minimax/minimax-h3');
      expect(provider.canRecoverVideo(receipt(), { ...base, videoModel, resolution }, config)).toBe(
        true,
      );
    }
  },
);

it('rejects retired MiniMax receipt identities without polling or resubmitting', async () => {
  const reference = remoteTaskReference({
    taskId: 'h3-task',
    providerName: 'EcloudVideoProvider',
    modelId: 'MiniMax-H3',
    submitUrl: protocol.endpoint,
    queryUrl: protocol.endpoint + '/',
    apiKey: config.ECLOUD_API_KEY,
  });
  const fetcher = vi.fn(async () => json(task('running')));
  const provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  expect(provider.canRecoverVideo(reference, base, config)).toBe(false);
  expect(await provider.recoverVideo(reference, base, { ECLOUD_API_KEY: 'changed' })).toEqual({
    status: 'unknown',
  });
  expect(
    provider.canRecoverVideo(reference, { ...base, url: ECLOUD_ENDPOINTS.video }, config),
  ).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
  expect(await provider.recoverVideo(reference, base, config)).toEqual({ status: 'unknown' });
  expect(fetcher).not.toHaveBeenCalled();
});

it.each(['2K', '2k'])(
  'uses the official %s MiniMax profile and shares the canonical task identity',
  async (resolution) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
      .mockResolvedValueOnce(json(task('succeeded', { content: { url: video } })))
      .mockResolvedValueOnce(new Response(mp4));
    const saved = vi.fn(),
      provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
    const params = { ...base, resolution, videoMode: 'multimodal', images: [image] };
    await provider.generateVideo(params, { ...config, generationTaskSubmitted: saved });
    expect(bodyAt(fetcher)).toMatchObject({
      model: 'minimax/minimax-h3',
      resolution: '2K',
      duration: 5,
      aigc_watermark: false,
    });
    expect(fetcher.mock.calls[1][1].method).toBe('GET');
    expect(fetcher.mock.calls[1][1].headers['X-Model-Name']).toBe('minimax/minimax-h3');
    const reference = saved.mock.calls[0][0];
    expect(provider.canRecoverVideo(reference, params, config)).toBe(true);
    expect(provider.canRecoverVideo(reference, base, config)).toBe(true);
    expect(provider.canRecoverVideo(reference, base, { ECLOUD_API_KEY: 'changed' })).toBe(false);
    fetcher.mockResolvedValueOnce(json(task('running', { model: 'minimax/MiniMax-H3' })));
    expect(await provider.recoverVideo(reference, params, config)).toEqual({ status: 'pending' });
    expect(fetcher.mock.calls.filter(([, o]) => o.method === 'POST')).toHaveLength(1);
    await expect(minimaxRequest({ ...params, duration: 4 }, config)).rejects.toThrow('5–15');
  },
);

it.each(['768p', '2K'])(
  'passes a %s canvas choice through and raises a legacy four-second duration to five',
  async (resolution) => {
    const model = VIDEO_MODELS.find((model) => model.name === 'MiniMax-H3 · 移动云');
    expect(model.resolutions).toEqual(['768p', '2K']);
    const node = {
      id: 'v',
      type: 'Video',
      videoModel: model.name,
      resolution,
      duration: 4,
      prompt: '镜头',
    };
    const request = await buildVideoRequest([], node, node.prompt, 'project', {
      videoModels: [model],
      textModels: [],
      imageModels: [],
      audioModels: [],
    });
    expect(request).toMatchObject({ resolution, duration: 5 });
    expect(await minimaxRequest({ ...request, videoModel: protocol.model }, config)).toMatchObject({
      resolution: resolution === '768p' ? '768P' : '2K',
      model: 'minimax/minimax-h3',
      duration: 5,
    });
  },
);

it.each([
  [{ error: { code: 'insufficient_balance', message: 'insufficient balance' } }, '余额不足'],
  [{ error: { message: '免费额度已用完' } }, '额度不足'],
  [{ error: { message: '暂未订购该模型或资源包' } }, '尚未订购'],
  [{}, '本机无法确认'],
  [null, '本机无法确认'],
])(
  'classifies a rejected 402 safely without polling or retrying (%j)',
  async (payload, expected) => {
    const fetcher = vi.fn(async () =>
      payload === null ? new Response('payment required', { status: 402 }) : json(payload, 402),
    );
    const saved = vi.fn();
    const error = await createEcloudHandlers({ fetcher })
      .EcloudVideoProvider.generateVideo(base, { ...config, generationTaskSubmitted: saved })
      .catch((e) => e);
    expect(error).toMatchObject({
      code: 'ECLOUD_PAYMENT_REQUIRED',
      status: 402,
      upstreamStatus: 402,
      retryable: false,
    });
    expect(error.submissionUncertain).not.toBe(true);
    expect(classifyGenerationError(error).message).toContain(expected);
    expect(saved).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledOnce();
  },
);

it('does not echo credentials or raw upstream error details in the payment message', async () => {
  const fetcher = vi.fn(async () =>
    json(
      {
        error: {
          message: `insufficient quota Bearer ${config.ECLOUD_API_KEY}`,
          code: 'quota_exhausted',
        },
      },
      402,
    ),
  );
  const error = await createEcloudHandlers({ fetcher })
    .EcloudVideoProvider.generateVideo(base, config)
    .catch((e) => e);
  expect(error.message).toContain('额度不足');
  expect(error.message).not.toContain(config.ECLOUD_API_KEY);
  expect(error.upstreamCode).toBe('quota_exhausted');
});

it('streams GLM text and reasoning using its own model ID and mandatory thinking parameters', async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        [
          'data: {"choices":[{"delta":{"reasoning_content":"分析"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"完成"}}]}\n\n',
          'data: [DONE]\n\n',
        ].join(''),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
  );
  vi.spyOn(BaseProvider, 'fetch', 'get').mockReturnValue(fetcher);
  const onToken = vi.fn();
  const result = await createEcloudHandlers().EcloudTextProvider.generateText(
    { textModel: ECLOUD_GLM_MODEL, prompt: '创作', max_tokens: 131072, onToken },
    config,
  );
  expect(result).toMatchObject({ text: '完成', reasoning: '分析' });
  expect(onToken).toHaveBeenCalledWith('完成');
  expect(fetcher.mock.calls[0][0]).toBe(ECLOUD_ENDPOINTS.text);
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-moma-only');
  expect(bodyAt(fetcher)).toMatchObject({
    model: 'zhipu/glm-5.3-flash',
    stream: true,
    max_tokens: 131072,
    thinking: { type: 'enabled', clear_thinking: false },
    reasoning_effort: 'max',
    tool_stream: true,
  });
  expect(bodyAt(fetcher)).not.toHaveProperty('enable_thinking');
});

it('supports GLM image and public-video understanding and rejects incompatible inputs before calling upstream', async () => {
  const submitChat = vi.fn(async () => ({ text: '描述' }));
  const provider = createEcloudHandlers({ submitChat }).EcloudTextProvider;
  await provider.generateText(
    { textModel: ECLOUD_GLM_MODEL, prompt: '描述', images: [image], videos: [video] },
    config,
  );
  expect(submitChat.mock.calls[0][0].body.messages[0].content).toEqual([
    { type: 'text', text: '描述' },
    { type: 'image_url', image_url: { url: image } },
    { type: 'video_url', video_url: { url: video } },
  ]);
  submitChat.mockClear();
  for (const patch of [
    { enable_thinking: false },
    { enable_thinking: 'false' },
    { max_tokens: 131073 },
    { videos: ['/library/media/project/videos/v.mp4'] },
    { audios: [audio] },
    { url: 'https://other.example.test/chat' },
  ]) {
    await expect(
      provider.generateText({ textModel: ECLOUD_GLM_MODEL, prompt: '描述', ...patch }, config),
    ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  }
  await expect(
    provider.generateText({ textModel: ECLOUD_GLM_MODEL, prompt: '描述' }, {}),
  ).rejects.toMatchObject({ code: 'PROVIDER_CREDENTIAL_MISSING' });
  expect(submitChat).not.toHaveBeenCalled();
});

it('uses GLM mandatory thinking in Agent and preserves the Qwen thinking switch', () => {
  const models = loadModelCatalog(),
    glm = models['GLM-5.3-Flash · 移动云'];
  expect(canvasAgentModels([glm])[0]).toMatchObject({ id: glm.name, vision: 'supported' });
  expect(modelParameters({ max_output_tokens: 131072 }, glm)).toMatchObject({
    max_tokens: 131072,
    thinking: { type: 'enabled', clear_thinking: false },
    reasoning_effort: 'max',
    tool_stream: true,
  });
  expect(modelParameters({}, glm)).not.toHaveProperty('enable_thinking');
  for (const reasoning_effort of ['low', 'high', 'max']) {
    expect(modelParameters({ reasoning_effort }, glm)).toMatchObject({ reasoning_effort });
  }
  expect(() => modelParameters({ reasoning_effort: 'medium' }, glm)).toThrow('不支持');
  expect(() => modelParameters({ enable_thinking: false }, glm)).toThrow('不支持关闭');
  expect(() => modelParameters({ max_output_tokens: 131073 }, glm)).toThrow('128K');
  expect(
    modelParameters({ enable_thinking: false }, models['qwen3-max · 移动云']).enable_thinking,
  ).toBe(false);
  expect(glm.advancedParams.some((p) => p.key === 'enable_thinking')).toBe(false);
});

it.each([
  ['text-to-video', {}, [], '16:9'],
  ['first-frame', { images: [image] }, ['first_frame'], 'adaptive'],
  ['last-frame', { images: [image] }, ['last_frame'], 'adaptive'],
  ['i2v-first-last-frame', { images: [image, image] }, ['first_frame', 'last_frame'], 'adaptive'],
  [
    'multimodal',
    { images: [image], videos: [video], audios: [audio] },
    ['reference_image', 'reference_video', 'reference_audio'],
    '16:9',
  ],
])(
  'submits MiniMax %s once, queries with Bearer auth, and downloads without credentials',
  async (mode, inputs, roles, ratio) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
      .mockResolvedValueOnce(json(task('queued')))
      .mockResolvedValueOnce(json(task('running')))
      .mockResolvedValueOnce(
        json(task('succeeded', { content: { url: 'https://media.example.test/result.mp4' } })),
      )
      .mockResolvedValueOnce(new Response(mp4));
    const saved = vi.fn(),
      submitting = vi.fn(),
      wait = vi.fn(async () => {});
    const result = await createEcloudHandlers({ fetcher, wait }).EcloudVideoProvider.generateVideo(
      { ...base, ...inputs, videoMode: mode },
      { ...config, generationTaskSubmitted: saved, generationTaskSubmitting: submitting },
    );
    expect(result).toEqual({ buffer: mp4, format: 'mp4' });
    expect(fetcher.mock.calls[0][0]).toBe('https://moma.cmecloud.cn/v1/videos');
    expect(bodyAt(fetcher)).toMatchObject({
      model: 'minimax/minimax-h3',
      resolution: '768P',
      duration: 5,
      aigc_watermark: false,
      ratio,
    });
    expect(
      bodyAt(fetcher)
        .content.slice(1)
        .map((c) => c.role),
    ).toEqual(roles);
    expect(bodyAt(fetcher)).not.toHaveProperty('input');
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('X-DashScope-Async');
    for (const [url, options] of fetcher.mock.calls.slice(1, 4)) {
      expect(url).toBe('https://moma.cmecloud.cn/v1/videos/h3-task');
      expect(options.method).toBe('GET');
      expect(options.headers['X-Model-Name']).toBe('minimax/minimax-h3');
      expect(options.headers.Authorization).toBe('Bearer fixture-moma-only');
    }
    expect(fetcher.mock.calls.at(-1)[1].headers).toBeUndefined();
    expect(fetcher.mock.calls.filter(([, o]) => o.method === 'POST')).toHaveLength(1);
    expect(saved).toHaveBeenCalledWith(receipt());
    expect(submitting).toHaveBeenCalledOnce();
    expect(JSON.stringify(receipt())).not.toContain(config.ECLOUD_API_KEY);
    expect(wait).toHaveBeenCalledWith(10000, undefined);
  },
);

it.each(['failed', 'cancelled', 'expired'])(
  'marks MiniMax %s as a terminal provider failure',
  async (status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
      .mockResolvedValueOnce(json(task(status, { error: { code: 'failed', message: 'fixture' } })));
    await expect(
      createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(base, config),
    ).rejects.toMatchObject({ providerTaskFailed: true, retryable: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);

it('recovers MiniMax with GET only and refuses another task, model, credential or endpoint', async () => {
  const fetcher = vi.fn(async () => json(task('running'))),
    provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  expect(provider.canRecoverVideo(receipt(), base, config)).toBe(true);
  expect(await provider.recoverVideo(receipt(), base, { ECLOUD_API_KEY: 'changed' })).toEqual({
    status: 'unknown',
  });
  expect(
    provider.canRecoverVideo(receipt(), { ...base, url: ECLOUD_ENDPOINTS.video }, config),
  ).toBe(false);
  expect(
    provider.canRecoverVideo(receipt(), { ...base, videoModel: 'doubao-seedance-2.0' }, config),
  ).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
  expect(await provider.recoverVideo(receipt(), base, config)).toEqual({ status: 'pending' });
  for (const result of [
    task('succeeded', { id: 'wrong', content: { url: video } }),
    task('succeeded', { model: 'wrong', content: { url: video } }),
    task('succeeded'),
    { task: {} },
    {},
  ]) {
    fetcher.mockResolvedValueOnce(json(result));
    expect(await provider.recoverVideo(receipt(), base, config)).toEqual({ status: 'unknown' });
  }
  fetcher.mockResolvedValueOnce(json({ error: 'not found' }, 404));
  expect(await provider.recoverVideo(receipt(), base, config)).toEqual({ status: 'unknown' });
  expect(fetcher.mock.calls.every(([, o]) => o.method === 'GET')).toBe(true);
});

it('never repeats MiniMax submissions when the response is lost or a paid result cannot be downloaded', async () => {
  for (const submitResponse of [
    () => {
      throw new TypeError('reset');
    },
    () => json({}),
    () => new Response('invalid json'),
  ]) {
    const fetcher = vi.fn(submitResponse);
    await expect(
      createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(base, config),
    ).rejects.toMatchObject({ submissionUncertain: true });
    expect(fetcher).toHaveBeenCalledOnce();
  }
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
    .mockResolvedValueOnce(json(task('succeeded', { content: { url: video } })))
    .mockResolvedValueOnce(new Response('expired', { status: 404 }));
  const saved = vi.fn();
  await expect(
    createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(base, {
      ...config,
      generationTaskSubmitted: saved,
    }),
  ).rejects.toThrow('下载失败');
  expect(saved).toHaveBeenCalledWith(receipt());
  expect(fetcher.mock.calls.filter(([, o]) => o.method === 'POST')).toHaveLength(1);
});

it('stops MiniMax polling on cancellation and timeout without resubmission', async () => {
  const controller = new AbortController();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
    .mockImplementation(async () => json(task('running')));
  const wait = vi.fn(async (_ms, signal) => {
    controller.abort();
    signal.throwIfAborted();
  });
  await expect(
    createEcloudHandlers({ fetcher, wait }).EcloudVideoProvider.generateVideo(
      { ...base, signal: controller.signal },
      config,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  let clock = 0;
  fetcher
    .mockReset()
    .mockResolvedValueOnce(json({ task_id: 'h3-task' }))
    .mockImplementation(async () => json(task('queued')));
  await expect(
    createEcloudHandlers({
      fetcher,
      now: () => clock,
      wait: async () => {
        clock += 1200001;
      },
    }).EcloudVideoProvider.generateVideo(base, config),
  ).rejects.toThrow('超时');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('rejects invalid MiniMax parameters and media before marking or submitting a paid task', async () => {
  const fetcher = vi.fn(),
    submitting = vi.fn(),
    provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  for (const patch of [
    { prompt: '' },
    { duration: 3 },
    { duration: 4 },
    { duration: 16 },
    { duration: 5.5 },
    { resolution: '4K' },
    { aspectRatio: 'adaptive' },
    { videoMode: 'video-edit' },
    { videoMode: 'first-frame' },
    { videoMode: 'i2v-first-last-frame', images: [image] },
    { videoMode: 'multimodal', audios: [audio] },
    { videoMode: 'multimodal', images: Array(10).fill(image) },
    { videoMode: 'multimodal', videos: ['http://127.0.0.1/x.mp4'] },
    { images: [image] },
    { url: ECLOUD_ENDPOINTS.video },
  ]) {
    await expect(
      provider.generateVideo(
        { ...base, ...patch },
        { ...config, generationTaskSubmitting: submitting },
      ),
    ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  }
  await expect(provider.generateVideo(base, {})).rejects.toMatchObject({
    code: 'PROVIDER_CREDENTIAL_MISSING',
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(submitting).not.toHaveBeenCalled();
});

it('encodes current-project MiniMax audio/video/images and refuses cross-project paths', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-h3-'));
  try {
    for (const [dir, name, bytes] of [
      ['images', 'i.png', png],
      ['videos', 'v.mp4', mp4],
      ['audios', 'a.wav', Buffer.from('RIFF0000WAVEfmt ')],
    ]) {
      await mkdir(path.join(root, 'media', 'project', dir), { recursive: true });
      await writeFile(path.join(root, 'media', 'project', dir, name), bytes);
    }
    const params = {
      ...base,
      projectId: 'project',
      videoMode: 'multimodal',
      images: ['/library/media/project/images/i.png'],
      videos: ['/library/media/project/videos/v.mp4'],
      audios: ['/library/media/project/audios/a.wav'],
    };
    const body = await minimaxRequest(params, { ...config, LIBRARY_DIR: root });
    expect(body.content[1].image_url.url).toBe(image);
    expect(body.content[2].video_url.url).toMatch(/^data:video\/mp4;base64,/);
    expect(body.content[3].audio_url.url).toMatch(/^data:audio\/wav;base64,/);
    await expect(
      minimaxRequest(
        { ...params, audios: ['/library/media/other/audios/a.wav'] },
        { ...config, LIBRARY_DIR: root },
      ),
    ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('keeps MiniMax 768P and reference inputs through canvas selection and request assembly', async () => {
  const model = VIDEO_MODELS.find((model) => model.name === 'MiniMax-H3 · 移动云');
  const node = {
    id: 'video',
    type: 'Video',
    videoModel: model.name,
    prompt: '画面',
    reference_image_urls: 'https://media.example.test/a.png https://media.example.test/b.png',
  };
  expect(changeComposerModel('video', node, model, [], [])).toMatchObject({ resolution: '768p' });
  expect(effectiveVideoMode([], node, model)).toBe('i2v-first-last-frame');
  const models = { videoModels: [model], imageModels: [], textModels: [], audioModels: [] };
  const request = await buildVideoRequest([], node, node.prompt, 'project', models);
  expect(request).toMatchObject({
    resolution: '768p',
    videoMode: 'i2v-first-last-frame',
    duration: 5,
  });
  const body = await minimaxRequest({ ...request, videoModel: protocol.model }, config);
  expect(body.content.slice(1).map((c) => c.role)).toEqual(['first_frame', 'last_frame']);
  expect(body.ratio).toBe('adaptive');
});

it('keeps the existing Qwen image identity while generating using the official image protocol', async () => {
  const model = loadModelCatalog()['Qwen-Image 2.0 Pro · 移动云'];
  expect(model.displayName).toBe('Qwen-Image-2.0-Pro · 移动云');
  expect(model.endpoint['text-to-image']).toEqual({
    url: ECLOUD_ENDPOINTS.image,
    model: 'qwen/qwen-image-2.0-pro',
  });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      json({
        output: {
          choices: [{ message: { content: [{ image: 'https://media.example.test/out.png' }] } }],
        },
      }),
    )
    .mockResolvedValueOnce(new Response(png));
  await expect(
    createEcloudHandlers({ fetcher }).EcloudImageProvider.generateImage(
      {
        imageModel: model.endpoint['text-to-image'].model,
        imageMode: 'text-to-image',
        prompt: '生成一张图',
        aspectRatio: '1:1',
        resolution: '2K',
      },
      config,
    ),
  ).resolves.toEqual([{ buffer: png, format: 'png' }]);
  expect(bodyAt(fetcher)).toMatchObject({
    model: 'qwen/qwen-image-2.0-pro',
    parameters: { size: '2048*2048', n: 1 },
    input: { messages: [{ role: 'user', content: [{ text: '生成一张图' }] }] },
  });
});

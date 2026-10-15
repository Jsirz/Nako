import { afterEach, expect, it, vi } from 'vitest';
import './helpers/modelCatalog.js';
import { useServerCapabilities } from './helpers/serverCapabilities.js';
useServerCapabilities();
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { createGenerationRouter } from '../modules/generation-core/server/routes/generation.js';
import { createEcloudHandlers } from '../plugins/providers/ecloud/implementation.js';
import { ECLOUD_ENDPOINTS, ECLOUD_VIDEO_MODELS } from '../plugins/providers/ecloud/protocol.js';
import { BaseProvider } from '../modules/generation-providers/server/providers/baseProvider.js';
import { remoteTaskReference } from '../modules/generation-core/server/generation/generationTaskRecovery.js';
import { createServerPluginHost } from './helpers/serverPluginHost.js';
import { buildSourceSettings } from '../modules/generation-core/server/generation/modelAvailability.js';
import { classifyGenerationError } from '../modules/generation-core/server/generation/generationErrors.js';
import { ecloudInputError } from '../plugins/providers/ecloud/media.js';
import { loadModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import {
  textModelConnection,
  modelParameters,
} from '../plugins/platform/text-transport/modelConfig.js';
import { canvasAgentModels } from '../modules/agent/ui/agent/canvasAgentModels';
import { generationUnitPrice } from '../modules/generation-core/ui/generation/canvasGenerationRequests';

const key = 'fixture-moma-key';
const config = { ECLOUD_API_KEY: key };
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=',
  'base64',
);
const image = `data:image/png;base64,${png.toString('base64')}`;
const mp4 = Buffer.from([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115, 111, 109,
]);
const wav = Buffer.from('RIFF0000WAVEfmt ', 'ascii');
const json = (value, status = 200) => Response.json(value, { status });
const bodyAt = (fetcher, index = 0) => JSON.parse(fetcher.mock.calls[index][1].body);
afterEach(() => vi.restoreAllMocks());

it('streams MoMA text/reasoning with Bearer auth and standard chat parameters', async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        [
          'data: {"choices":[{"delta":{"reasoning_content":"thought"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}]}\n\n',
          'data: [DONE]\n\n',
        ].join(''),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
  );
  vi.spyOn(BaseProvider, 'fetch', 'get').mockReturnValue(fetcher);
  const tokens = [];
  const result = await createEcloudHandlers().EcloudTextProvider.generateText(
    {
      textModel: 'qwen/qwen3-max',
      url: ECLOUD_ENDPOINTS.text,
      prompt: '你好',
      enable_thinking: 'true',
      onToken: (token) => tokens.push(token),
    },
    config,
  );
  expect(result).toMatchObject({ text: 'hello world', reasoning: 'thought' });
  expect(tokens).toEqual(['hello', ' world']);
  expect(fetcher.mock.calls[0][0]).toBe(ECLOUD_ENDPOINTS.text);
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${key}`);
  expect(bodyAt(fetcher)).toMatchObject({
    model: 'qwen/qwen3-max',
    stream: true,
    enable_thinking: true,
    messages: [{ role: 'user', content: '你好' }],
  });
});

it('encodes vision input and accepts non-streaming chat responses', async () => {
  const fetcher = vi.fn(async () => json({ choices: [{ message: { content: 'an image' } }] }));
  vi.spyOn(BaseProvider, 'fetch', 'get').mockReturnValue(fetcher);
  const result = await createEcloudHandlers().EcloudTextProvider.generateText(
    {
      textModel: 'qwen/qwen3.6-plus',
      prompt: 'describe',
      images: [image],
      videos: ['https://media.example.test/input.mp4'],
    },
    config,
  );
  expect(result.text).toBe('an image');
  expect(bodyAt(fetcher).messages[0].content).toEqual([
    { type: 'text', text: 'describe' },
    { type: 'image_url', image_url: { url: image } },
    { type: 'video_url', video_url: { url: 'https://media.example.test/input.mp4' } },
  ]);
});

it('submits one Qwen image edit with n results and downloads without disclosing the API key', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      json({
        output: {
          choices: [
            {
              message: {
                content: [
                  { image: 'https://media.example.test/a.png' },
                  { image: 'https://media.example.test/b.png' },
                ],
              },
            },
          ],
        },
      }),
    )
    .mockImplementation(async () => new Response(png));
  const result = await createEcloudHandlers({ fetcher }).EcloudImageProvider.generateImage(
    {
      imageModel: 'qwen/qwen-image-2.0-pro',
      imageMode: 'image-to-image',
      images: [image],
      prompt: 'edit',
      generateCount: 2,
      aspectRatio: '16:9',
      resolution: '2K',
    },
    config,
  );
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(bodyAt(fetcher)).toMatchObject({
    model: 'qwen/qwen-image-2.0-pro',
    input: { messages: [{ role: 'user', content: [{ image }, { text: 'edit' }] }] },
    parameters: { size: '2688*1536', n: 2, prompt_extend: true, watermark: false },
  });
  expect(result).toEqual([
    { buffer: png, format: 'png' },
    { buffer: png, format: 'png' },
  ]);
  expect(fetcher.mock.calls[1][1].headers).toBeUndefined();
});

it.each(['text-to-video', 'first-frame', 'reference-video', 'video-edit'])(
  'maps HappyHorse %s inputs and persists a recoverable receipt',
  async (mode) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ output: { task_id: 'task-123', task_status: 'PENDING' } }))
      .mockResolvedValueOnce(json({ output: { task_id: 'task-123', task_status: 'RUNNING' } }))
      .mockResolvedValueOnce(
        json({
          output: {
            task_id: 'task-123',
            task_status: 'SUCCEEDED',
            video_url: 'https://media.example.test/out.mp4',
          },
        }),
      )
      .mockResolvedValueOnce(new Response(mp4));
    const saved = vi.fn(),
      submitting = vi.fn(),
      wait = vi.fn(async () => {});
    const params = {
      videoModel: ECLOUD_VIDEO_MODELS[mode],
      videoMode: mode,
      prompt: 'video prompt',
      resolution: '720p',
      duration: 8,
      aspectRatio: '9:16',
      images: mode === 'text-to-video' ? [] : [image],
      videos: mode === 'video-edit' ? ['https://media.example.test/input.mp4'] : [],
    };
    const provider = createEcloudHandlers({ fetcher, wait }).EcloudVideoProvider;
    const result = await provider.generateVideo(params, {
      ...config,
      generationTaskSubmitted: saved,
      generationTaskSubmitting: submitting,
    });
    expect(result).toEqual({ buffer: mp4, format: 'mp4' });
    expect(submitting).toHaveBeenCalledOnce();
    expect(saved).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledOnce();
    const receipt = saved.mock.calls[0][0];
    expect(receipt).toMatchObject({ taskId: 'task-123', providerName: 'EcloudVideoProvider' });
    expect(JSON.stringify(receipt)).not.toContain(key);
    expect(provider.canRecoverVideo(receipt, params, config)).toBe(true);
    expect(provider.canRecoverVideo(receipt, params, { ECLOUD_API_KEY: 'different-key' })).toBe(
      false,
    );
    const body = bodyAt(fetcher);
    expect(body.model).toBe(ECLOUD_VIDEO_MODELS[mode]);
    expect(fetcher.mock.calls[0][1].headers['X-DashScope-Async']).toBe('enable');
    expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
    if (mode === 'first-frame') {
      expect(body.input.media).toEqual([{ type: 'first_frame', url: image }]);
      expect(body.parameters.ratio).toBeUndefined();
    }
    if (mode === 'reference-video') expect(body.input.media[0].type).toBe('reference_image');
    if (mode === 'video-edit') {
      expect(body.parameters.duration).toBeUndefined();
      expect(body.parameters.ratio).toBeUndefined();
      expect(body.input.media[0].type).toBe('video');
    } else expect(body.parameters.duration).toBe(8);
  },
);

it('recovers the original video by GET only and refuses changed credentials', async () => {
  const params = {
    videoModel: ECLOUD_VIDEO_MODELS['text-to-video'],
    videoMode: 'text-to-video',
    url: ECLOUD_ENDPOINTS.video,
  };
  const reference = remoteTaskReference({
    taskId: 'saved-task',
    providerName: 'EcloudVideoProvider',
    modelId: params.videoModel,
    submitUrl: params.url,
    queryUrl: 'https://moma.cmecloud.cn/api/v1/tasks/',
    apiKey: key,
  });
  const fetcher = vi.fn(async () =>
    json({ output: { task_id: 'saved-task', task_status: 'PENDING' } }),
  );
  const provider = createEcloudHandlers({ fetcher }).EcloudVideoProvider;
  expect(await provider.recoverVideo(reference, params, { ECLOUD_API_KEY: 'changed' })).toEqual({
    status: 'unknown',
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(await provider.recoverVideo(reference, params, config)).toEqual({ status: 'pending' });
  expect(fetcher.mock.calls[0][0]).toBe('https://moma.cmecloud.cn/api/v1/tasks/saved-task');
  expect(fetcher.mock.calls[0][1].method).toBe('GET');
});

it('does not replay a video POST when the submission response is lost', async () => {
  const fetcher = vi.fn(async () => {
    throw new TypeError('connection reset');
  });
  await expect(
    createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(
      { videoModel: ECLOUD_VIDEO_MODELS['text-to-video'], prompt: 'test' },
      config,
    ),
  ).rejects.toMatchObject({ submissionUncertain: true });
  expect(fetcher).toHaveBeenCalledOnce();
});

it('stops polling on cancellation and distinguishes an upstream terminal failure', async () => {
  const controller = new AbortController();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ output: { task_id: 'cancel-test' } }))
    .mockResolvedValueOnce(json({ output: { task_status: 'RUNNING' } }));
  const wait = async (_ms, signal) => {
    controller.abort();
    signal.throwIfAborted();
  };
  await expect(
    createEcloudHandlers({ fetcher, wait }).EcloudVideoProvider.generateVideo(
      {
        videoModel: ECLOUD_VIDEO_MODELS['text-to-video'],
        prompt: 'test',
        signal: controller.signal,
      },
      config,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher
    .mockReset()
    .mockResolvedValueOnce(json({ output: { task_id: 'failed-test' } }))
    .mockResolvedValueOnce(json({ output: { task_status: 'FAILED' } }));
  await expect(
    createEcloudHandlers({ fetcher }).EcloudVideoProvider.generateVideo(
      { videoModel: ECLOUD_VIDEO_MODELS['text-to-video'], prompt: 'test' },
      config,
    ),
  ).rejects.toMatchObject({ providerTaskFailed: true });
});

it('submits non-streaming TTS and stores the returned WAV', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      json({ output: { audio: { url: 'https://media.example.test/voice.wav' } } }),
    )
    .mockResolvedValueOnce(new Response(wav));
  const result = await createEcloudHandlers({ fetcher }).EcloudAudioProvider.generateAudio(
    { audioModel: 'qwen/qwen3-tts-flash', prompt: '你好', language_type: 'Chinese' },
    config,
  );
  expect(bodyAt(fetcher)).toEqual({
    model: 'qwen/qwen3-tts-flash',
    input: { text: '你好', voice: 'Cherry', language_type: 'Chinese' },
  });
  expect(result).toEqual({ buffer: wav, format: 'wav' });
  expect(fetcher.mock.calls[1][1].headers).toBeUndefined();
});

it('rejects missing credentials, wrong endpoints and invalid media before making requests', async () => {
  const fetcher = vi.fn(),
    handlers = createEcloudHandlers({ fetcher });
  await expect(
    handlers.EcloudImageProvider.generateImage(
      { imageModel: 'qwen/qwen-image-2.0-pro', prompt: 'test' },
      {},
    ),
  ).rejects.toMatchObject({ code: 'PROVIDER_CREDENTIAL_MISSING' });
  await expect(
    handlers.EcloudImageProvider.generateImage(
      {
        imageModel: 'qwen/qwen-image-2.0-pro',
        url: 'https://unrelated.example.test/',
        prompt: 'test',
      },
      config,
    ),
  ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  await expect(
    handlers.EcloudImageProvider.generateImage(
      { imageModel: 'qwen/qwen-image-2.0-pro', prompt: 'test', generateCount: 7 },
      config,
    ),
  ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  await expect(
    handlers.EcloudVideoProvider.generateVideo(
      {
        videoModel: ECLOUD_VIDEO_MODELS['video-edit'],
        videoMode: 'video-edit',
        prompt: 'edit',
        videos: ['http://127.0.0.1/library/video.mp4'],
      },
      config,
    ),
  ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  await expect(
    handlers.EcloudVideoProvider.generateVideo(
      { videoModel: ECLOUD_VIDEO_MODELS['first-frame'], videoMode: 'first-frame', prompt: 'test' },
      config,
    ),
  ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('uses project-scoped local media without reading another project', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-ecloud-media-'));
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
  try {
    await mkdir(path.join(root, 'media', 'project', 'images'), { recursive: true });
    await writeFile(path.join(root, 'media', 'project', 'images', 'input.png'), png);
    const provider = createEcloudHandlers({ fetcher }).EcloudImageProvider;
    const params = {
      imageModel: 'qwen/qwen-image-2.0-pro',
      imageMode: 'image-to-image',
      prompt: 'edit',
      projectId: 'project',
      images: ['/library/media/project/images/input.png'],
    };
    await provider.generateImage(params, { ...config, LIBRARY_DIR: root });
    expect(bodyAt(fetcher).input.messages[0].content[0]).toEqual({ image });
    fetcher.mockClear();
    await expect(
      provider.generateImage(
        { ...params, images: ['/library/media/other/images/input.png'] },
        { ...config, LIBRARY_DIR: root },
      ),
    ).rejects.toMatchObject({ code: 'ECLOUD_INVALID_INPUT' });
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('reports an invalid MoMA key without retrying or returning the server body', async () => {
  const fetcher = vi.fn(async () => json({ message: 'secret ' + key }, 401));
  await expect(
    createEcloudHandlers({ fetcher }).EcloudAudioProvider.generateAudio(
      { audioModel: 'qwen/qwen3-tts-flash', prompt: 'hello' },
      config,
    ),
  ).rejects.toMatchObject({ code: 'ECLOUD_AUTH_FAILED', upstreamStatus: 401 });
  expect(fetcher).toHaveBeenCalledOnce();
});

it('preserves safe local validation messages and stops after a failed paid result download', async () => {
  const error = ecloudInputError('视频编辑需要公网视频 URL。');
  expect(classifyGenerationError(error)).toMatchObject({
    code: 'ECLOUD_INVALID_INPUT',
    message: error.message,
    retryable: false,
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
    .mockResolvedValueOnce(new Response('expired', { status: 404 }));
  await expect(
    createEcloudHandlers({ fetcher }).EcloudImageProvider.generateImage(
      { imageModel: 'qwen/qwen-image-2.0-pro', prompt: 'test' },
      config,
    ),
  ).rejects.toMatchObject({ submissionUncertain: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});

it('registers the source, credentials, Agent models and plugin disable behavior', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-ecloud-host-'));
  let host;
  try {
    host = await createServerPluginHost({
      libraryDirectory: path.join(root, 'library'),
      readSecret: (name) => (name === 'ECLOUD_API_KEY' ? key : undefined),
      configuration: { disabled: [], options: {} },
    });
    const source = buildSourceSettings({
      readSecret: (name) => (name === 'ECLOUD_API_KEY' ? key : undefined),
    }).find((block) => block.source === 'ecloud');
    expect(source.label).toBe('移动云 MoMA');
    expect(source.singleKey).toBe(true);
    expect(source.secrets).toEqual([{ key: 'ECLOUD_API_KEY', configured: true }]);
    expect(source.media.flatMap((media) => media.models)).toHaveLength(16);
    expect(source.media.every((media) => media.models.every((model) => model.configured))).toBe(
      true,
    );
    const models = Object.values(loadModelCatalog()).filter((model) => model.source === 'ecloud');
    for (const model of models) {
      const mode = Object.keys(model.endpoint)[0];
      expect(generationUnitPrice(null, model, mode, '2K')).toBeNull();
      expect(model.priceTextByMode[mode].default).toContain('移动云');
    }
    expect(canvasAgentModels(models)).toHaveLength(10);
    const glm = models.find((model) => model.name === 'GLM-5.3-Flash · 移动云');
    expect(textModelConnection(glm, config)).toEqual({ url: ECLOUD_ENDPOINTS.text, apiKey: key });
    expect(() => textModelConnection(glm, { ZHIPU_API_KEY: key })).toThrow();
    // Exercise the actual HTTP recovery route: it must forward the persisted resolution.
    const reference = remoteTaskReference({
      taskId: 'saved-2k-task',
      providerName: 'EcloudVideoProvider',
      modelId: 'minimax/minimax-h3',
      submitUrl: 'https://moma.cmecloud.cn/v1/videos',
      queryUrl: 'https://moma.cmecloud.cn/v1/videos/',
      apiKey: key,
    });
    const persisted = {
      nodeId: 'video-2k',
      attemptId: 'attempt-2k',
      kind: 'video',
      providerName: 'EcloudVideoProvider',
      modelName: 'MiniMax-H3 · 移动云',
      resolution: '2K',
      videoMode: 'text-to-video',
      status: 'unknown',
      code: 'GENERATION_INTERRUPTED',
      remoteTask: reference,
    };
    const fetcher = vi.fn(async () =>
      json({ task: { id: 'saved-2k-task', model: 'MiniMax-H3', status: 'running' } }),
    );
    vi.spyOn(BaseProvider, 'fetch', 'get').mockReturnValue(fetcher);
    const app = express();
    app.use(
      createGenerationRouter({
        generationCoordinator: { getTask: () => persisted },
        mediaService: { findLatest: async () => null },
      }),
    );
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}/generation-status/video-2k`,
      );
      expect(await response.json()).toMatchObject({ status: 'unknown', recoveryPending: true });
      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher.mock.calls[0][0]).toBe('https://moma.cmecloud.cn/v1/videos/saved-2k-task');
      expect(fetcher.mock.calls[0][1].method).toBe('GET');
      expect(fetcher.mock.calls[0][1].headers['X-Model-Name']).toBe('minimax/minimax-h3');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    const model = models.find((model) => model.provider === 'EcloudTextProvider');
    expect(textModelConnection(model, config)).toEqual({ url: ECLOUD_ENDPOINTS.text, apiKey: key });
    expect(modelParameters({ enable_thinking: 'true' }, model).enable_thinking).toBe(true);
    expect(() => textModelConnection(model, { OPENAI_API_KEY: key })).toThrow();
    await host.unload('provider.ecloud');
    expect(
      host.services
        .get('generation.providers')
        .list()
        .some((p) => p.name === 'EcloudTextProvider'),
    ).toBe(false);
    expect(
      buildSourceSettings({ readSecret: () => key })
        .find((block) => block.source === 'ecloud')
        .media.every((media) => media.models.every((model) => !model.configured)),
    ).toBe(true);
    await host.load('provider.ecloud');
    expect(
      host.services
        .get('generation.providers')
        .list()
        .some((p) => p.name === 'EcloudTextProvider'),
    ).toBe(true);
  } finally {
    await host?.stop();
    await rm(root, { recursive: true, force: true });
  }
});

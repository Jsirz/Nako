import { describe, expect, it, vi } from 'vitest';
import './helpers/modelCatalog.js';
import { useServerCapabilities } from './helpers/serverCapabilities.js';
useServerCapabilities({ media: true });
import { createWorkFisherHandlers } from '../plugins/providers/work-fisher/implementation.js';
import { MODEL_DEFINITIONS } from '../plugins/providers/work-fisher/protocol.js';
import { connection } from '../plugins/providers/work-fisher/connection.js';
import { applyModelIdOverrides } from '../modules/generation-core/server/config/modelCatalog.js';
import { modelOverrideKey } from '../modules/contracts/shared/modelOverrideKey.js';
import { createModelCatalog } from '../modules/generation-core/server/config/modelCatalog.js';
import { buildSourceSettings } from '../modules/generation-core/server/generation/modelAvailability.js';
import { canvasAgentModels } from '../modules/agent/ui/agent/canvasAgentModels.ts';

const key = 'sk-fixture123456789';
const mp4 = Buffer.from([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115, 111, 109,
]);
const mp3 = Buffer.from('ID3fixture');
const json = (value, status = 200) => Response.json(value, { status });
describe('Work-Fisher provider', () => {
  it('publishes fixed upstream models without discovery or caller-defined model IDs', () => {
    expect(MODEL_DEFINITIONS).toHaveLength(55);
    expect(MODEL_DEFINITIONS.filter((model) => model.selectable !== false)).toHaveLength(52);
    expect(
      Object.fromEntries(
        Object.entries(Object.groupBy(MODEL_DEFINITIONS, (model) => model.kind)).map(
          ([kind, models]) => [kind, models.length],
        ),
      ),
    ).toEqual({ text: 9, image: 17, video: 24, audio: 5 });
    expect(createWorkFisherHandlers().WorkFisherVideoProvider).not.toHaveProperty('listModels');
    expect(MODEL_DEFINITIONS.map((model) => model.name)).toEqual(
      expect.arrayContaining([
        '豆包 Seed Evolving · Work-Fisher',
        'GPT Image 2.5 · Work-Fisher Flare',
        'MiniMax H3 · Work-Fisher',
        'Suno Generation · Work-Fisher',
      ]),
    );
    expect(
      MODEL_DEFINITIONS.some((model) => 'priceTextByMode' in model || 'costByMode' in model),
    ).toBe(false);
    expect(MODEL_DEFINITIONS.every((model) => model.modelIdOverride === false)).toBe(true);
    const fixed = {
      source: 'work_fisher',
      modelIdOverride: false,
      endpoint: { generation: { url: 'https://api.work-fisher.com/v1/videos', model: 'fixed-id' } },
    };
    expect(
      applyModelIdOverrides(
        { fixed },
        { [modelOverrideKey('fixed')]: 'caller-defined-id' },
      ).fixed,
    ).toEqual(fixed);
    expect(() =>
      connection(
        'video',
        { videoModel: 'not-in-catalog', url: 'https://api.work-fisher.com/v1/videos' },
        { WORK_FISHER_API_KEY: key },
      ),
    ).toThrow();
    expect(() => connection('video', {}, {})).toThrow(/API Key/);
  });

  it('submits one selected video model, records its receipt and polls without replaying', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ id: 'task-test', status: 'queued' }))
      .mockResolvedValueOnce(json({ id: 'task-test', status: 'in_progress' }))
      .mockResolvedValueOnce(
        json({
          id: 'task-test',
          status: 'completed',
          metadata: { url: 'https://media.example.test/result.mp4' },
        }),
      )
      .mockResolvedValueOnce(new Response(mp4));
    const submitted = vi.fn(),
      submitting = vi.fn(),
      wait = vi.fn(async () => {});
    const result = await createWorkFisherHandlers({
      fetcher,
      wait,
    }).WorkFisherVideoProvider.generateVideo(
      {
        videoModel: 'seedance-2.0-standard-t2v',
        videoMode: 'text-to-video',
        url: 'https://api.work-fisher.com/v1/videos',
        prompt: 'cinematic lake',
        resolution: '720p',
        aspectRatio: '16:9',
        duration: 5,
      },
      {
        WORK_FISHER_API_KEY: key,
        generationTaskSubmitting: submitting,
        generationTaskSubmitted: submitted,
      },
    );
    expect(result).toEqual({ buffer: mp4, format: 'mp4' });
    expect(submitting).toHaveBeenCalledOnce();
    expect(submitted).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      model: 'seedance-2.0-standard-t2v',
      prompt: 'cinematic lake',
      seconds: '5',
    });
  });

  it('recovers an uncertain submission from X-Task-Id without submitting again', async () => {
    const uncertain = new Response('{"ignored":true}', {
      headers: { 'content-length': String(4 * 1024 * 1024 + 1), 'x-task-id': 'task-header' },
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(uncertain)
      .mockResolvedValueOnce(
        json({
          id: 'task-header',
          status: 'completed',
          metadata: { url: 'https://media.example.test/result.mp4' },
        }),
      )
      .mockResolvedValueOnce(new Response(mp4));
    const submitted = vi.fn();
    await createWorkFisherHandlers({
      fetcher,
      wait: async () => {},
    }).WorkFisherVideoProvider.generateVideo(
      {
        videoModel: 'seedance-2.0-standard-t2v',
        videoMode: 'text-to-video',
        url: 'https://api.work-fisher.com/v1/videos',
        prompt: 'test',
      },
      { WORK_FISHER_API_KEY: key, generationTaskSubmitted: submitted },
    );
    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-header' }), 0);
    expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  });

  it('stops polling immediately when task-query credentials are rejected', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ id: 'task-auth' }))
      .mockResolvedValueOnce(json({ error: { message: 'secret upstream message' } }, 401));
    const action = createWorkFisherHandlers({
      fetcher,
      wait: async () => {},
    }).WorkFisherVideoProvider.generateVideo(
      {
        videoModel: 'seedance-2.0-standard-t2v',
        videoMode: 'text-to-video',
        url: 'https://api.work-fisher.com/v1/videos',
        prompt: 'test',
      },
      { WORK_FISHER_API_KEY: key },
    );
    await expect(action).rejects.toThrow(/API Key/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses the fixed audio catalog and downloads the completed task result', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ task_id: 'audio-task' }))
      .mockResolvedValueOnce(
        json({
          task_id: 'audio-task',
          data: {
            status: 'SUCCESS',
            data: { content: { audio_url: 'https://media.example.test/result.mp3' } },
          },
        }),
      )
      .mockResolvedValueOnce(new Response(mp3));
    const result = await createWorkFisherHandlers({
      fetcher,
      wait: async () => {},
    }).WorkFisherAudioProvider.generateAudio(
      {
        audioModel: 'qwen3-tts-flash',
        audioMode: 'text-to-speech',
        url: 'https://api.work-fisher.com/v1/audio/generations',
        prompt: '测试语音',
        format: 'mp3',
      },
      { WORK_FISHER_API_KEY: key },
    );
    expect(result).toEqual({ buffer: mp3, format: 'mp3' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      model: 'qwen3-tts-flash',
      metadata: { voice: 'Cherry', language_type: 'Auto' },
    });
  });

  it('publishes the four requested chat presets as visual models and sends image content', async () => {
    const expected = [
      ['GM 3.8 Flash · Work-Fisher', 'workfisher/gm-3.8-flash'],
      ['GPT-6 Astra · Work-Fisher', 'workfisher/g6-astra'],
      ['GPT-6 Sol · Work-Fisher', 'workfisher/g6-sol'],
      ['GPT-6 Luna · Work-Fisher', 'workfisher/g6-luna'],
    ];
    const definitions = expected.map(([name]) => MODEL_DEFINITIONS.find((model) => model.name === name));
    expect(definitions.every((model) => model?.supportedReferenceTypes.includes('image'))).toBe(true);
    expect(definitions.map((model) => model.endpoint['multimodal-chat'].model))
      .toEqual(expected.map(([, id]) => id));
    expect(canvasAgentModels(definitions).every((model) => model.vision === 'supported')).toBe(true);
    const catalog = createModelCatalog({ text: definitions });
    const source = buildSourceSettings({
      catalog,
      readSecret: () => key,
    })[0];
    expect(source.media[0].models.every((model) => model.vision === 'supported')).toBe(true);

    const submitChat = vi.fn(async (request) => request.body);
    const result = await createWorkFisherHandlers({ submitChat }).WorkFisherTextProvider.generateText(
      {
        textModel: 'workfisher/g6-astra',
        languageMode: 'multimodal-chat',
        url: 'https://api.work-fisher.com/v1/chat/completions',
        prompt: '描述图片',
        images: ['https://media.example.test/reference.png'],
      },
      { WORK_FISHER_API_KEY: key },
    );
    expect(result).toMatchObject({
      model: 'workfisher/g6-astra',
      messages: [{ content: [
        { type: 'text', text: '描述图片' },
        { type: 'image_url', image_url: { url: 'https://media.example.test/reference.png' } },
      ] }],
    });
  });
});

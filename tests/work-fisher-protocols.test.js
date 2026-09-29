import { expect, it, vi } from 'vitest';
import { createWorkFisherHandlers } from '../plugins/providers/work-fisher/implementation.js';
import { connection } from '../plugins/providers/work-fisher/connection.js';
import { videoBody } from '../plugins/providers/work-fisher/requests.js';
import { validateInputs } from '../plugins/providers/work-fisher/validation.js';
import { remoteTaskReference } from '../modules/generation-core/server/generation/generationTaskRecovery.js';

const config = { WORK_FISHER_API_KEY: 'sk-fixture123456789' };
const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const audio = Buffer.from('ID3fixture');
const imageParams = {
  imageModel: 'workfisher-image-g-v2.5-flare',
  imageMode: 'text-to-image',
  url: 'https://api.work-fisher.com/v1/image/generations',
  prompt: 'fixture',
  resolution: '1K',
  aspectRatio: '1:1',
  generateCount: 2,
};
const completedImage = (id, urls) =>
  Response.json({
    data: { task_id: id, status: 'SUCCESS', data: { content: { image_urls: urls } } },
  });

it('keeps multiple image outputs from one task without buying extra tasks and recovers the same batch', async () => {
  const urls = ['https://media.example.test/a.png', 'https://media.example.test/b.png'];
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ task_id: 'task-image' }))
    .mockResolvedValueOnce(completedImage('task-image', urls))
    .mockResolvedValueOnce(new Response(image))
    .mockResolvedValueOnce(new Response(image));
  const receipt = vi.fn();
  const provider = createWorkFisherHandlers({
    fetcher,
    wait: async () => {},
  }).WorkFisherImageProvider;
  expect(
    await provider.generateImage(imageParams, { ...config, generationTaskSubmitted: receipt }),
  ).toHaveLength(2);
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    model: imageParams.imageModel,
    n: 1,
    resolution: '1k',
    size: '1:1',
    quality: 'low',
    output_format: 'png',
  });
  const reference = receipt.mock.calls[0][0];
  fetcher
    .mockClear()
    .mockResolvedValueOnce(completedImage('task-image', urls))
    .mockResolvedValueOnce(new Response(image))
    .mockResolvedValueOnce(new Response(image));
  const recovered = await provider.recoverImage(
    { requestedCount: 2, remoteSubmissionCount: 1, remoteTasks: [reference] },
    imageParams,
    config,
  );
  expect(recovered.status).toBe('success');
  expect(recovered.results).toHaveLength(2);
  expect(fetcher.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
  expect(
    provider.canRecoverImage(reference, imageParams, { WORK_FISHER_API_KEY: 'different' }),
  ).toBe(false);
});

it('submits Midjourney once and retains requested candidates', async () => {
  const urls = Array.from({ length: 4 }, (_, i) => 'https://media.example.test/' + i + '.png');
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ data: [{ task_id: 'task-mj' }] }))
    .mockResolvedValueOnce(Response.json({ id: 'task-mj', status: 'SUCCESS', image_urls: urls }));
  urls.forEach(() => fetcher.mockResolvedValueOnce(new Response(image)));
  const result = await createWorkFisherHandlers({
    fetcher,
    wait: async () => {},
  }).WorkFisherImageProvider.generateImage(
    {
      imageModel: 'midjourney-imagine',
      imageMode: 'text-to-image',
      url: 'https://api.work-fisher.com/v1/midjourney/generations',
      prompt: 'landscape',
      generateCount: 2,
    },
    config,
  );
  expect(result).toHaveLength(2);
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  expect(fetcher.mock.calls[1][0]).toBe('https://api.work-fisher.com/v1/midjourney/tasks/task-mj');
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body).toMatchObject({ version: '8.2', speed: 'fast', quality: '1' });
  expect(body).not.toHaveProperty('generateCount');
});

it('uses Suno task envelopes and returns every audio track', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ code: 200, data: [{ task_id: 'task-music' }] }))
    .mockResolvedValueOnce(
      Response.json({
        data: {
          id: 'task-music',
          status: 'completed',
          result: {
            music: [
              { audio_url: 'https://media.example.test/a.mp3' },
              { audio_url: 'https://media.example.test/b.mp3' },
            ],
          },
        },
      }),
    )
    .mockResolvedValueOnce(new Response(audio))
    .mockResolvedValueOnce(new Response(audio));
  const result = await createWorkFisherHandlers({
    fetcher,
    wait: async () => {},
  }).WorkFisherAudioProvider.generateAudio(
    {
      audioModel: 'suno-generation',
      audioMode: 'music-generation',
      url: 'https://api.work-fisher.com/v1/music/generations',
      prompt: 'piano',
      instrumental: 'true',
    },
    config,
  );
  expect(result).toHaveLength(2);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    model: 'suno',
    version: 'v5',
    instrumental: true,
    custom: false,
  });
  expect(fetcher.mock.calls[1][0]).toBe('https://api.work-fisher.com/v1/music/tasks/task-music');
});

it('encodes reference video modes and rejects unconfigured paths before any upload', () => {
  const params = {
    videoModel: 'seedance-2.5-standard-multi',
    videoMode: 'multimodal',
    url: 'https://api.work-fisher.com/v1/videos',
    prompt: 'test',
    duration: 8,
  };
  const ctx = connection('video', params, config);
  const media = {
    images: ['https://media.example.test/a.png'],
    videos: ['https://media.example.test/b.mp4'],
    audios: [],
  };
  const body = videoBody(params, ctx, media);
  expect(body).not.toHaveProperty('images');
  expect(body.metadata.content).toHaveLength(2);
  expect(body.seconds).toBe('8');
  expect(() =>
    connection('video', { ...params, url: 'https://other.example.test/v1/videos' }, config),
  ).toThrow();
  const v = {
    ...params,
    videoModel: 'minimax-h3-ow-i2v-fast',
    videoMode: 'first-frame',
    images: ['a', 'b'],
  };
  expect(() => validateInputs('video', v, connection('video', v, config))).toThrow();
});

it('refuses to recover a receipt when the task response identifies another task', async () => {
  const params = {
    videoModel: 'seedance-2.0-standard-t2v',
    videoMode: 'text-to-video',
    url: 'https://api.work-fisher.com/v1/videos',
  };
  const ctx = connection('video', params, config);
  const reference = remoteTaskReference({ ...ctx, taskId: 'task-expected' });
  const fetcher = vi.fn(async () =>
    Response.json({
      id: 'task-other',
      status: 'completed',
      metadata: { url: 'https://media.example.test/a.mp4' },
    }),
  );
  const result = await createWorkFisherHandlers({ fetcher }).WorkFisherVideoProvider.recoverVideo(
    reference,
    params,
    config,
  );
  expect(result).toEqual({ status: 'unknown', reason: 'task_mismatch' });
  expect(fetcher).toHaveBeenCalledOnce();
});

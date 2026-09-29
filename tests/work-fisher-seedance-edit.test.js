import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createWorkFisherHandlers } from '../plugins/providers/work-fisher/implementation.js';

const probe = vi.hoisted(() => vi.fn());
vi.mock('../modules/asset-media/api/server/media/mediaMetadataProbe.js', () => ({ createMediaMetadataProbe: () => probe }));
const root = 'https://api.work-fisher.com';
const videoUrl = 'https://media.example.test/reference.mp4';
const imageUrl = 'https://media.example.test/character.png';
const mp4 = Buffer.from([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109]);
let directory, config;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'nako-seedance-edit-'));
  config = { WORK_FISHER_API_KEY: 'fixture-key', LIBRARY_DIR: directory };
  await mkdir(path.join(directory, 'media', 'p', 'videos'), { recursive: true });
  await writeFile(path.join(directory, 'media', 'p', 'videos', 'input.mp4'), mp4);
  probe.mockReset().mockResolvedValue({ duration: 10 });
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
const params = (overrides = {}) => ({
  projectId: 'p', prompt: 'replace the cat with the reference character',
  videoMode: 'video-edit', videoModel: 'seedance-2.5-standard-multi', url: root + '/v1/videos',
  videos: ['/library/media/p/videos/input.mp4'], images: [imageUrl],
  aspectRatio: '1:1', duration: 5, resolution: '480p', ...overrides,
});
function mockApi({ failed = false } = {}) {
  return vi.fn(async (url, options) => {
    if (url.endsWith('/files/upload')) return Response.json({ url: videoUrl });
    if (options.method === 'POST') return Response.json({ id: 'task-edit' });
    if (url.startsWith(root)) return Response.json(failed
      ? { id: 'task-edit', status: 'failed', error: { message: 'video editing requires ratio adaptive and duration -1; secret-token' } }
      : { id: 'task-edit', status: 'completed', metadata: { url: 'https://media.example.test/result.mp4' } });
    return new Response(mp4);
  });
}
function run(fetcher, request = params()) {
  return createWorkFisherHandlers({ fetcher, wait: async () => {} }).WorkFisherVideoProvider.generateVideo(request, config);
}
const submitted = fetcher => JSON.parse(fetcher.mock.calls.find(([url, options]) => url === root + '/v1/videos' && options.method === 'POST')[1].body);

describe('Seedance 2.5 explicit video editing', () => {
  it.each(['seedance-2.5-standard-multi', 'seedance-2.5-global-standard-multi'])('uploads video then submits adaptive editing for %s', async videoModel => {
    const fetcher = mockApi();
    await expect(run(fetcher, params({ videoModel }))).resolves.toEqual({ buffer: mp4, format: 'mp4' });
    expect(probe).toHaveBeenCalledWith(path.join(directory, 'media', 'p', 'videos', 'input.mp4'), 'videos');
    expect(fetcher.mock.calls.slice(0, 2).map(([url]) => url)).toEqual([root + '/v1/files/upload', root + '/v1/videos']);
    const body = submitted(fetcher);
    expect(body).toMatchObject({ model: videoModel, metadata: { ratio: 'adaptive', duration: -1, resolution: '480p', content: [
      { type: 'image_url', image_url: { url: imageUrl } },
      { type: 'video_url', video_url: { url: videoUrl } },
    ] } });
    expect(body).not.toHaveProperty('seconds');
    expect(body.metadata).not.toHaveProperty('video_url');
  });
  it.each([4, 30])('accepts the %s-second boundary and the canvas duration sentinel', async duration => {
    probe.mockResolvedValue({ duration });
    const fetcher = mockApi();
    await run(fetcher, params({ duration: -1, aspectRatio: 'adaptive' }));
    expect(submitted(fetcher).metadata.duration).toBe(-1);
  });
  it.each([3.99, 30.01, NaN, undefined])('rejects invalid local duration %s before uploading or generating', async duration => {
    probe.mockResolvedValue({ duration });
    const fetcher = mockApi();
    await expect(run(fetcher)).rejects.toMatchObject({ status: 400, message: expect.stringContaining('4～30') });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires a video and rejects multiple editing videos', async () => {
    const fetcher = mockApi();
    await expect(run(fetcher, params({ videos: [] }))).rejects.toThrow('需要参考视频');
    await expect(run(fetcher, params({ videos: [videoUrl, videoUrl] }))).rejects.toThrow('数量');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps normal multimodal timing and ratio, without applying editing duration limits', async () => {
    probe.mockResolvedValue({ duration: 3 });
    const fetcher = mockApi();
    await run(fetcher, params({ videoMode: 'multimodal' }));
    expect(submitted(fetcher)).toMatchObject({ seconds: '5', metadata: { ratio: '1:1' } });
    expect(submitted(fetcher).metadata).not.toHaveProperty('duration');
    expect(probe).not.toHaveBeenCalled();
    await expect(run(fetcher, params({ videoMode: 'multimodal', duration: -1 }))).rejects.toThrow('时长');
  });
  it('uses a public reference without downloading or probing it locally', async () => {
    const fetcher = mockApi();
    await run(fetcher, params({ videos: [videoUrl] }));
    expect(probe).not.toHaveBeenCalled();
    expect(fetcher.mock.calls[0][0]).toBe(root + '/v1/videos');
  });
  it('explains upstream editing classification without leaking response text or resubmitting', async () => {
    const fetcher = mockApi({ failed: true });
    await expect(run(fetcher, params({ videoMode: 'multimodal', videos: [videoUrl] }))).rejects.toMatchObject({
      providerTaskFailed: true, message: expect.stringContaining('请选择“视频编辑”模式'),
    });
    expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  });
});

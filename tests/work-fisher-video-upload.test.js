import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, truncate } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createWorkFisherHandlers } from '../plugins/providers/work-fisher/implementation.js';
import { uploadInput } from '../plugins/providers/work-fisher/media.js';

const root = 'https://api.work-fisher.com';
const mp4 = Buffer.from([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109]);
const remote = 'https://media.example.test/reference.mp4?signature=temporary';
let directory, config;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'nako-video-upload-'));
  config = { WORK_FISHER_API_KEY: 'fixture-key', LIBRARY_DIR: directory };
  await mkdir(path.join(directory, 'media', 'p', 'videos'), { recursive: true });
  await writeFile(path.join(directory, 'media', 'p', 'videos', 'input.mp4'), mp4);
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
const params = mode => ({ projectId: 'p', prompt: 'change the sky', videoMode: mode,
  videoModel: mode === 'video-edit' ? 'workfisher-video-g-omni-flash' : 'seedance-2.0-standard-multi',
  url: root + '/v1/videos', videos: ['/library/media/p/videos/input.mp4'], duration: 5 });

describe('Work-Fisher local video references', () => {
  it.each(['video-edit', 'multimodal'])('uploads once before submitting %s using the temporary URL', async mode => {
    const fetcher = vi.fn(async (url, options) => {
      if (url.endsWith('/files/upload')) {
        expect(options.headers.Authorization).toBe('Bearer fixture-key');
        expect(options.headers).not.toHaveProperty('Content-Type');
        const file = options.body.get('file');
        expect(file.name).toBe('input.mp4'); expect(file.type).toBe('video/mp4');
        expect(Buffer.from(await file.arrayBuffer())).toEqual(mp4);
        return Response.json({ url: remote, file_type: 'video', size: mp4.length, expires_in: 86400 });
      }
      if (options.method === 'POST') {
        const body = JSON.parse(options.body);
        if (mode === 'video-edit') {
          expect(body.metadata.video_url).toBe(remote);
          expect(body).not.toHaveProperty('seconds');
        } else {
          expect(body.metadata.content).toEqual([{ type: 'video_url', video_url: { url: remote } }]);
          expect(body.seconds).toBe('5');
        }
        expect(options.body).not.toContain('/library/');
        return Response.json({ id: 'task-video' });
      }
      if (url.startsWith(root)) return Response.json({ id: 'task-video', status: 'completed', metadata: { url: 'https://media.example.test/result.mp4' } });
      expect(options.headers?.Authorization).toBeUndefined();
      return new Response(mp4);
    });
    const result = await createWorkFisherHandlers({ fetcher, wait: async () => {} }).WorkFisherVideoProvider.generateVideo(params(mode), config);
    expect(result).toEqual({ buffer: mp4, format: 'mp4' });
    expect(fetcher.mock.calls.slice(0, 2).map(([url]) => url)).toEqual([root + '/v1/files/upload', root + '/v1/videos']);
    expect(fetcher.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(2);
  });

  it.each(['avi', 'mov', 'mkv'])('accepts the documented %s upload format', async extension => {
    await writeFile(path.join(directory, 'media', 'p', 'videos', 'input.' + extension), mp4);
    const client = vi.fn(async () => ({ url: remote }));
    expect(await uploadInput('/library/media/p/videos/input.' + extension, 'video', params('video-edit'), config, client)).toBe(remote);
    expect(client.mock.calls[0][1].form.get('file').name).toBe('input.' + extension);
  });

  it('rejects cross-project, oversized and unsupported inputs before uploading', async () => {
    const client = vi.fn();
    await expect(uploadInput('/library/media/other/videos/input.mp4', 'video', params('video-edit'), config, client)).rejects.toThrow('当前项目');
    await writeFile(path.join(directory, 'media', 'p', 'videos', 'input.webm'), mp4);
    await expect(uploadInput('/library/media/p/videos/input.webm', 'video', params('video-edit'), config, client)).rejects.toThrow('格式不支持');
    await truncate(path.join(directory, 'media', 'p', 'videos', 'input.mp4'), 50 * 1024 * 1024 + 1);
    await expect(uploadInput(params('video-edit').videos[0], 'video', params('video-edit'), config, client)).rejects.toThrow('50 MB');
    expect(client).not.toHaveBeenCalled();
  });

  it.each([429, 503])('never submits a generation task after an upload HTTP %s failure', async status => {
    const fetcher = vi.fn(async () => Response.json({ error: 'upload failed' }, { status }));
    await expect(createWorkFisherHandlers({ fetcher }).WorkFisherVideoProvider.generateVideo(params('video-edit'), config)).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(root + '/v1/files/upload');
  });

  it('uses an existing public URL without uploading it', async () => {
    const client = vi.fn();
    expect(await uploadInput(remote, 'video', params('video-edit'), config, client)).toBe(remote);
    expect(client).not.toHaveBeenCalled();
  });
});

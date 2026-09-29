// @vitest-environment jsdom
import { it, expect } from 'vitest';
import { readAgentImage } from '../modules/agent/ui/agent/canvasAgentAttachments.ts';

it('preserves image MIME in the canonical attachment URL without emitting a second representation', async () => {
  const image = new Blob(['fixture'], { type: 'image/webp' });
  const reference = await readAgentImage(image, new AbortController().signal);
  expect(reference).toEqual({ url: 'data:image/webp;base64,Zml4dHVyZQ==' });
});

it('rejects an aborted image read before fetching the source', async () => {
  const controller = new AbortController();
  controller.abort();
  let fetched = false;
  await expect(readAgentImage('/library/media/project/images/test.png', controller.signal, async () => { fetched = true; })).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetched).toBe(false);
});

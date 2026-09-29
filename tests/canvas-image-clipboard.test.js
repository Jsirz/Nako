import { expect, it, vi } from 'vitest';
import { copyCanvasImageToSystemClipboard } from '../modules/canvas-ui/ui/canvas/canvasImageClipboard';

it('writes a project PNG to the operating-system clipboard', async () => {
  const createItem = vi.fn((items) => ({ items }));
  const write = vi.fn(async () => {});
  await copyCanvasImageToSystemClipboard('/library/media/project/images/image.png', {
    fetch: vi.fn(async () => new Response(new Blob(['png'], { type: 'image/png' }), { status: 200 })),
    createItem,
    write,
  });

  expect(createItem).toHaveBeenCalledOnce();
  expect(createItem.mock.calls[0][0]['image/png']).toBeInstanceOf(Blob);
  expect(write).toHaveBeenCalledWith([{ items: createItem.mock.calls[0][0] }]);
});

it('rejects a non-image response before writing the clipboard', async () => {
  const write = vi.fn();
  await expect(
    copyCanvasImageToSystemClipboard('/library/media/project/images/bad.bin', {
      fetch: vi.fn(async () => new Response(new Blob(['bad'], { type: 'application/octet-stream' }), { status: 200 })),
      createItem: vi.fn(),
      write,
    }),
  ).rejects.toThrow('不是可复制的图片');
  expect(write).not.toHaveBeenCalled();
});

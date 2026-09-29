import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { NODE_ERROR, nodeError } from '../../../modules/contracts/nodeExecution.js';

export function createImageComposer({ libraryDirectory, store }) {
  return async ({ projectId, images, columns = 2, cellWidth = 768, signal }) => {
    if (!/^[\w-]{1,128}$/.test(projectId) || !Array.isArray(images) || images.length < 1 || images.length > 16)
      throw nodeError(NODE_ERROR.INVALID, '拼图需要 1–16 张当前项目图片');
    if (!Number.isInteger(columns) || columns < 1 || columns > 4 || !Number.isInteger(cellWidth) || cellWidth < 64 || cellWidth > 1024)
      throw nodeError(NODE_ERROR.INVALID, '拼图参数超出限制');
    const root = await fs.realpath(path.join(libraryDirectory, 'media', projectId, 'images'));
    const layers = [];
    for (const [index, image] of images.entries()) {
      signal?.throwIfAborted();
      const prefix = `/library/media/${projectId}/images/`, url = decodeURIComponent(String(image.url || image).split('?')[0]);
      if (!url.startsWith(prefix) || !/^[a-zA-Z0-9_ .-]+$/.test(url.slice(prefix.length))) throw nodeError(NODE_ERROR.DENIED, '拼图图片超出项目范围');
      const file = await fs.realpath(path.join(root, url.slice(prefix.length)));
      if (path.dirname(file).toLowerCase() !== root.toLowerCase()) throw nodeError(NODE_ERROR.DENIED, '拼图图片超出项目范围');
      const input = await sharp(file, { limitInputPixels: 32 * 1024 * 1024 }).resize(cellWidth, cellWidth, { fit: 'contain', background: '#111111' }).png().toBuffer();
      layers.push({ input, left: index % columns * cellWidth, top: Math.floor(index / columns) * cellWidth });
    }
    signal?.throwIfAborted();
    const data = await sharp({ create: { width: columns * cellWidth, height: Math.ceil(images.length / columns) * cellWidth, channels: 4, background: '#111111' } }).composite(layers).png().toBuffer();
    signal?.throwIfAborted();
    return store.save({ projectId, type: 'image', data, name: 'composition.png' });
  };
}

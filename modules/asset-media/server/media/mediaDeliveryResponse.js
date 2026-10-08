import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/** HTTP translation over a path-free storage delivery. */
export async function sendMediaDelivery(request, response, delivery, { immutable = false } = {}) {
  try {
    response.set({
      'Content-Type': delivery.contentType,
      'Content-Length': delivery.byteLength,
      'Accept-Ranges': 'bytes',
      'ETag': delivery.etag,
      'Last-Modified': delivery.lastModified,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.fresh) { response.status(304).end(); return; }
    const ifRange = request.get('if-range');
    const rangeAllowed = !ifRange || (ifRange.startsWith('"')
      ? !delivery.etag.startsWith('W/') && ifRange === delivery.etag
      : Date.parse(ifRange) >= Date.parse(delivery.lastModified));
    const ranges = rangeAllowed && request.range(delivery.byteLength, { combine: true });
    if (ranges === -1) {
      response.removeHeader('Content-Length');
      response.set('Content-Range', `bytes */${delivery.byteLength}`).status(416).end();
      return;
    }
    const range = ranges?.type === 'bytes' && ranges.length === 1 ? ranges[0] : undefined;
    if (range) {
      response.status(206).set({
        'Content-Range': `bytes ${range.start}-${range.end}/${delivery.byteLength}`,
        'Content-Length': range.end - range.start + 1,
      });
    }
    if (request.method === 'HEAD' || !delivery.byteLength) { response.end(); return; }
    await pipeline(Readable.from(delivery.read(range)), response);
  } finally {
    await delivery.close();
  }
}

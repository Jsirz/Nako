import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { canvasEditing, mediaCanvas } from '../../../kernel/browser';
import type { CanvasNode } from '../../../contracts/canvasDocument';
import type { createCanvasControlExecutor } from './canvasControlExecutor';
import { validCanvasControl, projectCanvasResult, type CanvasActionHandler, type CanvasActionRequest, type CanvasResult } from '../../../contracts/canvasControlProtocol.js';

function localMedia(url: unknown, projectId: string, type?: string): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const expected = `/library/media/${encodeURIComponent(projectId)}/`;
    if (!parsed.pathname.startsWith(expected)) return null;
    const tail = parsed.pathname.slice(expected.length).split('/');
    if (tail.length !== 2 || !['images', 'videos', 'audios'].includes(tail[0]) || type && tail[0] !== type) return null;
    const filename = decodeURIComponent(tail[1]);
    if (!filename || filename === '.' || filename === '..' || /[\\/\0]/.test(filename)) return null;
    return parsed.pathname;
  } catch { return null; }
}
export async function canvasImagePreview(url: string, signal: AbortSignal | undefined, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(url, { signal });
  if (!response.ok) throw new AgentOperationError('Image unavailable', { operation: 'canvas-image-preview', status: response.status });
  if (Number(response.headers.get('content-length')) > 25 * 1024 * 1024) throw new AgentOperationError('Image too large', { operation: 'canvas-image-preview', reason: 'content-length' });
  const reader = response.body?.getReader(), chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  if (!reader) throw new AgentOperationError('Image unavailable', { operation: 'canvas-image-preview', reason: 'missing-body' });
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 25 * 1024 * 1024) throw new AgentOperationError('Image too large', { operation: 'canvas-image-preview', reason: 'body-limit' });
      chunks.push(new Uint8Array(chunk.value));
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const blob = new Blob(chunks, { type: response.headers.get('content-type') || '' });
  if (blob.size > 25 * 1024 * 1024 || !blob.type.startsWith('image/')) throw new AgentOperationError('Image too large', { operation: 'canvas-image-preview', reason: 'invalid-blob' });
  const bitmap = await createImageBitmap(blob);
  try {
    if (signal?.aborted || bitmap.width * bitmap.height > 64000000) throw new AgentOperationError('Image unavailable', { operation: 'canvas-image-preview', reason: 'bitmap-limit-or-abort' });
    const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new AgentOperationError('Image unavailable', { operation: 'canvas-image-preview', reason: 'missing-context' });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } finally { bitmap.close(); }
}
export function createCanvasMediaControl(
  execute: CanvasActionHandler,
  insert: ReturnType<typeof createCanvasControlExecutor>,
  getRuntime: () => { projectId: string; nodes(): CanvasNode[] } | null,
  fetcher: typeof fetch = globalThis.fetch,
  preview = canvasImagePreview,
): CanvasActionHandler {
  const receipts = new Map<string, { signature: string; promise: Promise<CanvasResult> }>();
  async function handle(request: CanvasActionRequest, signal?: AbortSignal): Promise<CanvasResult> {
    const command = request.command;
    if (command.action !== 'media') return { ok: false, code: 'INVALID' };
    const active = () => !signal?.aborted && Date.now() < request.expiresAt && getRuntime()?.projectId === request.projectId;
    if (!active()) return { ok: false, code: 'UNAVAILABLE' };
    const prior = insert(request);
    if (prior.ok || prior.code !== 'UNAVAILABLE') return prior;
    const read = () => execute({ ...request, requestId: crypto.randomUUID(), command: { action: 'read' } });
    const before = await read();
    if (!before.ok || before.revision !== command.revision) return { ok: false, code: 'CONFLICT' };
    const node = getRuntime()!.nodes().find(node => node.id === command.nodeId);
    if (!node) return { ok: false, code: 'NOT_FOUND' };
    const type = command.operation === 'inspect' ? (String(node.type).toLowerCase().includes('video') ? 'videos' : 'audios') : ['trimVideo', 'frames'].includes(command.operation) ? 'videos' : command.operation === 'trimAudio' ? 'audios' : 'images';
    const source = localMedia(node.resultUrl, request.projectId, type);
    if (!source || node.status === 'loading' || node.mediaOperationId) return { ok: false, code: 'UNAVAILABLE' };
    try {
      if (command.operation === 'inspect') {
        const response = await fetcher('/api/agent/v2/tools/inspect-media', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: request.projectId, url: source, type: type === 'videos' ? 'video' : 'audio', times: command.times, speech: command.speech }) });
        if (!response.ok || !active()) return { ok: false, code: 'UNAVAILABLE' };
        const report = await response.json();
        return projectCanvasResult({ ok: true, revision: before.revision,
          analysis: JSON.stringify({ duration: report.duration, width: report.width, height: report.height, channels: report.channels, speechStatus: report.speechStatus, transcript: report.transcript, frameTimes: report.frames.map((frame: {time:number}) => frame.time) }),
          images: report.frames.map((frame: {dataUrl:string}) => ({ nodeId: node.id, dataUrl: frame.dataUrl })) });
      }
      if (command.operation === 'view') {
        const dataUrl = await preview(source, signal, fetcher), after = await read();
        if (!active() || !after.ok || after.revision !== command.revision) return { ok: false, code: 'CONFLICT' };
        return projectCanvasResult({ ok: true, revision: after.revision, images: [{ nodeId: node.id, dataUrl }] });
      }
      if (command.operation === 'collage' || command.operation === 'annotate') {
        const mediaSignal = AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(Math.max(1, request.expiresAt - Date.now()))]);
        let data: string, width: number, height: number;
        if (command.operation === 'collage') {
          const inputs = command.nodeIds.map(id => getRuntime()!.nodes().find(item => item.id === id));
          if (inputs.some(item => !item || item.status === 'loading' || !localMedia(item.resultUrl, request.projectId, 'images'))) return { ok: false, code: 'UNAVAILABLE' };
          const images = await Promise.all(inputs.map(async item => {
            const image = await mediaCanvas().loadImage(localMedia(item!.resultUrl, request.projectId, 'images')!, mediaSignal);
            return { image, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, centerX: item!.x + Number(item!.width || 340) / 2, centerY: item!.y + Number(item!.height || 300) / 2, visualHeight: Number(item!.height || 300) };
          }));
          ({ data, width, height } = mediaCanvas().collage(images));
        } else {
          const image = await mediaCanvas().loadImage(source, mediaSignal);
          if (image.naturalWidth * image.naturalHeight > 64000000) throw new AgentOperationError('Image too large', { operation: 'annotate-image', reason: 'pixel-limit' });
          const dimensions = { width: image.naturalWidth, height: image.naturalHeight }, canvas = document.createElement('canvas'), overlay = document.createElement('canvas');
          ({ width, height } = dimensions);
          canvas.width = dimensions.width; canvas.height = dimensions.height;
          mediaCanvas().renderAnnotations(overlay, command.strokes, dimensions);
          const context = canvas.getContext('2d'); if (!context) throw new AgentOperationError('Image unavailable', { operation: 'annotate-image', reason: 'missing-context' });
          context.drawImage(image, 0, 0); context.globalCompositeOperation = command.mask ? 'destination-out' : 'source-over'; context.drawImage(overlay, 0, 0);
          data = canvas.toDataURL('image/png');
        }
        if (!active()) return { ok: false, code: 'UNAVAILABLE' };
        const url = await mediaCanvas().uploadData(data, 'image', '', request.projectId, mediaSignal);
        if (!active() || !localMedia(url, request.projectId, 'images')) return { ok: false, code: 'UNCONFIRMED' };
        return insert(request, canvasEditing().assetNode({ url, type: 'images', projectId: request.projectId, width, height }, {}, request.projectId, { x: node.x + 420, y: node.y }, crypto.randomUUID()));
      }
      const paths = { crop: '/api/media/images/crop', grid: '/api/media/images/grid', frames: '/api/media/videos/frames', trimVideo: '/api/trim-video', trimAudio: '/api/trim-audio' };
      const body = { projectId: request.projectId, [type === 'images' ? 'imageUrl' : type === 'videos' ? 'videoUrl' : 'audioUrl']: source,
        ...(command.operation === 'crop' ? { rect: command.rect } : command.operation === 'grid' ? { columns: command.columns, rows: command.rows }
          : command.operation === 'frames' ? { times: command.times } : { startTime: command.startTime, endTime: command.endTime }) };
      const response = await fetcher(paths[command.operation], { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) return { ok: false, code: 'UNCONFIRMED' };
      const result = await response.json();
      if (!active()) return { ok: false, code: 'UNCONFIRMED' };
      const assets = Array.isArray(result.assets) ? result.assets : result.asset ? [result.asset] : [];
      if (!assets.length || assets.length > 64 || assets.some((asset: Record<string, unknown>) => !localMedia(asset.url, request.projectId) || !['images', 'videos', 'audios'].includes(String(asset.type)))) return { ok: false, code: 'UNCONFIRMED' };
      const prepared = await Promise.all(assets.map(async (asset: Record<string, unknown>, index: number) => canvasEditing().assetNode(asset, asset.type === 'videos' ? await mediaCanvas().inspectVideo(String(asset.url), 5000, false) : {}, request.projectId,
        { x: node.x + 420 + index % 4 * 360, y: node.y + Math.floor(index / 4) * 360 }, crypto.randomUUID())));
      if (!active()) return { ok: false, code: 'UNCONFIRMED' };
      return insert(request, prepared);
    } catch { return { ok: false, code: command.operation === 'view' ? 'UNAVAILABLE' : 'UNCONFIRMED' }; }
  }
  return (request, signal) => {
    if (!validCanvasControl(request.command)) return { ok: false, code: 'INVALID' };
    if (request.command.action !== 'media') return execute(request, signal);
    const signature = JSON.stringify(request), old = receipts.get(request.requestId);
    if (old) return old.signature === signature ? old.promise : { ok: false, code: 'INVALID' };
    if (receipts.size >= 500) return { ok: false, code: 'UNAVAILABLE' };
    const promise = handle(request, signal); receipts.set(request.requestId, { signature, promise }); return promise;
  };
}

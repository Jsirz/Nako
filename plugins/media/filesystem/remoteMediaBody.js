import { ERRORS, PluginError } from '../../../modules/contracts/index.js';

/** Consume a policy-checked response with a limit on the bytes actually received. */
export async function readRemoteMediaBody(response, maxBytes) {
  const tooLarge = () => new PluginError(ERRORS.invalidMedia, '外部素材超过本地化大小限制', {
    status: 413,
    context: { moduleId: 'media.filesystem', operation: 'localize', operationCode: 'REMOTE_ASSET_TOO_LARGE' },
  });
  if (Number(response.headers.get('content-length') || 0) > maxBytes) {
    await response.body?.cancel?.().catch(() => undefined);
    response.body?.destroy?.();
    throw tooLarge();
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body || []) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw tooLarge();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

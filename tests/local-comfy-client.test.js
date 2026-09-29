import { describe, expect, it, vi } from 'vitest';
import { LocalComfyClient, readResponseBytesWithLimit } from '../plugins/workflows/local-comfyui/client.js';

describe('local ComfyUI transport guards', () => {
  it('rejects redirection without following the destination', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 302, headers: { location: 'https://example.com' } }));
    const client = new LocalComfyClient({ serverUrl: '127.0.0.1:8188', fetchImpl });
    await expect(client.getSystemStats()).rejects.toMatchObject({ code: 'COMFYUI_REDIRECT_REJECTED' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual');
  });

  it('enforces response limits for both advertised size and streamed bytes', async () => {
    await expect(readResponseBytesWithLimit(new Response('abcd', { headers: { 'content-length': '4' } }), 3))
      .rejects.toMatchObject({ code: 'COMFYUI_RESPONSE_SIZE_LIMIT' });
    await expect(readResponseBytesWithLimit(new Response('abcd'), 3))
      .rejects.toMatchObject({ code: 'COMFYUI_RESPONSE_SIZE_LIMIT' });
  });

  it('rejects invalid JSON and redacts local paths and credentials in remote validation errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('{'));
    const client = new LocalComfyClient({ serverUrl: '127.0.0.1:8188', fetchImpl });
    await expect(client.getSystemStats()).rejects.toMatchObject({ code: 'COMFYUI_INVALID_JSON' });
    fetchImpl.mockResolvedValue(Response.json({ node_errors: { '1': { errors: [
      { message: 'failed C:\\private\\image.png token=secretvalue' },
    ] } } }, { status: 400 }));
    const error = await client.submitPrompt({ prompt: {}, clientId: 'run' }).catch(value => value);
    expect(error.code).toBe('COMFYUI_PROMPT_REJECTED');
    expect(JSON.stringify(error.details)).not.toContain('secretvalue');
    expect(JSON.stringify(error.details)).not.toContain('private');
  });
});

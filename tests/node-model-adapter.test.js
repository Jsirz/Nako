import { describe, it, expect, vi } from 'vitest';
import { createNodeModelService } from '../modules/generation-core/server/generation/nodeModelService.js';
import { generationBudgetProfile } from '../modules/contracts/shared/generationBudgetProfile.js';
import { createNodeCapabilities } from '../modules/desktop-shell-observability/nodeCapabilities.js';
import { executors } from '../nodes/canvas-core/index.mjs';

const context = { runId: 'run', stepId: 'node:generate', nodeId: 'node', projectId: 'p', authorizationId: 'grant', signal: new AbortController().signal };
const url = (type, name) => `/library/media/p/${type}/${name}`;
function setup() {
  const generate = vi.fn(async () => ({ resultUrls: [url('images', 'a.png'), url('images', 'b.png')] }));
  const defaults = { resolve: vi.fn(async (kind, model) => model || kind + '-default') };
  const config = { advancedParams: [{ key: 'max_tokens' }, { key: 'base_url' }, { key: 'apiKey' }] };
  return { generate, defaults, service: createNodeModelService({ generate, defaults, catalog: () => Object.fromEntries(['image', 'text', 'video', 'audio'].map(kind => [kind + '-default', config])) }) };
}
describe('node model capability adapter', () => {
  it('uses default models, strips connection overrides and preserves multimodal request profiles', async () => {
    const { generate, defaults, service } = setup();
    const sample = { textModel: 'text-default', projectId: 'p', nodeId: 'original', prompt: 'describe', languageMode: 'multimodal-chat',
      max_tokens: 1000, imageBase64: [url('images', 'ref.png')], videoUrl: url('videos', 'ref.mp4'), audios: [url('audios', 'ref.mp3')] };
    await service({ kind: 'text', prompt: 'describe', options: { ...sample, apiKey: 'untrusted', base_url: 'https://bad.invalid' }, references: [
      { type: 'image', url: sample.imageBase64[0] }, { type: 'video', url: sample.videoUrl }, { type: 'audio', url: sample.audios[0] },
    ] }, context);
    expect(defaults.resolve).toHaveBeenCalledWith('text', undefined);
    const sent = generate.mock.calls[0][1];
    expect(sent.apiKey).toBeUndefined(); expect(sent.base_url).toBeUndefined();
    expect(sent.agentAuthorizationId).toBe('grant'); expect(sent.signal).toBe(context.signal);
    expect(generationBudgetProfile(sent)).toBe(generationBudgetProfile(sample));
    await service({ kind: 'text', options: {} }, { ...context, stepId: 'node:other' });
    expect(generate.mock.calls[1][1].nodeId).not.toBe(sent.nodeId);
  });
  it('keeps image count as one provider request and retains the authorized profile', async () => {
    const { generate, service } = setup();
    const sample = { imageModel: 'image-default', prompt: 'draw', imageMode: 'text-to-image', projectId: 'p', nodeId: 'n',
      generateCount: 2, aspectRatio: '1:1', resolution: '2K', midjourneyReferences: null, detail: 'low', quality: 'auto' };
    const result = await executors.image({ inputs: {}, parameters: { ...sample, count: 2, model: 'image-default' } }, {
      progress() {}, call: async (_name, input) => { const output = await service(input, context); return { type: 'image', url: output.resultUrls[0], urls: output.resultUrls }; },
    });
    expect(generate).toHaveBeenCalledTimes(1); expect(result.image.urls).toHaveLength(2);
    expect(generationBudgetProfile(generate.mock.calls[0][1])).toBe(generationBudgetProfile(sample));
    expect(generationBudgetProfile({ ...sample, generateCount: 3 })).not.toBe(generationBudgetProfile(sample));
  });
  it('routes inline image inputs as references instead of prompt text', async () => {
    const call = vi.fn(async () => ({ text: 'ok' }));
    await executors.text({ inputs: { context: ['data:image/png;base64,YQ==', 'explain'] }, parameters: { prompt: 'inspect' } }, { call, progress() {} });
    expect(call.mock.calls[0][1]).toMatchObject({ prompt: 'inspect\nexplain', references: ['data:image/png;base64,YQ=='] });
  });
  it('rejects cross-project and oversized reference collections before saving media', async () => {
    const save = vi.fn(), generateNode = vi.fn();
    const capabilities = createNodeCapabilities({ generation: { generateNode }, mediaStore: { save } });
    await expect(capabilities['models.generate']({ kind: 'image', references: Array(21).fill('data:image/png;base64,YQ==') }, context)).rejects.toMatchObject({ code: 'NODE_INVALID' });
    await expect(capabilities['models.generate']({ kind: 'image', references: ['/library/media/other/images/a.png'] }, context)).rejects.toMatchObject({ code: 'NODE_CAPABILITY_DENIED' });
    expect(save).not.toHaveBeenCalled(); expect(generateNode).not.toHaveBeenCalled();
  });
});

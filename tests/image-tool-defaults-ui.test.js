// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { browserHost } from '../modules/kernel/browser.ts';
import { createDefaultModelsClient } from '../modules/generation-core/ui/generation/defaultModelsClient.ts';
import { createImageAngleDraft, imageToolModel } from '../modules/asset-media/ui/media/imageAngleDraft.ts';
import { ImageToolGenerateButton } from '../modules/canvas-ui/ui/dialogs/imageToolGenerateButton.tsx';

const imageModel = (name) => ({
  name, provider: 'FixtureProvider', resolutions: ['1K'], aspectRatios: ['2:1', '16:9'],
  endpoint: { 'image-to-image': { url: 'fixture', model: name } },
  imageModes: [{ value: 'image-to-image', allowedInputs: { image: 1 } }],
});
let defaults, snapshot, models, releases;
beforeEach(async () => {
  models = [imageModel('image A'), imageModel('image B'), {
    ...imageModel('text only'), endpoint: {}, imageModes: [],
  }];
  snapshot = {
    defaults: { text: '', image: 'image A', video: '', audio: '' },
    candidates: { text: [], image: models.map(({ name }) => ({ name, configured: true })), video: [], audio: [] },
  };
  defaults = createDefaultModelsClient(async (_url, options) => {
    if (options.method === 'PUT') Object.assign(snapshot.defaults, JSON.parse(options.body));
    return Response.json(snapshot);
  });
  await defaults.read();
  releases = [
    browserHost.services.register('generation.defaults', defaults),
    browserHost.services.register('ui.generation.catalog', { list: () => models }),
    browserHost.services.register('ui.media.canvas', { imageToolModel }),
  ];
});
afterEach(() => {
  cleanup();
  releases.reverse().forEach((release) => release());
});

it('updates the displayed model and disables generation when the default loses image reference support', async () => {
  render(React.createElement(ImageToolGenerateButton, { label: '生成全景图', onClick: vi.fn() }));
  const button = screen.getByRole('button', { name: '生成全景图' });
  expect(button.title).toBe('使用 image A');
  await act(() => defaults.update({ image: 'image B' }));
  expect(button.title).toBe('使用 image B');
  expect(button.disabled).toBe(false);
  await act(() => defaults.update({ image: 'text only' }));
  expect(button.disabled).toBe(true);
  expect(button.title).toContain('支持图生图的默认图像模型');
});

it.each(['', 'removed', 'text only', 'unconfigured', 'no image input'])('rejects default %j without creating a draft or choosing another model', async (name) => {
  snapshot.defaults.image = name === 'unconfigured' || name === 'no image input' ? 'image A' : name;
  if (name === 'unconfigured') snapshot.candidates.image[0].configured = false;
  if (name === 'no image input') models[0].imageModes[0].allowedInputs.image = 0;
  await defaults.read();
  expect(imageToolModel()).toBeUndefined();
  const runtime = { create: vi.fn() };
  for (const angle of [null, { azimuth: 45, elevation: 15, zoom: 5 }]) {
    expect(() => createImageAngleDraft([], 'source', angle, 'project', runtime)).toThrow(
      expect.objectContaining({
        code: 'INVALID_MODEL_CONFIGURATION', status: 400,
        context: { moduleId: 'asset-media', operation: 'imageAngleDraft', projectId: 'project', nodeId: 'source' },
      }),
    );
  }
  expect(runtime.create).not.toHaveBeenCalled();
});

it('allows saving angle settings even without a default model', async () => {
  await defaults.update({ image: '' });
  render(React.createElement(ImageToolGenerateButton, { label: '应用设置', editing: true, onClick: vi.fn() }));
  expect(screen.getByRole('button', { name: '应用设置' }).disabled).toBe(false);
});

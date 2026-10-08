// @vitest-environment jsdom
import '../apps/canvas/installModelCatalog';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { browserHost } from '../modules/kernel/browser.ts';
import { IMAGE_MODELS, VIDEO_MODELS } from '../modules/generation-core/models/catalog.ts';
import { filterCanvasModelGroups } from '../modules/generation-core/ui/generation/canvasModelCatalogPolicy.ts';
import { mountSourceSettings } from '../modules/generation-core/ui/generation/sourceSettings.ts';
import { mountDefaultModelsSettings } from '../modules/generation-core/ui/generation/defaultModelsSettings.ts';
import { CanvasMediaToolbar } from '../modules/canvas-ui/ui/nodes/canvasMediaToolbar.tsx';
import { installWorkflowManager } from '../modules/local-runtime/ui/local/installWorkflowManager.ts';
import { createWorkflowManager } from '../modules/local-runtime/ui/local/workflowManager.ts';

const releases = [];
afterEach(() => {
  releases.splice(0).reverse().forEach((release) => release());
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it('hides both RH sources even with configured credentials and keeps the underlying models', async () => {
  const blocks = ['runninghub', 'runninghub_global', 'work_fisher', 'ecloud'].map((source) => ({
    source, label: source, secrets: [], singleKey: true, media: [],
  }));
  const original = structuredClone(blocks);
  const client = { getBlocks: vi.fn(async () => blocks), saveKeys: vi.fn() };
  releases.push(mountSourceSettings(document.body, client));
  await waitFor(() => expect(document.querySelectorAll('[data-nako-source-block]')).toHaveLength(2));
  expect([...document.querySelectorAll('[data-nako-source-block]')].map((node) => node.dataset.nakoSourceBlock))
    .toEqual(['work_fisher', 'ecloud']);
  expect(client.saveKeys).not.toHaveBeenCalled();
  expect(blocks).toEqual(original);

  const rhModels = [...IMAGE_MODELS, ...VIDEO_MODELS].filter((model) => model.source?.startsWith('runninghub'));
  expect(rhModels.length).toBeGreaterThan(0);
  const groups = [{ canonicalModel: 'Mixed', variants: [
    ...rhModels.map((model) => ({ name: model.name, source: model.source, configured: true })),
    { name: 'Visible', source: 'work_fisher', configured: true },
  ] }, { canonicalModel: 'RH only', variants: [{ source: 'runninghub', configured: true }] }];
  const copy = structuredClone(groups);
  expect(filterCanvasModelGroups(groups)).toEqual([
    { canonicalModel: 'Mixed', variants: [{ name: 'Visible', source: 'work_fisher', configured: true }] },
  ]);
  expect(groups).toEqual(copy);
});

it('keeps a saved RH default without exposing RH candidates or writing settings on render', async () => {
  const hidden = IMAGE_MODELS.find((model) => model.source === 'runninghub');
  const snapshot = {
    defaults: { text: '', image: hidden.name, video: '', audio: '' },
    candidates: { text: [], image: [
      { name: hidden.name, configured: true },
      { name: 'Visible model', configured: true },
    ], video: [], audio: [] },
  };
  const service = { read: vi.fn(async () => snapshot), update: vi.fn(async () => snapshot) };
  releases.push(browserHost.services.register('generation.defaults', service));
  const mounted = mountDefaultModelsSettings(document.body);
  releases.push(() => mounted.dispose());
  await waitFor(() => expect(document.querySelectorAll('select')).toHaveLength(4));
  const select = screen.getByLabelText('默认图像模型');
  expect(select.value).toBe(hidden.name);
  expect(select.selectedOptions[0].textContent).toBe('当前默认模型已隐藏（可重新选择）');
  expect([...select.options].map((option) => option.textContent).join(' ')).not.toMatch(/RunningHub|RH/);
  expect(service.update).not.toHaveBeenCalled();
  fireEvent.change(select, { target: { value: 'Visible model' } });
  await waitFor(() => expect(service.update).toHaveBeenCalledWith({ image: 'Visible model' }));
});

it('keeps ordinary image tools but hides RH upscale and avoids its credential request', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const Icon = () => null;
  const components = { Tooltip: ({ children }) => children, annotate: Icon, crop: Icon,
    resize: Icon, replace: Icon, saveAsset: Icon, download: Icon, expand: Icon };
  function Toolbar() {
    return CanvasMediaToolbar(React, {
      data: { id: 'image-a', type: 'Image', resultUrl: '/library/image.png' },
      selected: true, showControls: true, zoom: 1, onUpdate: vi.fn(), onUpscaleImage: vi.fn(),
    }, components);
  }
  render(React.createElement(Toolbar));
  expect(screen.getByRole('button', { name: '图片编辑' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '尺寸' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'AI 高清放大' })).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});

function workflowClient() {
  const definitions = ['local', 'cloud'].map((id) => ({ id, name: `${id} workflow`, revision: 1,
    sourceArtifacts: [], executionPlan: { executionPlanHash: id } }));
  return {
    listDefinitions: vi.fn(async () => definitions),
    listProjects: vi.fn(async () => []),
    listOfficialWorkflows: vi.fn(async () => []),
    listRunningHubWebApps: vi.fn(async () => ({ apps: [], categories: [] })),
    getRunningHubCredentialStatus: vi.fn(async () => ({ cnConfigured: true })),
    listAttestations: vi.fn(async () => []),
    listDeployments: vi.fn(async (id) => [{ id: `deploy-${id}`, runner: id === 'cloud' ? 'runninghub-workflow' : 'local-comfyui' }]),
    listBindingSets: vi.fn(async () => [{ id: 'bindings', bindings: [] }]),
    getDefinition: vi.fn(async (id) => definitions.find((item) => item.id === id)),
    listBindingCandidates: vi.fn(async () => []),
  };
}

it('shows local workflows and advanced local deployment without mounting RH galleries', async () => {
  const client = workflowClient();
  const host = createWorkflowManager(client, { initialView: 'library' });
  document.body.append(host);
  await waitFor(() => expect(host.textContent).toContain('local workflow'));
  expect(host.querySelector('[data-nako-workflow-library-scope="local"]')).toBeTruthy();
  expect(host.querySelector('[data-nako-workflow-library-scope="cloud"]')).toBeNull();
  expect(host.querySelector('[data-nako-workflow-library-scope="official"]')).toBeNull();
  expect(host.textContent).not.toContain('cloud workflow');
  expect(client.listOfficialWorkflows).not.toHaveBeenCalled();
  expect(await client.listDefinitions()).toHaveLength(2);

  const editor = createWorkflowManager(client, { definitionId: 'local', initialStage: 1 });
  document.body.append(editor);
  await waitFor(() => expect(editor.querySelector('option[value="local-comfyui"]')).toBeTruthy());
  expect(editor.querySelector('option[value="runninghub-workflow"]')).toBeNull();
});

it('does not initialize the cloud manager when mounting local settings tabs', async () => {
  const client = workflowClient();
  const panel = document.createElement('section');
  panel.setAttribute('data-nako-local-runtime-panel', 'true');
  document.body.append(panel);
  releases.push(installWorkflowManager(client));
  await waitFor(() => expect(document.querySelectorAll('[data-nako-local-workspace-tab]')).toHaveLength(2));
  expect(document.querySelector('[data-nako-local-workspace-tab="cloud"]')).toBeNull();
  expect(client.listRunningHubWebApps).not.toHaveBeenCalled();
  expect(client.getRunningHubCredentialStatus).not.toHaveBeenCalled();
});

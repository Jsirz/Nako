// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/dom';
import { mountSourceSettings } from '../modules/generation-core/ui/generation/sourceSettings.ts';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const model = (name, kind) => ({
  name,
  tier: 'standard',
  variantLabel: null,
  requiredSecrets: ['WORK_FISHER_API_KEY'],
  configured: true,
  modelIdOverride: false,
  ...(kind === 'text' ? { vision: 'supported' } : {}),
});

it('shows the fixed Work-Fisher catalog without model discovery or custom additions', async () => {
  const client = {
    getBlocks: vi.fn(async () => [
      {
        source: 'work_fisher',
        label: 'Work-Fisher',
        secrets: [{ key: 'WORK_FISHER_API_KEY', configured: true }],
        singleKey: true,
        media: [
          { kind: 'text', models: [model('豆包 Seed Evolving · Work-Fisher', 'text')] },
          { kind: 'image', models: [model('Qwen Image 3.0 · Work-Fisher', 'image')] },
          { kind: 'video', models: [model('MiniMax H3 · Work-Fisher', 'video')] },
          { kind: 'audio', models: [model('Suno Generation · Work-Fisher', 'audio')] },
        ],
      },
    ]),
    saveKeys: vi.fn(async () => {}),
  };
  const dispose = mountSourceSettings(document.body, client);
  await waitFor(() => expect(document.querySelector('[data-nako-source-block="work_fisher"]')).toBeTruthy());
  const card = document.querySelector('[data-nako-source-block="work_fisher"]');
  expect(card.textContent).toContain('Work-Fisher');
  expect(card.textContent).toContain('MiniMax H3 · Work-Fisher');
  expect(card.querySelectorAll('[data-nako-source-model]')).toHaveLength(4);
  expect(card.querySelector('[aria-label="已适配模型"]')).toBeNull();
  expect(card.querySelector('[aria-label="自定义模型 ID"]')).toBeNull();
  expect(card.querySelector('[aria-label="API Key"]')).toBeTruthy();
  expect(card.textContent).not.toMatch(/读取模型列表|添加模型|删除模型|我的模型/);
  dispose();
});

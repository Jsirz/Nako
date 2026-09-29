import { browserHost } from '../../../kernel/browser';
import { modelDisplayName } from '../../models/modelDisplayName';
import { isModelVisible } from './hiddenProviderPolicy';
import type { DefaultModelsClient, ModelKind } from '../../../contracts/defaultModels';

export function mountDefaultModelsSettings(host: HTMLElement) {
  const service = browserHost.services.optional<DefaultModelsClient>('generation.defaults');
  if (!service) return { refresh: () => {}, dispose: () => {} };
  let active = true;
  let loading = 0;
  const panel = document.createElement('section');
  panel.className = 'space-y-4 rounded-lg border border-[var(--nk-border)] p-5';
  panel.dataset.defaultModels = 'true';
  const title = document.createElement('h3');
  title.textContent = '默认模型';
  title.className = 'text-lg font-bold';
  const description = document.createElement('p');
  description.textContent =
    'Agent、画布及生成工具未指定模型时使用下列设置。已有的明确选择保持不变。';
  description.className = 'text-sm text-[var(--nk-text-secondary)]';
  const fields = document.createElement('div');
  fields.className = 'grid grid-cols-1 gap-3';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.className = 'text-sm text-[var(--nk-text-secondary)]';
  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.textContent = '刷新默认模型选项';
  refreshButton.className = 'nako-button';
  panel.append(title, description, fields, status, refreshButton);
  host.append(panel);
  const labels: Record<ModelKind, string> = {
    text: '文本',
    image: '图像',
    video: '视频',
    audio: '音频',
  };
  function render(data: Awaited<ReturnType<DefaultModelsClient['read']>>) {
    fields.replaceChildren();
    for (const kind of Object.keys(labels) as ModelKind[]) {
      const row = document.createElement('label');
      row.className = 'flex items-center gap-4';
      const label = document.createElement('span');
      label.textContent = `默认${labels[kind]}模型`;
      label.className = 'w-28 shrink-0 text-sm';
      const select = document.createElement('select');
      select.setAttribute('aria-label', label.textContent);
      select.className =
        'min-w-0 flex-1 rounded-lg border border-[var(--nk-border-control)] bg-[var(--nk-input)] p-3 text-sm';
      const option = (value: string, text: string) => {
        const item = document.createElement('option');
        item.value = value;
        item.textContent = text;
        select.append(item);
      };
      option('', '未设置（使用时需指定模型）');
      for (const model of data.candidates[kind].filter((item) => item.configured && isModelVisible(item.name)))
        option(model.name, modelDisplayName(model.name));
      const current = data.defaults[kind];
      if (
        current && isModelVisible(current) &&
        !data.candidates[kind].some((item) => item.name === current && item.configured)
      )
        option(current, `${current}（不可用，请重新选择）`);
      if (current && !isModelVisible(current)) option(current, '当前默认模型已隐藏（可重新选择）');
      select.value = current;
      select.addEventListener('change', async () => {
        refreshButton.disabled = true;
        fields.querySelectorAll('select').forEach((input) => {
          input.disabled = true;
        });
        status.textContent = '正在保存…';
        try {
          const saved = await service!.update({ [kind]: select.value });
          if (active) {
            render(saved);
            status.textContent = '已保存，新操作立即使用该默认模型。';
          }
        } catch (error) {
          if (active) {
            select.value = current;
            status.textContent = error instanceof Error ? error.message : '保存失败';
          }
        } finally {
          refreshButton.disabled = false;
          fields.querySelectorAll('select').forEach((input) => {
            input.disabled = false;
          });
        }
      });
      row.append(label, select);
      fields.append(row);
    }
  }
  async function refresh() {
    const owner = ++loading;
    try {
      const data = await service!.read();
      if (active && owner === loading) {
        render(data);
        status.textContent = '';
      }
    } catch (error) {
      if (active) status.textContent = error instanceof Error ? error.message : '读取失败，请重试';
    }
  }
  refreshButton.addEventListener('click', () => void refresh());
  void refresh();
  return {
    refresh: () => void refresh(),
    dispose() {
      active = false;
      panel.remove();
    },
  };
}

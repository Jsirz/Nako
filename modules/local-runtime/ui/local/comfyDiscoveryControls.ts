import type { LocalRuntimeClient } from './localRuntimeClient';
import type { SettingsScope } from '../../../generation-core/api/ui/generation/sourceSettingsScope';
import { settingsOperation } from '../../../canvas-ui/api/ui/settings/settingsOperation';
import { createStableTextElement as textElement } from '../../../canvas-ui/api/ui/design/dom';

export function createComfyDiscoveryControls(
  client: LocalRuntimeClient,
  scope: SettingsScope,
  run: (action: () => Promise<{ status: string; message?: string }>, busyText: string) => Promise<void>,
  controlButton: (label: string) => HTMLButtonElement,
) {
  const discovery = document.createElement('div');
  discovery.className = 'mt-3 w-full space-y-2';
  const scan = controlButton('自动查找 ComfyUI');
  const pathInput = document.createElement('input');
  pathInput.placeholder = '粘贴 ComfyUI 安装目录';
  pathInput.setAttribute('aria-label', 'ComfyUI 安装目录');
  pathInput.className = 'w-full rounded border border-[var(--nk-border-control)] bg-[var(--nk-surface)] p-2 text-xs';
  const add = controlButton('验证并添加');
  const results = document.createElement('div');
  results.className = 'space-y-2 text-xs text-[var(--nk-text-secondary)]';
  add.addEventListener('click', () => {
    void run(async () => {
      const selected = await settingsOperation(scope, () => client.validateComfyDirectory(pathInput.value));
      await settingsOperation(scope, () => client.adoptComfy(selected.root));
      return { status: 'ok' };
    }, '正在验证安装目录…');
  });
  scan.addEventListener('click', () => {
    if (scan.disabled) return;
    scan.disabled = true;
    results.textContent = '正在查找常见安装位置…';
    void settingsOperation(scope, () => client.discoverComfy()).then((found) => {
      if (!scope.active()) return;
      results.replaceChildren(textElement('p', found.scope));
      if (found.configuredRoot) {
        pathInput.value = found.configuredRoot;
        results.append(textElement('p', `已配置目录：${found.configuredRoot}`));
      }
      if (!found.candidates.length) results.append(textElement('p', '未找到可启动安装。可以点击“选择 ComfyUI 目录”，或粘贴目录后验证。'));
      for (const candidate of found.candidates) {
        const choose = controlButton(`使用 ${candidate.root}`);
        choose.addEventListener('click', () => {
          pathInput.value = candidate.root;
          add.click();
        });
        results.append(choose);
      }
    }).catch((error) => {
      if (scope.active()) results.textContent = error instanceof Error ? error.message : '查找失败，请手动添加。';
    }).finally(() => { scan.disabled = false; });
  });
  discovery.append(scan, results, pathInput, add);
  return discovery;
}

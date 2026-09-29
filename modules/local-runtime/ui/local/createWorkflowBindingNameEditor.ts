import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import type { BindingSet } from './workflowManagerClient';

export function createWorkflowBindingNameEditor(
  initialBindingLabels: Map<string, string>,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  persistBindingLabels: () => Promise<boolean>,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  bindingLabelInputs: Map<string, HTMLInputElement>,
) {
  return (binding: BindingSet['bindings'][number], displayLabel = binding.label) => {
    const control = element('input', 'fwm-inline-binding-name');
    control.value = displayLabel;
    control.maxLength = 120;
    control.size = Math.max(4, Math.min(24, displayLabel.length + 1));
    control.title = '点击修改参数名称';
    control.setAttribute('aria-label', `修改${displayLabel}名称`);
    control.setAttribute('data-nako-test-binding-label', binding.id);
    control.addEventListener('input', () => {
      control.size = Math.max(4, Math.min(24, control.value.length + 1));
    });
    control.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') control.blur();
      if (event.key === 'Escape') {
        control.value = initialBindingLabels.get(binding.id) || binding.label;
        control.blur();
      }
    });
    control.addEventListener('change', () => {
      void runBusy('正在保存参数名称…', async () => {
        if (await persistBindingLabels()) {
          setNotice('参数名称已保存并同步到画布；运行配置保持不变。', 'success');
        }
      });
    });
    bindingLabelInputs.set(binding.id, control);
    initialBindingLabels.set(binding.id, displayLabel);
    return control;
  };
}

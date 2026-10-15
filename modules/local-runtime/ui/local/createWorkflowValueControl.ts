import { createStableElement as element } from '../../../kernel/ui/dom';
import { createWorkflowAssetControl } from './createWorkflowAssetControl';
import type { BindingSet, WorkflowManagerClient } from './workflowManagerClient';
import { ManagerState } from './workflowManagerTypes';

export function createWorkflowValueControl(
  state: ManagerState,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  client: WorkflowManagerClient,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
) {
  return (binding: BindingSet['bindings'][number]) => {
    const { control } = binding;
    if (control.kind === 'toggle') {
      const input = element('input', 'fwm-check');
      input.type = 'checkbox';
      input.checked = Boolean(state.values[binding.key]);
      input.addEventListener('change', () => {
        state.values[binding.key] = input.checked;
      });
      return input;
    }
    if (control.kind === 'select') {
      const select = element('select', 'fwm-select');
      for (const optionValue of control.options) {
        const option = element('option');
        option.value = optionValue.id;
        option.textContent = optionValue.label;
        option.selected = state.values[binding.key] === optionValue.id;
        select.append(option);
      }
      if (state.values[binding.key] === undefined && select.value)
        state.values[binding.key] = select.value;
      select.addEventListener('change', () => {
        state.values[binding.key] = select.value;
      });
      return select;
    }
    if (control.kind === 'asset') {
      return createWorkflowAssetControl(control, binding, state, setNotice, client, runBusy);
    }
    if (control.kind === 'seed') {
      const wrapper = element('div', 'fwm-select-row');
      const mode = element('select', 'fwm-select');
      mode.append(new Option('固定', 'fixed'), new Option('每次随机', 'random'));
      const number = element('input', 'fwm-input');
      number.type = 'number';
      const current = state.values[binding.key] as { mode?: string; value?: number } | undefined;
      const defaultSeed = control.defaultValue as { value?: unknown } | undefined;
      const currentSeedValue = current?.value;
      const declaredSeedValue = defaultSeed?.value;
      let lastValidValue =
        currentSeedValue !== undefined &&
        currentSeedValue !== null &&
        String(currentSeedValue).trim() !== '' &&
        Number.isFinite(Number(currentSeedValue))
          ? Number(currentSeedValue)
          : declaredSeedValue !== undefined &&
              declaredSeedValue !== null &&
              String(declaredSeedValue).trim() !== '' &&
              Number.isFinite(Number(declaredSeedValue))
            ? Number(declaredSeedValue)
            : 1;
      mode.value = current?.mode || 'fixed';
      number.value = String(lastValidValue);
      const commitNumber = () => {
        const rawValue = number.value.trim();
        if (rawValue === '') return;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return;
        lastValidValue = numericValue;
        state.values[binding.key] = { mode: 'fixed', value: numericValue };
      };
      const updateMode = () => {
        number.disabled = mode.value === 'random';
        if (mode.value === 'random') {
          state.values[binding.key] = { mode: 'random' };
          return;
        }
        if (number.value.trim() === '' || !Number.isFinite(Number(number.value))) {
          number.value = String(lastValidValue);
        }
        commitNumber();
      };
      mode.addEventListener('change', updateMode);
      number.addEventListener('input', commitNumber);
      number.addEventListener('blur', () => {
        if (number.value.trim() === '' || !Number.isFinite(Number(number.value))) {
          number.value = String(lastValidValue);
        } else {
          number.value = String(Number(number.value));
          commitNumber();
        }
      });
      updateMode();
      wrapper.append(mode, number);
      return wrapper;
    }
    if (['number', 'slider'].includes(control.kind)) {
      const input = element('input', 'fwm-input');
      input.type = 'number';
      if (control.minimum !== undefined) input.min = String(control.minimum);
      if (control.maximum !== undefined) input.max = String(control.maximum);
      if (control.step !== undefined) input.step = String(control.step);
      const persistedValue = state.values[binding.key];
      const initialValue =
        persistedValue !== undefined &&
        persistedValue !== null &&
        String(persistedValue).trim() !== ''
          ? persistedValue
          : control.defaultValue;
      let lastValidValue =
        initialValue !== undefined &&
        initialValue !== null &&
        String(initialValue).trim() !== '' &&
        Number.isFinite(Number(initialValue))
          ? Number(initialValue)
          : 0;
      input.value = String(lastValidValue);
      input.addEventListener('input', () => {
        const rawValue = input.value.trim();
        if (rawValue === '') return;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return;
        lastValidValue = numericValue;
        state.values[binding.key] = numericValue;
      });
      input.addEventListener('blur', () => {
        if (input.value.trim() === '' || !Number.isFinite(Number(input.value))) {
          input.value = String(lastValidValue);
          return;
        }
        input.value = String(Number(input.value));
      });
      return input;
    }
    const input = element(
      control.kind === 'textarea' ? 'textarea' : 'input',
      control.kind === 'textarea' ? 'fwm-textarea' : 'fwm-input',
    );
    input.value = String(state.values[binding.key] ?? '');
    input.addEventListener('input', () => {
      state.values[binding.key] = input.value;
    });
    return input;
  };
}

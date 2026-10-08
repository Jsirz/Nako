import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { bindingForCandidate } from './workflowManagerBindings';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { ManagerState } from './workflowManagerTypes';

export function persistWorkflowBindingLabels(
  state: ManagerState,
  bindingLabelInputs: Map<string, HTMLInputElement>,
  initialBindingLabels: Map<string, string>,
  bindings: {
    id: string;
    key: string;
    label: string;
    description?: string;
    control: {
      kind: string;
      mediaKind?: string;
      required: boolean;
      minimum?: number;
      maximum?: number;
      step?: number;
      multiple?: boolean;
      minimumItems?: number;
      maximumItems?: number;
      capacity?: number;
      options: Array<{ id: string; label: string }>;
      hasDefault: boolean;
      defaultValue?: unknown;
    };
  }[],
  client: WorkflowManagerClient,
  syncCurrentCanvasNode: () => Promise<boolean>,
) {
  return async () => {
    const selections = state.candidates.flatMap((candidate, candidateIndex) => {
      const binding = bindingForCandidate(state.bindingSet, candidate, candidateIndex);
      if (!binding) return [];
      const control = bindingLabelInputs.get(binding.id);
      const initial = initialBindingLabels.get(binding.id) || binding.label;
      const edited = control?.value.trim() || '';
      const label = edited && edited !== initial ? edited : binding.label;
      return [
        {
          candidateId: candidate.id,
          key: binding.key,
          label,
        },
      ];
    });
    if (selections.length !== bindings.length) {
      throw localRuntimeError('参数候选已经变化，请返回外置参数页面重新保存。', 'persistWorkflowBindingLabels');
    }
    const labelsByKey = new Map(bindings.map((binding) => [binding.key, binding.label]));
    if (!selections.some((selection) => selection.label !== labelsByKey.get(selection.key))) {
      return false;
    }
    state.bindingSet = await client.createBindingSet(state.selected!.id, {
      deploymentId: state.deployment!.id,
      previousBindingSetId: state.bindingSet!.id,
      name: `参数名称 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      bindings: selections,
    });
    await syncCurrentCanvasNode();
    return true;
  };
}

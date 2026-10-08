import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import { bindingSource } from './workflowManagerBindings';
import type { BindingSet } from './workflowManagerClient';
import { assetControlPresentation, field } from './workflowManagerControls';

export function appendWorkflowTestAssets(
  assetBindings: BindingSet['bindings'],
  panel: HTMLDivElement,
  bindingNameEditor: (binding: BindingSet['bindings'][number], displayLabel?: string) => HTMLInputElement,
  valueControl: (binding: BindingSet['bindings'][number]) => HTMLDivElement | HTMLSelectElement | HTMLTextAreaElement,
  candidateFor: Parameters<typeof bindingSource>[0] extends infer Candidate ? (binding: BindingSet['bindings'][number]) => Candidate : never,
) {
  if (!assetBindings.length) return;
  const section = element('section', 'fwm-test-section');
  const sectionHead = element('div', 'fwm-test-section-head');
  const requiredCount = assetBindings.filter((binding) => binding.control.required).length;
  const dynamicCount = assetBindings.filter((binding) => binding.control.multiple).length;
  sectionHead.append(
    element('strong', 'fwm-test-section-title', '参考素材'),
    element('span', 'fwm-test-section-copy', dynamicCount
      ? `${dynamicCount} 个动态素材口；添加几个就接入几个，未使用分支不会提交。`
      : `${requiredCount} 个必填槽位；每个槽位对应 ComfyUI 中一个独立输入。`),
  );
  section.append(sectionHead);
  const groups = new Map<string, BindingSet['bindings']>();
  for (const binding of assetBindings) {
    const mediaKind = binding.control.mediaKind || 'image';
    groups.set(mediaKind, [...(groups.get(mediaKind) || []), binding]);
  }
  for (const [mediaKind, groupBindings] of groups) {
    const presentation = assetControlPresentation(mediaKind);
    const group = element('div', 'fwm-asset-kind');
    group.append(element('div', 'fwm-asset-kind-title', groupBindings.length === 1 && groupBindings[0].control.multiple
      ? `${presentation.label}素材 · ${groupBindings[0].control.minimumItems || 0}–${groupBindings[0].control.maximumItems || 1} 个`
      : `${presentation.label}素材 · ${groupBindings.length} 个槽位`));
    const assetGrid = element('div', 'fwm-test-grid');
    groupBindings.forEach((binding, index) => {
      const displayLabel = groupBindings.length > 1 ? `${presentation.label} ${index + 1}` : binding.label;
      assetGrid.append(field(bindingNameEditor(binding, displayLabel), valueControl(binding), bindingSource(candidateFor(binding))));
    });
    group.append(assetGrid);
    section.append(group);
  }
  panel.append(section);
}

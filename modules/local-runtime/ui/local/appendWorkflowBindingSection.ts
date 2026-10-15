import { createStableElement as element } from '../../../kernel/ui/dom';
import { bindingSource } from './workflowManagerBindings';
import type { BindingCandidate, BindingSet } from './workflowManagerClient';
import { field } from './workflowManagerControls';

export function appendWorkflowBindingSection(
  bindingNameEditor: (
    binding: BindingSet['bindings'][number],
    displayLabel?: string,
  ) => HTMLInputElement,
  valueControl: (
    binding: BindingSet['bindings'][number],
  ) => HTMLDivElement | HTMLSelectElement | HTMLTextAreaElement,
  candidateFor: (binding: BindingSet['bindings'][number]) => BindingCandidate | undefined,
  panel: HTMLDivElement,
) {
  return (title: string, copy: string, sectionBindings: BindingSet['bindings'], wide = false) => {
    if (!sectionBindings.length) return;
    const section = element('section', 'fwm-test-section');
    const sectionHead = element('div', 'fwm-test-section-head');
    sectionHead.append(
      element('strong', 'fwm-test-section-title', title),
      element('span', 'fwm-test-section-copy', copy),
    );
    const sectionGrid = element('div', 'fwm-test-grid');
    for (const binding of sectionBindings) {
      const wrapper = field(
        bindingNameEditor(binding),
        valueControl(binding),
        bindingSource(candidateFor(binding)),
      );
      if (wide) wrapper.classList.add('is-wide');
      sectionGrid.append(wrapper);
    }
    section.append(sectionHead, sectionGrid);
    panel.append(section);
  };
}

import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import type { ManagerState } from './workflowManagerTypes';
export const panelHeading = (title: string, copy: string, actions?: HTMLElement) => {
  const row = element('div', 'fwm-panel-head');
  const text = element('div');
  text.append(element('h4', 'fwm-panel-title', title), element('p', 'fwm-panel-copy', copy));
  row.append(text);
  if (actions) row.append(actions);
  return row;
};
export const createWorkflowNodeTitleControl = (state: ManagerState) => {
  const control = element('input', 'fwm-input');
  control.value = state.nodeTitle || state.selected?.name || '工作流';
  control.maxLength = 120;
  control.setAttribute('aria-label', '画布节点名称');
  control.addEventListener('input', () => {
    state.nodeTitle = control.value;
  });
  return control;
};

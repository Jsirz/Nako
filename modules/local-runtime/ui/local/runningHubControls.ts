import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';

export const RUNNINGHUB_CN_KEY_URL = 'https://www.runninghub.cn/call-api/bill-task?tab=keys&type=consumer';
export const RUNNINGHUB_GLOBAL_KEY_URL = 'https://www.runninghub.ai/zh-cn/call-api/bill-task?tab=keys&type=consumer';

export function control(label: string, primary = false) {
  const button = element('button', `rhwm-button${primary ? ' is-primary' : ''}`, label);
  button.type = 'button';
  return button;
}

export function configureApiTokenInput(input: HTMLInputElement, name: string) {
  input.classList.add('nako-key-input');
  input.type = 'text';
  input.name = name;
  input.autocomplete = 'off';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  input.setAttribute('aria-autocomplete', 'none');
  input.setAttribute('data-form-type', 'other');
  input.setAttribute('data-lpignore', 'true');
  input.setAttribute('data-1p-ignore', 'true');
  return input;
}

export function externalControl(label: string, href: string, site: 'cn' | 'global') {
  const anchor = element('a', 'rhwm-key-link nako-button is-primary nako-key-link', label);
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.setAttribute('data-nako-rh-get-key', site);
  anchor.setAttribute('aria-label', `${label}（在新窗口打开）`);
  anchor.append(document.createTextNode(' ↗'));
  return anchor;
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请检查网络和 RunningHub 配置。';
}

export function stageHeading(index: string, title: string, description: string, titleId: string) {
  const heading = element('div', 'rhwm-stage-heading');
  const titleNode = element('h3', '', title);
  titleNode.id = titleId;
  heading.append(element('span', 'rhwm-stage-index', index), titleNode, element('p', '', description));
  return heading;
}

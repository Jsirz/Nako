import { createStableTextElement as textElement } from '../../../kernel/ui/dom';

export function vendorLink(href: string) {
  const link = document.createElement('a');
  link.textContent = '获取密钥';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'nako-button is-primary nako-key-link';
  link.setAttribute('aria-label', '获取密钥（在浏览器打开）');
  return link;
}

export function badge(text: string, tone: 'on' | 'off' | 'accent') {
  const styles = {
    on: 'bg-[var(--nk-success-bg)] text-[var(--nk-success)]',
    off: 'bg-[var(--nk-surface-raised)] text-[var(--nk-text-muted)]',
    accent: 'bg-[var(--nk-info-bg)] text-[var(--nk-info)]',
  };
  return textElement('span', text, `text-xs px-2 py-0.5 rounded-full font-bold ${styles[tone]}`);
}

export function disclosureButton(
  label: HTMLElement,
  body: HTMLElement,
  attribute: string,
  className: string,
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute(attribute, 'true');
  button.setAttribute('aria-expanded', 'false');

  const affordance = textElement('span', '展开', 'text-xs font-medium text-[var(--nk-text-muted)]');
  affordance.setAttribute('data-nako-disclosure-affordance', 'true');
  button.append(label, affordance);
  body.hidden = true;
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    body.hidden = expanded;
    affordance.textContent = expanded ? '展开' : '收起';
  });
  return button;
}

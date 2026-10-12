import { browserServices } from '../../../kernel/browser';
import { activateModal } from './modalFocus';
import { preferenceStorage } from '../../../project/api/ui/persistence/preferenceStore';
import { DESIGN_CSS, DESIGN_TOKENS } from './designSystemStyles';
export { DESIGN_TOKENS } from './designSystemStyles';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';
export type ConfirmationIntent = 'paid' | 'destructive' | 'remote-risk';

export const RUNNINGHUB_PAID_CONFIRMATION_KEY = 'runninghub-paid-execution';
const CONFIRMATION_PREFERENCE_PREFIX = 'nako.confirmation.suppressed.v1.';

export interface AnchoredConfirmationOptions {
  anchor?: Element | { x: number; y: number };
  intent: ConfirmationIntent;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  rememberKey?: string;
}

interface LabeledControl<T extends HTMLElement> {
  element: HTMLLabelElement;
  label: HTMLSpanElement;
  input: T;
}

interface SelectControl {
  element: HTMLLabelElement;
  label: HTMLSpanElement;
  select: HTMLSelectElement;
}

interface OverlayControl {
  element: HTMLDivElement;
  trigger: HTMLButtonElement;
  content: HTMLDivElement;
}

interface StableDesignReport {
  shell: 'projects' | 'canvas' | 'unknown';
  labelledButtons: number;
  settingsSections: string[];
}

export interface StableDesignSystemAdapter {
  readonly tokens: typeof DESIGN_TOKENS;
  enhance(root?: ParentNode): StableDesignReport;
  confirm(options: AnchoredConfirmationOptions): Promise<boolean>;
  isConfirmationSuppressed(key: string): boolean;
  resetConfirmationPreference(key: string): void;
  observe(): () => void;
}

declare global {
  interface Window {
    __NAKO_DESIGN_SYSTEM__?: StableDesignSystemAdapter;
  }
}

let controlSequence = 0;
let lastActivationPoint: { x: number; y: number } | null = null;
let confirmationPointerTrackingInstalled = false;
let closeActiveConfirmation: ((confirmed: boolean) => void) | null = null;

function nextId(prefix: string): string {
  controlSequence += 1;
  return `nako-${prefix}-${controlSequence}`;
}

function setClasses(element: HTMLElement, ...classes: string[]): void {
  element.classList.add('nako-ui', ...classes);
}

export function createButton(options: {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = options.label;
  button.disabled = options.disabled ?? false;
  setClasses(button, 'nako-button', `is-${options.variant ?? 'secondary'}`);
  if (options.onClick) button.addEventListener('click', options.onClick);
  return button;
}

function confirmationPreferenceStorageKey(key: string): string {
  return `${CONFIRMATION_PREFERENCE_PREFIX}${key}`;
}

export function isConfirmationSuppressed(key: string): boolean {
  try {
    return preferenceStorage().getItem(confirmationPreferenceStorageKey(key)) === '1';
  } catch {
    return false;
  }
}

export function resetConfirmationPreference(key: string): void {
  try {
    preferenceStorage().removeItem(confirmationPreferenceStorageKey(key));
  } catch {
    // A disabled storage backend must never block an explicit confirmation.
  }
}

function suppressConfirmation(key: string): void {
  try {
    preferenceStorage().setItem(confirmationPreferenceStorageKey(key), '1');
  } catch {
    // The current action still proceeds; only the optional preference is lost.
  }
}

function installConfirmationPointerTracking(): void {
  if (confirmationPointerTrackingInstalled) return;
  confirmationPointerTrackingInstalled = true;
  document.addEventListener(
    'pointerdown',
    (event) => {
      lastActivationPoint = { x: event.clientX, y: event.clientY };
    },
    true,
  );
}

function confirmationAnchor(options: AnchoredConfirmationOptions): {
  point: { x: number; y: number };
  focusTarget: HTMLElement | null;
} {
  const explicitElement = options.anchor instanceof Element ? options.anchor : null;
  const activeElement =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
  const focusTarget = explicitElement instanceof HTMLElement ? explicitElement : activeElement;
  if (explicitElement) {
    const rect = explicitElement.getBoundingClientRect();
    return {
      point: { x: rect.left + rect.width / 2, y: rect.bottom },
      focusTarget,
    };
  }
  if (options.anchor && 'x' in options.anchor) {
    return { point: options.anchor, focusTarget };
  }
  return {
    point: lastActivationPoint ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    focusTarget,
  };
}

const CONFIRMATION_INTENT_LABELS: Record<ConfirmationIntent, string> = {
  paid: 'PAID / 费用确认',
  destructive: 'DELETE / 删除确认',
  'remote-risk': 'REMOTE / 远端状态',
};

export function requestAnchoredConfirmation(
  options: AnchoredConfirmationOptions,
): Promise<boolean> {
  const canRemember = options.intent === 'paid' && Boolean(options.rememberKey);
  if (canRemember && isConfirmationSuppressed(options.rememberKey!)) {
    return Promise.resolve(true);
  }
  installConfirmationPointerTracking();
  closeActiveConfirmation?.(false);

  const { point, focusTarget } = confirmationAnchor(options);
  const confirmation = document.createElement('div');
  const title = document.createElement('h2');
  const description = document.createElement('p');
  const ledger = document.createElement('div');
  const ledgerLabel = document.createElement('span');
  const tick = document.createElement('span');
  const actions = document.createElement('div');
  const cancel = createButton({ label: options.cancelLabel ?? '取消', variant: 'ghost' });
  const confirm = createButton({
    label: options.confirmLabel,
    variant: options.intent === 'destructive' ? 'danger' : 'primary',
  });
  const titleId = nextId('anchored-confirmation-title');
  const descriptionId = nextId('anchored-confirmation-description');
  const confirmationId = nextId('anchored-confirmation');

  confirmation.id = confirmationId;
  confirmation.dataset.nakoAnchoredConfirmation = 'true';
  confirmation.dataset.nakoConfirmationIntent = options.intent;
  confirmation.setAttribute('role', 'dialog');
  confirmation.setAttribute('aria-modal', 'false');
  confirmation.setAttribute('aria-labelledby', titleId);
  confirmation.setAttribute('aria-describedby', descriptionId);
  confirmation.tabIndex = -1;
  title.id = titleId;
  title.textContent = options.title;
  description.id = descriptionId;
  description.textContent = options.description;
  ledgerLabel.textContent = CONFIRMATION_INTENT_LABELS[options.intent];
  tick.setAttribute('aria-hidden', 'true');
  setClasses(confirmation, 'nako-anchored-confirmation');
  setClasses(ledger, 'nako-confirmation-ledger');
  setClasses(ledgerLabel, 'nako-confirmation-kind');
  setClasses(tick, 'nako-confirmation-tick');
  setClasses(title, 'nako-confirmation-title');
  setClasses(description, 'nako-confirmation-description');
  setClasses(actions, 'nako-confirmation-actions');
  confirm.dataset.nakoConfirmationConfirm = 'true';
  cancel.dataset.nakoConfirmationCancel = 'true';
  ledger.append(ledgerLabel);
  confirmation.append(tick, ledger, title, description);

  let remember: HTMLInputElement | null = null;
  if (canRemember) {
    const rememberControl = document.createElement('label');
    remember = document.createElement('input');
    const rememberCopy = document.createElement('span');
    remember.type = 'checkbox';
    remember.checked = true;
    remember.dataset.nakoConfirmationRemember = 'true';
    rememberCopy.textContent = '下次不再提醒';
    setClasses(rememberControl, 'nako-confirmation-remember');
    rememberControl.append(remember, rememberCopy);
    confirmation.append(rememberControl);
  }
  actions.append(cancel, confirm);
  confirmation.append(actions);
  document.body.append(confirmation);

  const panelWidth = confirmation.offsetWidth || Math.min(340, window.innerWidth - 24);
  const panelHeight = confirmation.offsetHeight || (canRemember ? 224 : 188);
  const viewportGap = 12;
  const placeAbove = point.y + 12 + panelHeight > window.innerHeight - viewportGap;
  const left = Math.min(
    Math.max(viewportGap, point.x - 28),
    Math.max(viewportGap, window.innerWidth - panelWidth - viewportGap),
  );
  const top = placeAbove
    ? Math.max(viewportGap, point.y - panelHeight - 12)
    : Math.min(point.y + 12, window.innerHeight - panelHeight - viewportGap);
  confirmation.style.left = `${Math.round(left)}px`;
  confirmation.style.top = `${Math.round(top)}px`;
  confirmation.style.setProperty(
    '--nako-confirmation-anchor-x',
    `${Math.round(Math.min(Math.max(18, point.x - left), panelWidth - 18))}px`,
  );
  confirmation.dataset.placement = placeAbove ? 'above' : 'below';

  const previousExpanded = focusTarget?.getAttribute('aria-expanded');
  const previousControls = focusTarget?.getAttribute('aria-controls');
  if (focusTarget) {
    focusTarget.setAttribute('aria-expanded', 'true');
    focusTarget.setAttribute('aria-controls', confirmationId);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      if (confirmed && canRemember && remember?.checked) {
        suppressConfirmation(options.rememberKey!);
      }
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      document.removeEventListener('keydown', onDocumentKeyDown, true);
      confirmation.remove();
      if (focusTarget) {
        if (previousExpanded == null) focusTarget.removeAttribute('aria-expanded');
        else focusTarget.setAttribute('aria-expanded', previousExpanded);
        if (previousControls == null) focusTarget.removeAttribute('aria-controls');
        else focusTarget.setAttribute('aria-controls', previousControls);
        if (focusTarget.isConnected) focusTarget.focus({ preventScroll: true });
      }
      if (closeActiveConfirmation === finish) closeActiveConfirmation = null;
      resolve(confirmed);
    };
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!confirmation.contains(event.target as Node) && event.target !== focusTarget)
        finish(false);
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finish(false);
    };
    confirmation.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const controls = [remember, cancel, confirm].filter(
        (control): control is HTMLInputElement | HTMLButtonElement =>
          control !== null && !control.disabled,
      );
      const currentIndex = controls.indexOf(
        document.activeElement as HTMLInputElement | HTMLButtonElement,
      );
      if (!event.shiftKey && currentIndex === controls.length - 1) {
        event.preventDefault();
        controls[0]?.focus();
      } else if (event.shiftKey && currentIndex <= 0) {
        event.preventDefault();
        controls.at(-1)?.focus();
      }
    });
    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    closeActiveConfirmation = finish;
    queueMicrotask(() => cancel.focus({ preventScroll: true }));
  });
}

export function createInput(options: {
  label: string;
  value?: string;
  placeholder?: string;
  type?: HTMLInputElement['type'];
}): LabeledControl<HTMLInputElement> {
  const element = document.createElement('label');
  const label = document.createElement('span');
  const input = document.createElement('input');
  input.id = nextId('input');
  input.type = options.type ?? 'text';
  input.value = options.value ?? '';
  input.placeholder = options.placeholder ?? '';
  input.setAttribute('aria-label', options.label);
  label.id = nextId('label');
  label.textContent = options.label;
  element.htmlFor = input.id;
  element.append(label, input);
  setClasses(element, 'nako-field');
  setClasses(input, 'nako-input');
  return { element, label, input };
}

export function createSelect(options: {
  label: string;
  value?: string;
  options: Array<{ label: string; value: string }>;
}): SelectControl {
  const element = document.createElement('label');
  const label = document.createElement('span');
  const select = document.createElement('select');
  select.id = nextId('select');
  select.setAttribute('aria-label', options.label);
  label.textContent = options.label;
  for (const option of options.options) {
    const child = document.createElement('option');
    child.value = option.value;
    child.textContent = option.label;
    child.selected = option.value === options.value;
    select.append(child);
  }
  element.htmlFor = select.id;
  element.append(label, select);
  setClasses(element, 'nako-field');
  setClasses(select, 'nako-select');
  return { element, label, select };
}

function createDisclosure(label: string, kind: string): OverlayControl {
  const element = document.createElement('div');
  const trigger = createButton({ label, variant: 'ghost' });
  const content = document.createElement('div');
  const contentId = nextId(kind);
  content.id = contentId;
  content.hidden = true;
  trigger.setAttribute('aria-controls', contentId);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') !== 'true';
    trigger.setAttribute('aria-expanded', String(expanded));
    content.hidden = !expanded;
  });
  element.append(trigger, content);
  setClasses(element, `nako-${kind}`);
  setClasses(content, `nako-${kind}-content`);
  return { element, trigger, content };
}

export function createPopover(options: { label: string }): OverlayControl {
  return createDisclosure(options.label, 'popover');
}

export function createDialog(options: { title: string; description?: string }): {
  element: HTMLDivElement;
  title: HTMLHeadingElement;
  description?: HTMLParagraphElement;
  close(): void;
} {
  const element = document.createElement('div');
  const title = document.createElement('h2');
  const titleId = nextId('dialog-title');
  title.id = titleId;
  title.textContent = options.title;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-labelledby', titleId);
  element.tabIndex = -1;
  element.append(title);
  let description: HTMLParagraphElement | undefined;
  if (options.description) {
    description = document.createElement('p');
    description.id = nextId('dialog-description');
    description.textContent = options.description;
    element.setAttribute('aria-describedby', description.id);
    element.append(description);
  }
  setClasses(element, 'nako-dialog');
  const close = () => {
    element.hidden = true;
  };
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  return { element, title, description, close };
}

export function createDangerousConfirmation(options: {
  objectName: string;
  actionLabel?: string;
  onConfirm?: () => void;
}): ReturnType<typeof createDialog> & {
  confirm: HTMLButtonElement;
  cancel: HTMLButtonElement;
} {
  const dialog = createDialog({
    title: '确认危险操作',
    description: `将永久删除“${options.objectName}”，此操作无法撤销。`,
  });
  dialog.element.dataset.nakoDanger = 'true';
  const actions = document.createElement('div');
  const cancel = createButton({ label: '取消', onClick: dialog.close });
  const confirm = createButton({
    label: options.actionLabel ?? '确认删除',
    variant: 'danger',
    onClick: () => {
      options.onConfirm?.();
      dialog.close();
    },
  });
  actions.append(cancel, confirm);
  dialog.element.append(actions);
  setClasses(actions, 'nako-dialog-actions');
  return { ...dialog, confirm, cancel };
}

export function createToast(options: { message: string; tone?: ToastTone }): HTMLDivElement {
  const toast = document.createElement('div');
  toast.textContent = options.message;
  toast.setAttribute('role', options.tone === 'danger' ? 'alert' : 'status');
  toast.setAttribute('aria-live', options.tone === 'danger' ? 'assertive' : 'polite');
  setClasses(toast, 'nako-toast', `is-${options.tone ?? 'neutral'}`);
  return toast;
}

export function createTooltip(options: { text: string; triggerLabel?: string }): OverlayControl {
  const element = document.createElement('div');
  const trigger = createButton({ label: options.triggerLabel ?? '帮助', variant: 'ghost' });
  const content = document.createElement('div');
  content.id = nextId('tooltip');
  content.textContent = options.text;
  content.setAttribute('role', 'tooltip');
  content.hidden = true;
  trigger.setAttribute('aria-describedby', content.id);
  const show = () => {
    content.hidden = false;
  };
  const hide = () => {
    content.hidden = true;
  };
  trigger.addEventListener('focus', show);
  trigger.addEventListener('blur', hide);
  trigger.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', hide);
  element.append(trigger, content);
  setClasses(element, 'nako-tooltip');
  setClasses(content, 'nako-tooltip-content');
  return { element, trigger, content };
}

export function createTabs(options: {
  label: string;
  items: Array<{ id: string; label: string }>;
}): { element: HTMLDivElement; tabs: HTMLButtonElement[]; panels: HTMLDivElement[] } {
  const element = document.createElement('div');
  const tablist = document.createElement('div');
  const tabs: HTMLButtonElement[] = [];
  const panels: HTMLDivElement[] = [];
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', options.label);
  const activate = (index: number) => {
    tabs.forEach((tab, candidate) => {
      const active = candidate === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[candidate].hidden = !active;
    });
    tabs[index].focus();
  };
  options.items.forEach((item, index) => {
    const tab = createButton({ label: item.label, variant: 'ghost' });
    const panel = document.createElement('div');
    tab.id = nextId(`tab-${item.id}`);
    panel.id = nextId(`panel-${item.id}`);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.setAttribute('aria-selected', String(index === 0));
    tab.tabIndex = index === 0 ? 0 : -1;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.hidden = index !== 0;
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activate(next);
    });
    tablist.append(tab);
    element.append(panel);
    tabs.push(tab);
    panels.push(panel);
  });
  element.prepend(tablist);
  setClasses(element, 'nako-tabs');
  return { element, tabs, panels };
}

export function createMenu(options: {
  label: string;
  items: Array<{ id: string; label: string; danger?: boolean; onSelect?: () => void }>;
}): { element: HTMLDivElement; trigger: HTMLButtonElement; menu: HTMLDivElement } {
  const { element, trigger, content: menu } = createDisclosure(options.label, 'menu');
  menu.setAttribute('role', 'menu');
  options.items.forEach((item) => {
    const button = createButton({ label: item.label, variant: item.danger ? 'danger' : 'ghost' });
    button.dataset.action = item.id;
    button.setAttribute('role', 'menuitem');
    button.addEventListener('click', () => {
      item.onSelect?.();
      trigger.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      trigger.focus();
    });
    menu.append(button);
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    trigger.focus();
  });
  return { element, trigger, menu };
}


function inferShell(root: ParentNode): StableDesignReport['shell'] {
  const bodyText =
    root instanceof Document ? (root.body?.textContent ?? '') : (root.textContent ?? '');
  if (bodyText.includes('新建项目') && bodyText.includes('项目')) return 'projects';
  if (bodyText.includes('快捷键说明') || bodyText.includes('Saved ')) return 'canvas';
  return 'unknown';
}

function labelIconButtons(root: ParentNode): number {
  let labelled = 0;
  root.querySelectorAll<HTMLButtonElement>('button[title]').forEach((button) => {
    if (
      button.getAttribute('aria-label') ||
      button.getAttribute('aria-labelledby') ||
      button.textContent?.trim()
    )
      return;
    const label = button.title.trim();
    if (!label) return;
    button.setAttribute('aria-label', label);
    labelled += 1;
  });
  return labelled;
}
const settingsFocus = new WeakMap<HTMLElement, () => void>();

function enhanceSettings(root: ParentNode): string[] {
  const owned = root.querySelector<HTMLElement>('[data-nako-settings-owned="true"]');
  if (owned)
    return [...owned.querySelectorAll<HTMLElement>('[data-nako-settings-section]')].map(
      (element) => element.dataset.nakoSettingsSection!,
    );
  const settingsTitle = Array.from(root.querySelectorAll<HTMLElement>('*')).find(
    (element) =>
      element.children.length === 0 &&
      element.textContent?.trim() === '设置' &&
      !element.closest('button'),
  );
  const candidate = settingsTitle?.parentElement?.parentElement;
  const panel = candidate?.querySelector('nav')?.parentElement?.parentElement ?? null;
  if (panel) {
    panel.dataset.nakoSettings = 'true';
    panel.setAttribute('role', panel.getAttribute('role') ?? 'dialog');
    panel.setAttribute('aria-label', 'NAKO Agent 纳科画布智能体设置');
    panel.setAttribute('aria-modal', 'true');
    const sidebar = panel.querySelector('nav')?.parentElement;
    if (sidebar) sidebar.dataset.nakoSettingsSidebar = 'true';
    const content = sidebar?.nextElementSibling;
    if (content instanceof HTMLElement) content.dataset.nakoSettingsContent = 'true';
    const close = content?.querySelector<HTMLButtonElement>(
      ':scope > button, :scope > div:first-child > button',
    );
    if (close) {
      close.setAttribute('aria-label', '关闭设置');
      close.title = '关闭设置';
      if (!close.querySelector('[data-nako-settings-return]')) {
        const label = document.createElement('span');
        label.dataset.nakoSettingsReturn = 'true';
        label.textContent = '返回工作台';
        close.append(label);
        Object.assign(close.style, {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
        });
        close.querySelector('svg')?.setAttribute('width', '18');
        close.querySelector('svg')?.setAttribute('height', '18');
      }
      if (!settingsFocus.has(panel))
        settingsFocus.set(
          panel,
          activateModal(panel, () => close.click()),
        );
    }
  }
  const mapping: Record<string, string> = {
    个人设置: 'profile',
    密钥配置: 'models',
    闭源服务: 'models',
    本机服务: 'local-service',
    开源配置: 'local-service',
    开源服务: 'local-service',
  };
  const found: string[] = [];
  root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const currentLabel = button.textContent?.trim() ?? '';
    const section = mapping[currentLabel];
    if (!section) return;
    if (currentLabel === '密钥配置') button.textContent = '闭源服务';
    button.dataset.nakoSettingsSection = section;
    button.setAttribute('aria-label', button.textContent?.trim() ?? section);
    found.push(section);
  });
  const contentDomains = new Map<string, string>([
    ['本机服务', 'local-service'],
    ['火山 TOS 存储', 'storage'],
    ['HTTPS 代理', 'network'],
  ]);
  root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, a').forEach((element) => {
    const domain = contentDomains.get(element.textContent?.trim() ?? '');
    if (!domain) return;
    element.dataset.nakoSettingsDomain = domain;
    found.push(domain);
  });
  if (panel) {
    panel.dataset.nakoSettingsDomains = 'models storage local-service network';
  }
  return [...new Set(found)];
}

function enhanceStableShell(root: ParentNode = document): StableDesignReport {
  const shell = inferShell(root);
  const documentRoot = root instanceof Document ? root : (root.ownerDocument ?? document);
  if (documentRoot.body) documentRoot.body.dataset.nakoShell = shell;
  const main = root.querySelector('main');
  if (main && shell === 'projects') main.setAttribute('aria-label', 'Nako 项目');
  const settingsSections = enhanceSettings(root);
  return { shell, labelledButtons: labelIconButtons(root), settingsSections };
}

function regenerationOverlays(root: ParentNode): HTMLElement[] {
  const overlays = Array.from(
    root.querySelectorAll<HTMLElement>('[data-nako-regeneration-overlay="true"]'),
  );
  if (root instanceof HTMLElement && root.matches('[data-nako-regeneration-overlay="true"]')) {
    overlays.unshift(root);
  }
  return overlays;
}

export function installStableDesignSystem(): StableDesignSystemAdapter {
  if (browserServices.__NAKO_DESIGN_SYSTEM__) return browserServices.__NAKO_DESIGN_SYSTEM__;
  installConfirmationPointerTracking();
  if (!document.querySelector('#nako-design-system')) {
    const style = document.createElement('style');
    style.id = 'nako-design-system';
    style.textContent = DESIGN_CSS;
    document.head.append(style);
  }
  document.documentElement.dataset.nakoDesign = 'stable-v1';
  const adapter: StableDesignSystemAdapter = {
    tokens: DESIGN_TOKENS,
    enhance: enhanceStableShell,
    confirm: requestAnchoredConfirmation,
    isConfirmationSuppressed,
    resetConfirmationPreference,
    observe() {
      let queued = false;
      const observedOverlays = new WeakSet<HTMLElement>();
      const motionObserver =
        typeof IntersectionObserver === 'undefined'
          ? null
          : new IntersectionObserver((entries) => {
              entries.forEach((entry) => {
                if (!(entry.target instanceof HTMLElement)) return;
                entry.target.dataset.nakoMotion = entry.isIntersecting ? 'running' : 'paused';
              });
            });
      const observeMotion = (root: ParentNode) => {
        regenerationOverlays(root).forEach((overlay) => {
          if (observedOverlays.has(overlay)) return;
          observedOverlays.add(overlay);
          overlay.dataset.nakoMotion = 'running';
          motionObserver?.observe(overlay);
        });
      };
      const stopObservingMotion = (root: ParentNode) => {
        regenerationOverlays(root).forEach((overlay) => {
          observedOverlays.delete(overlay);
          motionObserver?.unobserve(overlay);
        });
      };
      const observer = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) observeMotion(node);
          });
          record.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) stopObservingMotion(node);
          });
        });
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          enhanceStableShell(document);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      enhanceStableShell(document);
      observeMotion(document);
      return () => {
        observer.disconnect();
        motionObserver?.disconnect();
      };
    },
  };
  browserServices.__NAKO_DESIGN_SYSTEM__ = adapter;
  adapter.enhance(document);
  return adapter;
}

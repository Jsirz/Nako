import { createStableTextElement as textElement } from '../../../canvas-ui/api/ui/design/dom';
import { badge, disclosureButton, vendorLink } from './sourceSettingsDom';

const DREAMINA_CLI_INSTALL_COMMAND = 'curl -fsSL https://jimeng.jianying.com/cli | bash';

function createDreaminaFallback() {
  const fallback = document.createElement('div');
  fallback.hidden = true;
  fallback.className =
    'space-y-3 rounded-lg border border-[var(--nk-border)] bg-[var(--nk-input)] p-4';
  fallback.setAttribute('data-nako-dreamina-fallback', 'true');
  fallback.append(
    textElement(
      'p',
      '自动安装未完成。你可以重试，或使用即梦官方命令手动安装。',
      'text-xs leading-5 text-[var(--nk-text-muted)]',
    ),
  );
  const commandRow = document.createElement('div');
  commandRow.className = 'flex items-center gap-3';
  const command = textElement(
    'code',
    DREAMINA_CLI_INSTALL_COMMAND,
    'min-w-0 flex-1 overflow-x-auto text-xs text-[var(--nk-text-secondary)]',
  );
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = '复制备用命令';
  copy.className =
    'shrink-0 rounded-lg border border-[var(--nk-border-control)] px-3 py-2 text-xs font-medium text-[var(--nk-text-secondary)] hover:border-[var(--nk-border-control)] hover:text-[var(--nk-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';
  copy.addEventListener('click', () => {
    if (!navigator.clipboard) {
      copy.textContent = '请手动复制';
      return;
    }
    void navigator.clipboard
      .writeText(DREAMINA_CLI_INSTALL_COMMAND)
      .then(() => {
        copy.textContent = '已复制';
      })
      .catch(() => {
        copy.textContent = '请手动复制';
      });
  });
  commandRow.append(command, copy);
  const installLink = vendorLink('https://jimeng.jianying.com/cli');
  installLink.textContent = '查看即梦官方安装入口';
  fallback.append(commandRow, installLink);
  return fallback;
}

export function createDreaminaCliSettingsView() {
  const vendor = document.createElement('section');
  vendor.className =
    'rounded-lg border border-[var(--nk-border)] bg-[var(--nk-surface-raised)] overflow-hidden';
  vendor.setAttribute('data-nako-source-vendor', '即梦 CLI');

  const title = document.createElement('span');
  title.className = 'flex min-w-0 items-center gap-3 text-left';
  const statusBadge = badge('检测中', 'off');
  title.append(
    textElement('span', '即梦 CLI', 'text-lg font-bold text-[var(--nk-text)]'),
    statusBadge,
  );

  const body = document.createElement('div');
  body.className = 'space-y-4 border-t border-[var(--nk-border)] px-5 py-5';
  body.setAttribute('data-nako-vendor-body', 'true');
  body.append(
    textElement(
      'p',
      'Nako 会从即梦官方源安装到当前账号的本机私有目录，无需 Git Bash，也不会申请管理员权限。',
      'text-sm leading-6 text-[var(--nk-text-secondary)]',
    ),
  );

  const state = textElement(
    'p',
    '正在检测本机安装状态…',
    'text-sm leading-6 text-[var(--nk-text-secondary)]',
  );
  state.setAttribute('role', 'status');
  state.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'flex flex-wrap items-center gap-3';
  const install = document.createElement('button');
  install.type = 'button';
  install.textContent = '检测中…';
  install.disabled = true;
  install.setAttribute('data-nako-dreamina-install', 'true');
  install.className =
    'rounded-lg bg-[var(--nk-primary)] px-5 py-3 text-sm font-bold text-[var(--nk-on-primary)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nk-focus)] disabled:cursor-not-allowed disabled:opacity-40';
  const login = document.createElement('button');
  login.type = 'button';
  login.textContent = '登录即梦';
  login.hidden = true;
  login.setAttribute('data-nako-dreamina-login', 'true');
  login.className =
    'rounded-lg border border-[var(--nk-border-control)] px-5 py-3 text-sm font-medium text-[var(--nk-text)] hover:border-[var(--nk-border-control)] hover:text-[var(--nk-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40';
  const browser = document.createElement('select');
  browser.setAttribute('aria-label', '即梦授权浏览器');
  browser.className =
    'rounded-lg border border-[var(--nk-border-control)] bg-[var(--nk-input)] px-3 py-3 text-sm text-[var(--nk-text)]';
  for (const [value, label] of [
    ['default', '默认浏览器'],
    ['edge', 'Microsoft Edge'],
    ['chrome', 'Google Chrome'],
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    browser.append(option);
  }
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.textContent = '刷新账号';
  refresh.className = login.className;
  refresh.setAttribute('data-nako-dreamina-refresh', 'true');
  actions.append(browser, login, refresh, install);

  const loginDetails = document.createElement('div');
  loginDetails.hidden = true;
  loginDetails.className =
    'space-y-3 rounded-lg border border-[var(--nk-info)] bg-[var(--nk-info-bg)] p-4';
  loginDetails.setAttribute('data-nako-dreamina-login-details', 'true');
  const loginInstruction = textElement(
    'p',
    '在即梦官方页面核对下方用户码，授权完成后 Nako 会自动确认。',
    'text-xs leading-5 text-[var(--nk-text-secondary)]',
  );
  const loginCode = textElement(
    'code',
    '',
    'block select-all break-all rounded-md border border-[var(--nk-border)] bg-[var(--nk-input)] px-3 py-2 text-sm text-[var(--nk-text)]',
  );
  loginCode.setAttribute('data-nako-dreamina-user-code', 'true');
  const loginLink = document.createElement('a');
  loginLink.target = '_blank';
  loginLink.rel = 'noopener noreferrer';
  loginLink.textContent = '打开即梦官方授权页';
  loginLink.className =
    'inline-flex text-sm font-medium text-[var(--nk-info)] hover:text-[var(--nk-info)]';
  loginLink.setAttribute('data-nako-dreamina-login-link', 'true');
  loginDetails.append(loginInstruction, loginCode, loginLink);

  const fallback = createDreaminaFallback();
  body.append(state, actions, loginDetails, fallback);
  const toggle = disclosureButton(
    title,
    body,
    'data-nako-vendor-toggle',
    'flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--nk-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400',
  );
  vendor.append(toggle, body);
  return {
    vendor,
    statusBadge,
    state,
    install,
    login,
    browser,
    refresh,
    loginDetails,
    loginCode,
    loginLink,
    fallback,
  };
}

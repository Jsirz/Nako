import type { SourceSettingsClient } from './sourceSettingsClient';
import type { SettingsScope } from '../../../kernel/ui/settingsScope';
import { isOfficialDreaminaLoginUrl } from './dreaminaLoginUrl';
import { createDreaminaCliSettingsView } from './dreaminaCliSettingsRender';
import { badge } from './sourceSettingsDom';

function createDreaminaCliLogin(
  client: SourceSettingsClient,
  scope: SettingsScope,
  view: ReturnType<typeof createDreaminaCliSettingsView>,
  refreshAccount: () => Promise<void>,
) {
  const { vendor, state, login, browser, loginDetails, loginCode, loginLink } = view;
  let authenticated = false;
  let loginPollTimer: number | null = null;
  let loginDeadline = 0;
  const stopLoginPolling = () => {
    if (loginPollTimer !== null) window.clearTimeout(loginPollTimer);
    loginPollTimer = null;
  };
  scope.onDispose(stopLoginPolling);
  const showLoginDetails = (
    result: Awaited<ReturnType<SourceSettingsClient['loginDreaminaCli']>>,
  ) => {
    const validLink = isOfficialDreaminaLoginUrl(result.verificationUri, result.userCode);
    loginDetails.hidden = !(validLink && result.userCode);
    loginCode.textContent = result.userCode || '';
    if (validLink) loginLink.href = result.verificationUri!;
    else loginLink.removeAttribute('href');
  };
  const applyLoginResult = (
    result: Awaited<ReturnType<SourceSettingsClient['loginDreaminaCli']>>,
    refreshIdentity = true,
  ) => {
    if (!scope.active()) return;
    state.textContent = result.message;
    if (result.status === 'awaiting-authorization') {
      login.disabled = true;
      login.textContent = '等待授权…';
      showLoginDetails(result);
      const remoteDeadline = Date.parse(result.expiresAt || '');
      loginDeadline = Number.isFinite(remoteDeadline)
        ? remoteDeadline
        : Date.now() + 5 * 60 * 1_000;
      return;
    }
    stopLoginPolling();
    loginDetails.hidden = true;
    if (result.status === 'authenticated') {
      authenticated = true;
      login.disabled = false;
      login.textContent = '切换账号';
      if (refreshIdentity) void refreshAccount();
      window.dispatchEvent(new CustomEvent('nako:model-sources-changed'));
      return;
    }
    authenticated = false;
    login.disabled = false;
    login.textContent = result.status === 'idle' ? '登录即梦' : '重试登录';
  };
  const pollLogin = async () => {
    if (!scope.active() || !vendor.isConnected) {
      stopLoginPolling();
      return;
    }
    if (loginDeadline > 0 && Date.now() >= loginDeadline) {
      applyLoginResult({
        status: 'expired',
        loginRunning: false,
        retryable: true,
        message: '即梦登录已超时，请重新发起登录。',
      });
      return;
    }
    try {
      const result = await client.checkDreaminaCliLogin();
      if (!scope.active()) return;
      applyLoginResult(result);
      if (result.status === 'awaiting-authorization') {
        const delay = Math.min(5_000, Math.max(1_000, Number(result.pollAfterMs) || 1_000));
        loginPollTimer = window.setTimeout(() => {
          void pollLogin();
        }, delay);
      }
    } catch (error: unknown) {
      if (!scope.active()) return;
      stopLoginPolling();
      login.disabled = false;
      login.textContent = '重试登录';
      state.textContent = error instanceof Error ? error.message : '检测即梦登录失败。';
    }
  };

  const openLogin = (force: boolean) => {
    if (login.disabled || !scope.active()) return;
    stopLoginPolling();
    login.disabled = true;
    login.textContent = '正在打开…';
    state.textContent = '正在打开即梦官方 OAuth 登录…';
    void client
      .loginDreaminaCli({ force, browser: browser.value as 'default' | 'edge' | 'chrome' })
      .then((result) => {
        applyLoginResult(result);
        if (result.status === 'awaiting-authorization') void pollLogin();
      })
      .catch((error: unknown) => {
        if (!scope.active()) return;
        login.disabled = false;
        login.textContent = '重新登录';
        state.textContent = error instanceof Error ? error.message : '启动即梦登录失败。';
      });
  };
  login.addEventListener('click', () => openLogin(authenticated));
  loginLink.addEventListener('click', (event) => {
    event.preventDefault();
    openLogin(false);
  });
  return { applyLoginResult, pollLogin };
}

export function dreaminaCliVendor(client: SourceSettingsClient, scope: SettingsScope) {
  const view = createDreaminaCliSettingsView();
  const { vendor, state, statusBadge, install, login, refresh, fallback } = view;
  const refreshAccount = async () => {
    refresh.disabled = true;
    try {
      const status = await client.getDreaminaCliStatus();
      if (scope.active()) applyStatus(status);
    } catch (error) {
      if (scope.active())
        state.textContent = error instanceof Error ? error.message : '检测账号失败，请重试。';
    } finally {
      if (scope.active()) refresh.disabled = false;
    }
  };
  const { applyLoginResult, pollLogin } = createDreaminaCliLogin(client, scope, view, refreshAccount);
  const applyStatus = (
    status: Awaited<ReturnType<SourceSettingsClient['getDreaminaCliStatus']>>,
  ) => {
    if (!scope.active()) return;
    install.disabled = !status.installable;
    login.hidden = status.status !== 'installed';
    login.disabled = Boolean(status.loginRunning);
    fallback.hidden = true;
    if (status.status === 'installed') {
      statusBadge.textContent = '已安装';
      statusBadge.className = badge('已安装', 'on').className;
      install.textContent = '检查更新';
      login.textContent = status.loginRunning ? '登录进行中…' : '登录即梦';
      state.textContent =
        `即梦 CLI ${status.version || ''} 已就绪。登录后即可在 Nako 中使用。`.replace(
          '  ',
          ' ',
        );
      if (status.login) {
        applyLoginResult(status.login, false);
        if (status.account)
          state.textContent = `${status.account.nickname || '即梦账号'} · UID ${status.account.uid}`;
        if (status.login.status === 'awaiting-authorization') void pollLogin();
      }
      return;
    }
    statusBadge.textContent = status.status === 'unsupported' ? '不支持' : '未安装';
    statusBadge.className = badge('未安装', 'off').className;
    install.textContent = status.status === 'invalid' ? '重新安装' : '一键安装';
    state.textContent =
      status.message ||
      (status.status === 'unsupported'
        ? '当前系统不支持自动安装。'
        : '尚未安装。点击一次即可完成，不需要打开终端。');
  };

  install.addEventListener('click', () => {
    if (install.disabled || !scope.active()) return;
    install.disabled = true;
    login.hidden = true;
    fallback.hidden = true;
    install.textContent = '正在安装…';
    state.textContent = '正在从即梦官方源下载并校验，请保持网络连接。';
    void client
      .installDreaminaCli()
      .then(applyStatus)
      .catch((error: unknown) => {
        if (!scope.active()) return;
        statusBadge.textContent = '安装失败';
        statusBadge.className = badge('未安装', 'off').className;
        install.disabled = false;
        install.textContent = '重试安装';
        state.textContent = error instanceof Error ? error.message : '安装即梦 CLI 失败。';
        fallback.hidden = false;
      });
  });
  refresh.addEventListener('click', () => {
    void refreshAccount();
  });
  void client
    .getDreaminaCliStatus()
    .then(applyStatus)
    .catch((error: unknown) => {
      if (!scope.active()) return;
      statusBadge.textContent = '检测失败';
      statusBadge.className = badge('未安装', 'off').className;
      install.disabled = false;
      install.textContent = '重试安装';
      state.textContent = error instanceof Error ? error.message : '检测即梦 CLI 失败。';
      fallback.hidden = false;
    });
  return vendor;
}

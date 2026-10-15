import { createStableElement as element } from '../../../kernel/ui/dom';
import type { RunningHubWebAppClient } from './workflowManagerClient';
import { configureApiTokenInput, control, externalControl, message, stageHeading, RUNNINGHUB_CN_KEY_URL, RUNNINGHUB_GLOBAL_KEY_URL } from './runningHubControls';

export function appendRunningHubQuickCredentials(
  root: HTMLElement,
  client: RunningHubWebAppClient,
  connectDomesticOnly?: { onConnected: () => void | Promise<void> },
) {
  const credentials = element('section', 'rhwm-quick-credentials rhwm-stage is-account');
  credentials.setAttribute('data-nako-rh-stage', 'credentials');
  const credentialTitleId = `rhwm-credential-stage-${Math.random().toString(36).slice(2)}`;
  credentials.setAttribute('aria-labelledby', credentialTitleId);
  const quickNotice = element('p', 'rhwm-quick-key-status');
  const makeKey = (siteId: 'cn' | 'global', label: string, placeholder: string, linkLabel: string, href: string) => {
    const wrapper = element('label', 'rhwm-quick-key');
    const head = element('span', 'rhwm-quick-key-head');
    head.append(document.createTextNode(label), externalControl(linkLabel, href, siteId));
    const input = configureApiTokenInput(element('input', 'rhwm-input'), `runninghub-${siteId}-api-token`);
    input.placeholder = placeholder;
    input.setAttribute('data-nako-rh-quick-key', siteId);
    wrapper.append(head, input);
    return { wrapper, input };
  };
  const cn = makeKey('cn', 'CN 国内站 API Key', '输入 runninghub.cn API Key', '获取连接', RUNNINGHUB_CN_KEY_URL);
  const global = makeKey('global', 'AI 海外站 API Key', '输入 runninghub.ai API Key', '获取连接', RUNNINGHUB_GLOBAL_KEY_URL);
  const save = control('保存并验证', true);
  save.classList.add('is-commit');
  let quickCredentialStatus = { cnConfigured: false, globalConfigured: false };
  void client.getRunningHubCredentialStatus().then((status) => {
    quickCredentialStatus = status;
    cn.input.placeholder = status.cnConfigured ? '已长期保存；仅更换时输入新 Key' : '输入 runninghub.cn API Key';
    global.input.placeholder = status.globalConfigured ? '已长期保存；仅更换时输入新 Key' : '输入 runninghub.ai API Key';
    quickNotice.textContent = status.cnConfigured && status.globalConfigured
      ? 'CN 与 AI 站 Key 已长期保存在当前账号，本次无需重新输入。'
      : status.cnConfigured ? 'CN Key 已长期保存在当前账号；AI 站未配置。'
        : status.globalConfigured ? 'AI 站 Key 已长期保存在当前账号；CN 未配置。'
          : 'Key 将按当前账号长期保存在本机，重启和更新后继续使用。';
  }).catch(() => undefined);
  save.addEventListener('click', () => {
    void (async () => {
      const cnValue = cn.input.value.trim();
      const globalValue = global.input.value.trim();
      const references: Array<'runninghub-cn' | 'runninghub-global'> = [];
      if (cnValue || quickCredentialStatus.cnConfigured) references.push('runninghub-cn');
      if (!connectDomesticOnly && (globalValue || quickCredentialStatus.globalConfigured)) references.push('runninghub-global');
      if (!references.length) {
        quickNotice.textContent = '请先输入至少一个 RunningHub API Key。';
        quickNotice.className = 'rhwm-quick-key-status is-error';
        return;
      }
      const previous = save.textContent || '';
      save.disabled = true;
      save.textContent = '验证中…';
      try {
        if (cnValue || globalValue) {
          await client.saveRunningHubCredentials({ cnApiKey: cnValue, globalApiKey: globalValue });
          quickCredentialStatus.cnConfigured ||= Boolean(cnValue);
          quickCredentialStatus.globalConfigured ||= Boolean(globalValue);
          cn.input.placeholder = quickCredentialStatus.cnConfigured ? '已长期保存；仅更换时输入新 Key' : '输入 runninghub.cn API Key';
          global.input.placeholder = quickCredentialStatus.globalConfigured ? '已长期保存；仅更换时输入新 Key' : '输入 runninghub.ai API Key';
        }
        cn.input.value = '';
        global.input.value = '';
        await Promise.all(references.map((credentialRef) => client.validateRunningHubCredential(credentialRef)));
        quickNotice.textContent = references.map((credentialRef) => credentialRef === 'runninghub-cn'
          ? '国内站 API Key 验证通过' : '海外站 API Key 验证通过').join('；');
        quickNotice.className = 'rhwm-quick-key-status is-success';
        if (root.isConnected) await connectDomesticOnly?.onConnected();
      } catch (error) {
        quickNotice.textContent = message(error);
        quickNotice.className = 'rhwm-quick-key-status is-error';
      } finally {
        save.disabled = false;
        save.textContent = previous;
      }
    })();
  });
  credentials.append(stageHeading('01', '连接 RunningHub 账号', '这里只填写 API Key；保存后由当前账号在本机长期使用。', credentialTitleId), cn.wrapper, global.wrapper, save, quickNotice);
  root.append(credentials);
  if (connectDomesticOnly) {
    global.wrapper.remove();
    save.textContent = '保存连接，返回官方推荐';
  }
}

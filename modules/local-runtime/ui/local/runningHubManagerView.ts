import { createStableElement as element } from '../../../kernel/ui/dom';
import { configureApiTokenInput, control, externalControl, RUNNINGHUB_CN_KEY_URL, RUNNINGHUB_GLOBAL_KEY_URL } from './runningHubControls';

export function createRunningHubManagerView(onReset: () => void) {
  const head = element('div', 'rhwm-head');
  const headCopy = element('div');
  headCopy.append(
    element('p', 'rhwm-kicker', 'RUNNINGHUB WEBAPP / 云端应用'),
    element('h3', 'rhwm-title', '云端工作流'),
    element('p', 'rhwm-subtitle', '粘贴 RunningHub 应用详情或 AI 应用 API 手册链接，也可直接输入应用 ID。云端应用作为黑盒执行，只展示 RunningHub 实际开放的输入。'),
  );
  head.append(headCopy);
  const credentials = element('section', 'rhwm-credentials');
  const credentialCopy = element('div', 'rhwm-section-copy');
  credentialCopy.append(
    element('strong', '', 'RunningHub 连接'),
    element('span', '', '与“闭源服务”共用安全凭证，这里单独提供云端工作流入口。'),
  );
  const cnCard = element('div', 'rhwm-key-card');
  const cnHead = element('div', 'rhwm-key-head');
  const cnTitle = element('label');
  cnTitle.htmlFor = 'nako-runninghub-cn-key';
  const cnDot = element('i', 'rhwm-status-dot');
  cnTitle.append(cnDot, document.createTextNode('国内站 API Key'));
  const cnState = element('span', 'rhwm-key-state', '未配置');
  cnHead.append(cnTitle, cnState);
  const cnKey = configureApiTokenInput(element('input', 'rhwm-input'), 'runninghub-cn-api-token');
  cnKey.id = 'nako-runninghub-cn-key';
  cnKey.setAttribute('data-nako-rh-key', 'cn');
  cnKey.placeholder = '输入 runninghub.cn API Key';
  const cnFoot = element('div', 'rhwm-key-foot');
  cnFoot.append(element('span', 'rhwm-key-state', '国内站 · 支持个人与团队密钥'), externalControl('一键获取国内站 API Key', RUNNINGHUB_CN_KEY_URL, 'cn'));
  cnCard.append(cnHead, cnKey, cnFoot);
  const globalCard = element('div', 'rhwm-key-card');
  const globalHead = element('div', 'rhwm-key-head');
  const globalTitle = element('label');
  globalTitle.htmlFor = 'nako-runninghub-global-key';
  const globalDot = element('i', 'rhwm-status-dot');
  globalTitle.append(globalDot, document.createTextNode('海外站 API Key'));
  const globalState = element('span', 'rhwm-key-state', '未配置');
  globalHead.append(globalTitle, globalState);
  const globalKey = configureApiTokenInput(element('input', 'rhwm-input'), 'runninghub-global-api-token');
  globalKey.id = 'nako-runninghub-global-key';
  globalKey.setAttribute('data-nako-rh-key', 'global');
  globalKey.placeholder = '输入 runninghub.ai API Key';
  const globalFoot = element('div', 'rhwm-key-foot');
  globalFoot.append(element('span', 'rhwm-key-state', '海外站 · 独立账号与密钥'), externalControl('获取海外站 API Key', RUNNINGHUB_GLOBAL_KEY_URL, 'global'));
  globalCard.append(globalHead, globalKey, globalFoot);
  const credentialActions = element('div', 'rhwm-credential-actions');
  credentialActions.append(element('span', '', '密钥按当前账号长期保存在本机；重启和更新后继续使用。验证只查询账户状态，不会产生费用。'));
  const saveKeys = control('保存并验证', true);
  saveKeys.classList.add('is-commit');
  const resetPaidWarning = control('付费提醒已开启');
  resetPaidWarning.addEventListener('click', onReset);
  credentialActions.append(resetPaidWarning, saveKeys);
  credentials.append(credentialCopy, cnCard, globalCard, credentialActions);
  return { head, credentials, cnCard, cnDot, cnState, cnKey, globalCard, globalDot, globalState, globalKey, saveKeys, resetPaidWarning };
}

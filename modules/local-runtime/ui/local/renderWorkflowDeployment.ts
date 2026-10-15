import { createStableElement as element } from '../../../kernel/ui/dom';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { button, field } from './workflowManagerControls';
import { isRunningHubRunner } from './workflowManagerMetadata';
import { ManagerState } from './workflowManagerTypes';

export function renderWorkflowDeployment(
  state: ManagerState,
  render: () => void,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  appendPollingResume: (actions: HTMLElement) => void,
  panel: HTMLDivElement,
  panelHeading: (title: string, copy: string, actions?: HTMLElement) => HTMLDivElement,
) {
  const remote = state.deploymentRunner === 'runninghub-workflow';
  const verify = button(
    state.deployment ? '重新验证' : remote ? '验证 RunningHub' : '验证本机 ComfyUI',
    'primary',
  );
  const runner = element('select', 'fwm-select');
  runner.append(
    new Option('本地 ComfyUI', 'local-comfyui'),
    ...(UI_FEATURES.runningHub ? [new Option('RunningHub Workflow API', 'runninghub-workflow')] : []),
  );
  runner.value = state.deploymentRunner;
  runner.addEventListener('change', () => {
    state.deploymentRunner = runner.value as ManagerState['deploymentRunner'];
    render();
  });
  const server = element('input', 'fwm-input');
  server.value =
    state.deployment?.runner === 'local-comfyui'
      ? state.deployment.serverUrl || '127.0.0.1:8188'
      : '127.0.0.1:8188';
  const site = element('select', 'fwm-select');
  site.append(
    new Option('RunningHub CN 站', 'runninghub-cn'),
    new Option('RunningHub AI 站', 'runninghub-global'),
  );
  site.value =
    state.deployment?.runner === 'runninghub-workflow'
      ? state.deployment.credentialRef || 'runninghub-cn'
      : 'runninghub-cn';
  const remoteWorkflowId = element('input', 'fwm-input');
  remoteWorkflowId.placeholder = 'RunningHub workflowId';
  remoteWorkflowId.value =
    state.deployment?.runner === 'runninghub-workflow'
      ? state.deployment.remoteWorkflowId || ''
      : '';
  const override = element('input', 'fwm-check');
  override.type = 'checkbox';
  override.checked =
    state.deployment?.runner === 'runninghub-workflow' &&
    Boolean(state.deployment.includeWorkflowJson);
  const timeout = element('select', 'fwm-select');
  const configuredTimeoutMs = state.deployment?.timeoutMs ?? 60 * 60000;
  const timeoutOptions = [
    ['10 分钟', '600000'],
    ['30 分钟', '1800000'],
    ['60 分钟（推荐）', '3600000'],
    ['2 小时', '7200000'],
  ];
  if (!timeoutOptions.some(([, value]) => Number(value) === configuredTimeoutMs)) {
    timeoutOptions.push([
      `${Math.max(1, Math.round(configuredTimeoutMs / 60000))} 分钟（当前）`,
      String(configuredTimeoutMs),
    ]);
  }
  for (const [label, value] of timeoutOptions) {
    const option = element('option');
    option.value = value;
    option.textContent = label;
    timeout.append(option);
  }
  timeout.value = String(configuredTimeoutMs);
  const cleanup = button(state.cleanupGrantId ? '已授权输入清理' : '授权输入目录清理');
  cleanup.addEventListener('click', () => {
    void runBusy('请选择 ComfyUI 的 input 目录…', async () => {
      const grant = await client.chooseDirectory('comfy-input-cleanup');
      state.cleanupGrantId = grant.id;
      setNotice('已创建独立清理授权；只会删除 Nako 本次上传的文件。', 'success');
    });
  });
  verify.addEventListener('click', () => {
    void runBusy('正在连接运行目标并读取参数提示…', async () => {
      const result = await client.createDeployment(state.selected!.id, {
        runner: state.deploymentRunner,
        ...(remote
          ? {
              baseUrl:
                site.value === 'runninghub-global'
                  ? 'https://www.runninghub.ai'
                  : 'https://www.runninghub.cn',
              credentialRef: site.value as 'runninghub-cn' | 'runninghub-global',
              remoteWorkflowId: remoteWorkflowId.value,
              includeWorkflowJson: override.checked,
            }
          : { serverUrl: server.value }),
        timeoutMs: Number(timeout.value),
        ...(!remote && state.cleanupGrantId ? { inputCleanupGrantId: state.cleanupGrantId } : {}),
      });
      state.deployment = { ...result.deployment, createdAt: new Date().toISOString() };
      state.candidates = result.candidates;
      state.bindingSet = undefined;
      state.run = undefined;
      state.activeStage = 2;
      setNotice(
        remote
          ? `RunningHub 验证通过：识别到 ${result.deployment.nodeTypeCount} 类相关节点。`
          : `ComfyUI 已连接，找到 ${state.candidates.length} 个可外置参数；自定义节点由运行测试最终确认。`,
        'success',
      );
    });
  });
  const actions = element('div', 'fwm-actions');
  actions.append(verify);
  appendPollingResume(actions);
  panel.append(
    panelHeading(
      '验证运行环境',
      remote
        ? '只读取 RunningHub 远程工作流快照，不提交付费任务。'
        : '只连接 127.0.0.1 / localhost；这里只验证，不会提交生成任务。',
      actions,
    ),
    element('div', 'fwm-grid'),
  );
  const grid = panel.lastElementChild!;
  grid.append(field('运行器', runner));
  if (remote) {
    const overrideLabel = element('label', 'fwm-row');
    overrideLabel.append(override, element('span', '', '提交完整 API Format 覆盖远程模板'));
    grid.append(
      field('RunningHub 站点', site),
      field('远程 workflowId', remoteWorkflowId),
      field('单次观察时长', timeout),
      overrideLabel,
    );
  } else {
    grid.append(field('ComfyUI 地址', server), field('单次观察时长', timeout));
  }
  const summary = element('div', 'fwm-summary');
  summary.append(
    element(
      'span',
      '',
      state.deployment
        ? isRunningHubRunner(state.deployment.runner)
          ? `RunningHub · ${state.deployment.remoteWorkflowId} · ${state.candidates.length} 个可外置参数`
          : `ComfyUI ${state.deployment.comfyuiVersion} · ${state.candidates.length} 个可外置参数`
        : '等待连接运行目标',
    ),
    ...(remote ? [] : [cleanup]),
  );
  panel.append(summary);
}

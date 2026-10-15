import { appendWorkflowTestAssets } from './appendWorkflowTestAssets';
import { appendWorkflowVerificationRecord } from './appendWorkflowVerificationRecord';
import {
  requestAnchoredConfirmation,
  RUNNINGHUB_PAID_CONFIRMATION_KEY,
} from '../../../kernel/ui/designSystem';
import { createStableElement as element } from '../../../kernel/ui/dom';
import { appendWorkflowBindingSection } from './appendWorkflowBindingSection';
import { appendWorkflowRunProgress } from './appendWorkflowRunProgress';
import { createWorkflowBindingNameEditor } from './createWorkflowBindingNameEditor';
import { persistWorkflowBindingLabels } from './persistWorkflowBindingLabels';
import { safeKey } from './workflowManagerBindings';
import type { BindingSet, WorkflowManagerClient } from './workflowManagerClient';
import { button, field, messageFor } from './workflowManagerControls';
import { isRunningHubRunner } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { ManagerState } from './workflowManagerTypes';
import { persistRunReference } from './workflowRunSession';

export function renderWorkflowTest(
  state: ManagerState,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  session: WorkflowManagerSession,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  pollRun: (runId: string, token: number) => Promise<void>,
  appendPollingResume: (actions: HTMLElement) => void,
  panel: HTMLDivElement,
  panelHeading: (title: string, copy: string, actions?: HTMLElement) => HTMLDivElement,
  render: () => void,
  createNodeTitleControl: () => HTMLInputElement,
  syncCurrentCanvasNode: () => Promise<boolean>,
  valueControl: (
    binding: BindingSet['bindings'][number],
  ) => HTMLDivElement | HTMLSelectElement | HTMLTextAreaElement,
  renderCleanupSummary: () => void,
) {
  return () => {
    const preflight = button('只检查', 'quiet');
    const run = button('运行真实测试', 'primary');
    const actions = element('div', 'fwm-actions');
    actions.append(preflight, run);
    if (state.run?.status === 'loading') {
      if (state.run.phase === 'observation-paused') {
        const continueObservation = button('继续观察', 'primary');
        continueObservation.addEventListener('click', () => {
          void runBusy('正在继续观察同一 ComfyUI 任务…', async () => {
            state.run = await client.continueObservation(state.run!.runId);
            session.pollToken += 1;
            const token = session.pollToken;
            setNotice('已继续观察同一 ComfyUI 任务；不会重复提交工作流。');
            void pollRun(state.run.runId, token).catch((error) => {
              setNotice(messageFor(error), 'error');
            });
          });
        });
        actions.append(continueObservation);
      }
      const cancel = button('取消');
      cancel.addEventListener('click', () => {
        void runBusy('正在安全取消任务…', async () => {
          state.run = await client.cancelRun(state.run!.runId);
          setNotice(
            isRunningHubRunner(state.run.runner)
              ? '画布已停止等待；请到 RunningHub 任务列表确认远程状态。'
              : '取消请求已发送，正在确认 ComfyUI 端状态。',
          );
        });
      });
      actions.append(cancel);
    }
    appendPollingResume(actions);
    panel.append(
      panelHeading(
        '填写参数并测试',
        isRunningHubRunner(state.deployment?.runner)
          ? '“只检查”不会上传素材或计费；真实测试会提交一次 RunningHub 付费任务。'
          : '“只检查”不会上传素材或运行；真实测试会在本机 ComfyUI 产生一次任务。',
        actions,
      ),
    );
    appendWorkflowVerificationRecord(state, panel, render);
    const project = element('select', 'fwm-select');
    for (const item of state.projects) {
      const option = new Option(item.title, item.id);
      option.selected = item.id === state.projectId;
      project.append(option);
    }
    if (!state.projectId && project.value) state.projectId = project.value;
    project.addEventListener('change', () => {
      state.projectId = project.value;
      for (const binding of state.bindingSet!.bindings) {
        if (binding.control.kind === 'asset') delete state.values[binding.key];
      }
      render();
    });
    const meta = element('div', 'fwm-test-meta');
    meta.append(field('画布节点名称', createNodeTitleControl()), field('测试结果保存到', project));
    const metaSection = element('section', 'fwm-test-section');
    const metaHead = element('div', 'fwm-test-section-head');
    metaHead.append(
      element('strong', 'fwm-test-section-title', '运行信息'),
      element('span', 'fwm-test-section-copy', '名称用于画布节点；测试结果保存到所选项目。'),
    );
    metaSection.append(metaHead, meta);
    panel.append(metaSection);

    const bindings = state.bindingSet!.bindings;
    const candidateFor = (binding: BindingSet['bindings'][number]) =>
      state.candidates.find((item, index) => binding.key === safeKey(item, index));
    const textKinds = new Set(['text', 'textarea', 'string', 'prompt', 'multiline']);
    const textBindings = bindings.filter(
      (binding) =>
        binding.control.kind !== 'asset' &&
        textKinds.has(String(binding.control.kind || '').toLowerCase()),
    );
    const parameterBindings = bindings.filter(
      (binding) => binding.control.kind !== 'asset' && !textBindings.includes(binding),
    );
    const assetBindings = bindings.filter((binding) => binding.control.kind === 'asset');
    const bindingLabelInputs = new Map<string, HTMLInputElement>();
    const initialBindingLabels = new Map<string, string>();

    const persistBindingLabels = () =>
      persistWorkflowBindingLabels(
        state,
        bindingLabelInputs,
        initialBindingLabels,
        bindings,
        client,
        syncCurrentCanvasNode,
      )();

    const bindingNameEditor = (
      binding: BindingSet['bindings'][number],
      displayLabel = binding.label,
    ) =>
      createWorkflowBindingNameEditor(
        initialBindingLabels,
        runBusy,
        persistBindingLabels,
        setNotice,
        bindingLabelInputs,
      )(binding, displayLabel);

    const appendBindingSection = (
      title: string,
      copy: string,
      sectionBindings: BindingSet['bindings'],
      wide = false,
    ) =>
      appendWorkflowBindingSection(bindingNameEditor, valueControl, candidateFor, panel)(
        title,
        copy,
        sectionBindings,
        wide,
      );

    appendBindingSection(
      '提示内容',
      '长文本独占整行，避免和数值控件互相挤压。',
      textBindings,
      true,
    );
    appendBindingSection('生成参数', '尺寸、时长、步数和选项集中排列。', parameterBindings);

    appendWorkflowTestAssets(assetBindings, panel, bindingNameEditor, valueControl, candidateFor);
    if (state.run?.status === 'loading') {
      appendWorkflowRunProgress(state, panel);
    }
    renderCleanupSummary();
    const request = () => ({
      deploymentId: state.deployment!.id,
      bindingSetId: state.bindingSet!.id,
      projectId: state.projectId,
      values: state.values,
    });
    preflight.disabled = state.run?.status === 'loading';
    run.disabled = state.run?.status === 'loading';
    preflight.addEventListener('click', () => {
      void runBusy('正在执行无副作用检查…', async () => {
        const result = await client.preflight(state.selected!.id, request());
        setNotice(`检查通过：${result.checks.map((check) => check.message).join('；')}`, 'success');
      });
    });
    run.addEventListener('click', () => {
      void runBusy('正在创建测试任务…', async () => {
        const paid = isRunningHubRunner(state.deployment?.runner);
        if (
          paid &&
          !(await requestAnchoredConfirmation({
            anchor: run,
            intent: 'paid',
            title: '提交 RunningHub 付费测试？',
            description: '本次真实测试会产生费用；取消后远端任务仍可能继续。',
            confirmLabel: '确认并测试',
            rememberKey: RUNNINGHUB_PAID_CONFIRMATION_KEY,
          }))
        )
          return;
        state.run = await client.startRun(state.selected!.id, {
          ...request(),
          confirmExecution: true,
          ...(paid ? { confirmPaidExecution: true } : {}),
        });
        persistRunReference(state.selected!.id, state.run.runId);
        session.pollToken += 1;
        const token = session.pollToken;
        setNotice('测试任务已创建；关闭设置不会中断任务。');
        void pollRun(state.run.runId, token).catch((error) => {
          setNotice(messageFor(error), 'error');
        });
      });
    });
  };
}

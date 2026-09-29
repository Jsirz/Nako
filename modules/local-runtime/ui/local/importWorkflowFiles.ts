import { browserServices } from '../../../kernel/browser';
import {
autoPair,
quickBindingCandidates,
safeKey,
suggestedBindingLabel,
} from './workflowManagerBindings';
import type {
WorkflowDefinition,
WorkflowManagerClient,
WorkflowRun
} from './workflowManagerClient';
import { messageFor } from './workflowManagerControls';
import { focusInsertedWorkflow,incompleteExportNotice } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { ManagerState } from './workflowManagerTypes';

export function importWorkflowFiles(
  host: HTMLElement,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  session: WorkflowManagerSession,
  state: ManagerState,
  client: WorkflowManagerClient,
  hydrate: (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => Promise<void>,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
) {
  return (files: File[]) => {
    if (!files.length || host.dataset.busy === 'true') return;
    void runBusy('正在校验并保存原始工作流字节…', async () => {
      const quickImport = session.uploadMode === 'quick';
      let definitionId = session.uploadMode === 'append' ? state.selected?.id : undefined;
      let definition: WorkflowDefinition | undefined;
      for (const file of files) {
        definition = await client.importArtifact({ file, definitionId });
        definitionId = definition.id;
      }
      definition = await autoPair(client, definition!);
      state.definitions = await client.listDefinitions();
      await hydrate(definition);
      if (quickImport) {
        if (!definition.executionPlan) {
          session.managerView = 'manager';
          state.activeStage = 0;
          setNotice('已保存 UI Format；还需要对应的 API Format。请在高级管理中补充文件。', 'error');
          return;
        }
        try {
          const deployed = await client.createDeployment(definition.id, {
            runner: 'local-comfyui',
            serverUrl: '127.0.0.1:8188',
            timeoutMs: 60 * 60000,
          });
          state.deployment = { ...deployed.deployment, createdAt: new Date().toISOString() };
          state.candidates = deployed.candidates;
          const selected = quickBindingCandidates(state.candidates);
          state.bindingSet = await client.createBindingSet(definition.id, {
            deploymentId: state.deployment.id,
            name: '自动识别参数',
            bindings: selected.map((candidate) => ({
              candidateId: candidate.id,
              key: safeKey(candidate, state.candidates.indexOf(candidate)),
              label: suggestedBindingLabel(candidate),
            })),
          });
          const blueprint = await client.createCanvasNode(definition.id, {
            deploymentId: state.deployment.id,
            bindingSetId: state.bindingSet.id,
            title: definition.name,
          });
          const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
          if (!adapter) throw new Error('画布节点适配器尚未加载，请刷新后重试。');
          const insertion = await adapter.addToCanvas(blueprint);
          focusInsertedWorkflow(insertion.nodeIds);
          await loadDeployedRecords();
          setNotice(
            `${definition.name} 已作为未验证节点加入画布；首次运行时会检查配置。${incompleteExportNotice(definition)}`,
            'success',
          );
          return;
        } catch (error) {
          session.managerView = 'manager';
          state.activeStage = 1;
          setNotice(
            `工作流已导入，但自动连接本机 ComfyUI 未完成：${messageFor(error)} 请在高级管理中继续。`,
            'error',
          );
          return;
        }
      }
      setNotice(
        definition.executionPlan
          ? `工作流已导入，执行计划可以验证。${incompleteExportNotice(definition)}`
          : '已保存 UI Format（节点布局文件）；请从 ComfyUI 开发者模式导出对应的 API Format，再点“补充 UI / API 文件”。',
        definition.executionPlan ? 'success' : '',
      );
    });
  };
}

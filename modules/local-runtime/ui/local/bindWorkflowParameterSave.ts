import { safeKey, suggestedBindingLabel } from './workflowManagerBindings';
import type { WorkflowDefinition, WorkflowManagerClient } from './workflowManagerClient';
import type { ManagerState } from './workflowManagerTypes';

export function bindWorkflowParameterSave(
  save: HTMLButtonElement,
  state: ManagerState,
  checkboxes: Map<string, HTMLInputElement>,
  aliasInputs: Map<string, HTMLInputElement>,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  syncCurrentCanvasNode: () => Promise<boolean>,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
) {
  save.addEventListener('click', () => {
    void runBusy('正在保存不可变参数版本…', async () => {
      const selected = state.candidates.filter((candidate) => checkboxes.get(candidate.id)?.checked);
      const previousBindingSetId = state.bindingSet?.id;
      state.bindingSet = await client.createBindingSet(state.selected!.id, {
        deploymentId: state.deployment!.id,
        ...(previousBindingSetId ? { previousBindingSetId } : {}),
        name: `画布参数 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
        bindings: selected.map((candidate) => ({
          candidateId: candidate.id,
          key: safeKey(candidate, state.candidates.indexOf(candidate)),
          label: aliasInputs.get(candidate.id)?.value.trim() || suggestedBindingLabel(candidate),
        })),
      });
      state.values = {};
      for (const binding of state.bindingSet.bindings) {
        if (binding.control.hasDefault) state.values[binding.key] = binding.control.defaultValue;
      }
      const syncedCanvasNode = await syncCurrentCanvasNode();
      if (state.attestation) {
        if (!syncedCanvasNode) {
          await client.createCanvasNode(state.selected!.id, {
            attestationId: state.attestation.id,
            bindingSetId: state.bindingSet.id,
            title: state.nodeTitle.trim() || state.selected!.name,
          });
        }
        await loadDeployedRecords();
        if (state.verifiedRun) {
          state.run = state.verifiedRun;
          state.outputCandidates = [...state.verifiedOutputCandidates];
          state.activeStage = 4;
          setNotice(`参数配置 r${state.bindingSet.revision} 已保存，无需重新测试；已返回部署结果。`, 'success');
        } else {
          state.activeStage = 2;
          setNotice(`参数配置 r${state.bindingSet.revision} 已保存，无需重新测试。`, 'success');
        }
        return;
      }
      state.verifiedRun = undefined;
      state.verifiedOutputCandidates = [];
      await loadDeployedRecords();
      state.activeStage = 2;
      setNotice(`参数配置 r${state.bindingSet.revision} 已保存；${syncedCanvasNode ? '当前画布节点已同步更新。' : '现在可直接加入画布。'}`, 'success');
    });
  });
}

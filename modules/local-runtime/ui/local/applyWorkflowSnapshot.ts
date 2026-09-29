import { currentStage,needsVariableAssetUpgrade } from './workflowManagerBindings';
import type { WorkflowEditorSnapshot } from './workflowManagerClient';
import { ManagerState,WorkflowManagerOptions } from './workflowManagerTypes';

export function applyWorkflowSnapshot(
  state: ManagerState,
  options: WorkflowManagerOptions,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
) {
  return (hydrated: WorkflowEditorSnapshot) => {
    const { definition } = hydrated;
    const sameDefinition = state.selected?.id === definition.id;
    state.selected = definition;
    if (!sameDefinition || !state.nodeTitle) {
      state.nodeTitle = options.initialNodeTitle?.trim() || definition.name;
    }
    state.deployment = hydrated.deployment || undefined;
    state.deploymentRunner = hydrated.deployment?.runner || 'local-comfyui';
    state.candidates = hydrated.candidates;
    state.bindingSet = hydrated.bindingSet || undefined;
    state.values = {};
    for (const binding of state.bindingSet?.bindings || []) {
      if (binding.control.hasDefault) state.values[binding.key] = binding.control.defaultValue;
    }
    state.attestation = hydrated.attestation || undefined;
    state.verifiedRun = hydrated.verifiedRun || undefined;
    state.verifiedOutputCandidates = [...hydrated.verifiedOutputCandidates];
    state.run = hydrated.verifiedRun || undefined;
    state.outputCandidates = [...hydrated.verifiedOutputCandidates];
    state.outputBindingSetId = hydrated.verifiedRun ? hydrated.outputBindingSet?.id : undefined;

    const usesMetadataOutput = hydrated.outputBindingSet?.outputs.some((output) =>
      hydrated.verifiedOutputCandidates.some(
        (candidate) =>
          (candidate.selectable === false || candidate.category === 'metadata') &&
          String(candidate.nodeId) === String(output.selector.nodeId) &&
          candidate.outputKey === output.selector.outputKey &&
          candidate.outputIndex === output.selector.outputIndex,
      ),
    );
    if (usesMetadataOutput) {
      state.attestation = undefined;
      state.outputBindingSetId = undefined;
      setNotice(
        '当前输出是动画状态标记，不是视频文件。请选择“视频文件”并重新确认；无需重新运行生成任务。',
        'error',
      );
    }

    if (needsVariableAssetUpgrade(state.bindingSet, state.candidates)) {
      state.attestation = undefined;
      state.verifiedRun = undefined;
      state.verifiedOutputCandidates = [];
      state.run = undefined;
      state.outputCandidates = [];
      state.activeStage = 2;
      setNotice('检测到可安全合并的动态素材口。请保存新配置并重新真实测试一次。');
    } else {
      state.activeStage = currentStage(state);
    }
  };
}

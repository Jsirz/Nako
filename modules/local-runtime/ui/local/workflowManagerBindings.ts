import type {
  BindingCandidate,
  BindingSet,
  WorkflowDefinition,
  WorkflowManagerClient,
} from './workflowManagerClient';
import { assetControlPresentation } from './workflowManagerControls';
import { ManagerState, StageIndex } from './workflowManagerTypes';
export function currentStage(state: ManagerState): StageIndex {
  if (!state.selected?.executionPlan) return 0;
  if (!state.deployment) return 1;
  if (!state.bindingSet) return 2;
  if (!state.run || state.run.status !== 'success') return 3;
  return 4;
}

export function stageReachable(state: ManagerState, stage: StageIndex) {
  if (stage === 0) return true;
  if (stage === 1) return Boolean(state.selected?.executionPlan);
  if (stage === 2) return Boolean(state.deployment);
  if (stage === 3) return Boolean(state.bindingSet);
  return state.run?.status === 'success';
}

export function safeKey(candidate: BindingCandidate, index: number) {
  const raw = `${candidate.fieldName}_${candidate.nodeId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return /^[a-zA-Z]/.test(raw) ? raw.slice(0, 64) : `input_${index + 1}`;
}

export function bindingForCandidate(
  bindingSet: BindingSet | undefined,
  candidate: BindingCandidate,
  candidateIndex: number,
) {
  const key = safeKey(candidate, candidateIndex);
  return bindingSet?.bindings.find((binding) => binding.key === key);
}

export function needsVariableAssetUpgrade(
  bindingSet: BindingSet | undefined,
  candidates: BindingCandidate[],
) {
  if (!bindingSet) return false;
  return candidates.some(
    (candidate) =>
      candidate.control === 'asset' &&
      Number(candidate.maximumItems || 1) > 1 &&
      !bindingForCandidate(bindingSet, candidate, candidates.indexOf(candidate)),
  );
}

export function suggestedBindingLabel(candidate: BindingCandidate) {
  const field = candidate.fieldName.toLocaleLowerCase('en-US');
  const identity = `${candidate.nodeTitle} ${candidate.classType} ${field}`.toLocaleLowerCase(
    'en-US',
  );
  const exactFieldNames: Record<string, string> = {
    aspect_ratio: '画面比例',
    batch_size: '生成数量',
    cfg: '提示词引导强度',
    duration: '生成时长',
    fps: '帧率',
    guidance: '提示词引导强度',
    height: '画面高度',
    megapixels: '分辨率',
    multiple: '尺寸倍数',
    noise_seed: '随机种子',
    seed: '随机种子',
    steps: '采样步数',
    width: '画面宽度',
  };
  if (candidate.control === 'asset') {
    return assetControlPresentation(candidate.mediaKind || 'image').label;
  }
  if (exactFieldNames[field]) return exactFieldNames[field];
  if (/negative/.test(identity) && /text|string|prompt/.test(identity)) return '反向提示词';
  if (/duration|seconds?|length/.test(identity)) return '生成时长';
  if (/prompt|input[ _-]?text|clip[ _-]?text/.test(identity)) return '提示词';
  if (/int[ _-]?constant/.test(identity)) return `整数参数（节点 ${candidate.nodeId}）`;
  if (/float[ _-]?constant/.test(identity)) return `小数参数（节点 ${candidate.nodeId}）`;
  if (/boolean|bool/.test(identity)) return `开关参数（节点 ${candidate.nodeId}）`;
  if (/select|combo/.test(identity)) return `选项参数（节点 ${candidate.nodeId}）`;
  if (/[㐀-鿿]/.test(candidate.nodeTitle)) return candidate.nodeTitle.trim();
  return `${candidate.nodeTitle} · ${candidate.fieldName}`;
}

export function quickBindingCandidates(candidates: BindingCandidate[]) {
  const promptFields = new Set(['prompt', 'positive_prompt', 'text']);
  return candidates.filter(
    (candidate) =>
      candidate.control === 'asset' ||
      promptFields.has(candidate.fieldName.trim().toLocaleLowerCase('en-US')),
  );
}

export function bindingSource(candidate?: BindingCandidate) {
  if (!candidate) return '';
  return `NODE ${candidate.nodeId} · ${candidate.classType}.${candidate.fieldName}`;
}

export function latestBindingDescendant(bindingSets: BindingSet[], rootBindingSetId: string) {
  const byId = new Map(bindingSets.map((item) => [item.id, item]));
  const descendsFromRoot = (candidate: BindingSet) => {
    const visited = new Set<string>();
    let cursor: BindingSet | undefined = candidate;
    while (cursor && !visited.has(cursor.id)) {
      if (cursor.id === rootBindingSetId) return true;
      visited.add(cursor.id);
      cursor = cursor.previousBindingSetId ? byId.get(cursor.previousBindingSetId) : undefined;
    }
    return false;
  };
  return [...bindingSets]
    .filter(descendsFromRoot)
    .sort((left, right) => right.revision - left.revision)[0];
}

export async function autoPair(client: WorkflowManagerClient, definition: WorkflowDefinition) {
  if (definition.executionPlan) return definition;
  const ui = definition.sourceArtifacts.find((artifact) => artifact.role === 'ui');
  const api = definition.sourceArtifacts.find((artifact) => artifact.role === 'api');
  if (!ui || !api) return definition;
  return (await client.pairArtifacts(definition.id, ui.id, api.id)).definition;
}

import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { createStableElement as element } from '../../../kernel/ui/dom';
import { browserServices } from '../../../kernel/browser';
import type {
  OutputCandidate,
  WorkflowDefinition,
  WorkflowManagerClient,
} from './workflowManagerClient';
import { button, field } from './workflowManagerControls';
import {
  automaticWorkflowCover,
  enrichVerifiedAssetValues,
  focusInsertedWorkflow,
} from './workflowManagerMetadata';
import { DeployedWorkflowRecord, ManagerState } from './workflowManagerTypes';

export function renderWorkflowOutputs(
  state: ManagerState,
  panel: HTMLDivElement,
  panelHeading: (title: string, copy: string, actions?: HTMLElement) => HTMLDivElement,
  createNodeTitleControl: () => HTMLInputElement,
  renderCleanupSummary: () => void,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
) {
  const complete = button(state.attestation ? '生成画布节点' : '确认输出并生成画布节点', 'primary');
  complete.classList.add('fwm-output-confirm');
  panel.append(
    panelHeading(
      '确定画布节点输出',
      '可以保留多个输出，但必须指定一个主输出。这里只引用已保存到当前项目的结果。',
      complete,
    ),
  );
  const nodeMeta = element('div', 'fwm-test-meta is-single');
  nodeMeta.append(field('画布节点名称', createNodeTitleControl()));
  panel.append(nodeMeta);
  renderCleanupSummary();
  const list = element('div', 'fwm-list');
  const selected = new Map<string, HTMLInputElement>();
  const primary = new Map<string, HTMLInputElement>();
  const outputDisplayName = (candidate: OutputCandidate) => {
    if (candidate.displayName) return candidate.displayName;
    if (candidate.kind === 'file' && candidate.mediaKind === 'video') return '视频文件';
    if (candidate.kind === 'file' && candidate.mediaKind === 'audio') return '音频文件';
    if (candidate.kind === 'file' && ['image', 'mask'].includes(candidate.mediaKind)) {
      return '图片文件';
    }
    return `${candidate.classType} · ${candidate.outputKey}`;
  };
  const resultCandidates = state.outputCandidates.filter(
    (candidate) => candidate.selectable !== false && candidate.category !== 'metadata',
  );
  const metadataCandidates = state.outputCandidates.filter(
    (candidate) => candidate.selectable === false || candidate.category === 'metadata',
  );
  resultCandidates.forEach((candidate, index) => {
    const keep = element('input', 'fwm-check');
    keep.type = 'checkbox';
    keep.checked = true;
    const main = element('input', 'fwm-check');
    main.type = 'radio';
    main.name = `fwm-primary-${state.run!.runId}`;
    main.checked = index === 0;
    selected.set(candidate.id, keep);
    primary.set(candidate.id, main);
    const info = element('div');
    info.append(
      element('span', 'fwm-row-title', outputDisplayName(candidate)),
      element(
        'span',
        'fwm-row-meta fwm-output-source',
        `类型：${candidate.mediaKind} · 来源：${candidate.classType} · NODE ${candidate.nodeId} / INDEX ${candidate.outputIndex}`,
      ),
    );
    const kind = element('span', 'fwm-chip', candidate.mediaKind);
    const row = element('div', 'fwm-row fwm-output');
    row.append(keep, main, info, kind);
    list.append(row);
  });
  if (!resultCandidates.length) {
    list.append(element('div', 'fwm-empty', '没有可绑定的文件、文本或结构化结果。'));
    if (!state.attestation) complete.disabled = true;
  }
  panel.append(list);
  if (metadataCandidates.length) {
    const advanced = element('details', 'fwm-output-metadata');
    const summary = element('summary', '', `高级元数据（${metadataCandidates.length}）`);
    const metadataList = element('div', 'fwm-output-metadata-list');
    metadataCandidates.forEach((candidate) => {
      const info = element('div');
      info.append(
        element('span', 'fwm-row-title', outputDisplayName(candidate)),
        element(
          'span',
          'fwm-row-meta fwm-output-source',
          `${candidate.outputKey}${candidate.valuePreview == null ? '' : `：${candidate.valuePreview}`} · ${candidate.description || '内部元数据，不作为画布输出'}`,
        ),
      );
      const kind = element('span', 'fwm-chip', '元数据');
      const row = element('div', 'fwm-row fwm-output-metadata-row');
      row.append(info, kind);
      metadataList.append(row);
    });
    advanced.append(summary, metadataList);
    panel.append(advanced);
  }
  complete.addEventListener('click', () => {
    void runBusy('正在确认输出并生成画布节点…', async () => {
      if (!state.attestation) {
        const outputs = resultCandidates.filter((candidate) => selected.get(candidate.id)?.checked);
        const primaryCandidate = outputs.find((candidate) => primary.get(candidate.id)?.checked);
        if (!outputs.length || !primaryCandidate) {
          throw localRuntimeError('请保留至少一个输出，并指定主输出。', 'confirmWorkflowOutputs');
        }
        const outputSet = await client.createOutputBindingSet(state.selected!.id, {
          sourceRunId: state.run!.runId,
          name: '画布输出',
          outputs: outputs.map((candidate, index) => ({
            candidateId: candidate.id,
            key: `output_${index + 1}`,
            label: outputDisplayName(candidate),
            primary: candidate.id === primaryCandidate.id,
          })),
        });
        state.outputBindingSetId = outputSet.id;
        state.attestation = await client.createAttestation(state.selected!.id, {
          runId: state.run!.runId,
          deploymentId: state.deployment!.id,
          bindingSetId: state.bindingSet!.id,
          outputBindingSetId: outputSet.id,
        });
        state.verifiedRun = state.run;
        state.verifiedOutputCandidates = [...state.outputCandidates];
        const completedRecord: DeployedWorkflowRecord = {
          definition: state.selected!,
          attestation: state.attestation,
          deployment: state.deployment,
          bindingSet: state.bindingSet,
          automaticCover: automaticWorkflowCover(state.run),
          verifiedRun: state.run,
          verifiedProjectId: state.projectId,
          verifiedValues: structuredClone(state.values),
        };
        await loadDeployedRecords();
        const completedIndex = state.deployedRecords.findIndex(
          (record) => record.attestation?.id === completedRecord.attestation?.id,
        );
        if (completedIndex >= 0) {
          state.deployedRecords[completedIndex] = {
            ...state.deployedRecords[completedIndex],
            ...completedRecord,
          };
        } else {
          state.deployedRecords.unshift(completedRecord);
        }
      }

      const blueprint = await client.createCanvasNode(state.selected!.id, {
        attestationId: state.attestation!.id,
        bindingSetId: state.bindingSet!.id,
        title: state.nodeTitle.trim() || state.selected!.name,
      });
      const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
      if (!adapter) throw localRuntimeError('画布节点适配器尚未加载，请刷新后重试。', 'confirmWorkflowOutputs');
      const verifiedRun = state.verifiedRun || state.run;
      if (verifiedRun?.status !== 'success' || !state.projectId) {
        throw localRuntimeError('找不到本次成功测试的输入和输出，请重新打开已验证记录。', 'confirmWorkflowOutputs');
      }
      const verifiedValues = await enrichVerifiedAssetValues(client, state.values);
      const insertion = await adapter.addToCanvas(blueprint, {
        run: verifiedRun,
        projectId: state.projectId,
        values: verifiedValues,
      });
      focusInsertedWorkflow(insertion.nodeIds);
      setNotice('本次输入、工作流和实际输出已加入画布，并已定位到节点组。', 'success');
    });
  });
  if (state.attestation) {
    const proof = element('div', 'fwm-proof');
    proof.append(
      document.createTextNode('验证通过 · 凭证 '),
      element('code', '', state.attestation.attestationHash.slice(0, 16)),
      document.createTextNode('…  配置和输出已锁定。'),
    );
    panel.append(proof);
  }
}

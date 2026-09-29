import type {
  WorkflowCanvasNodeRecord,
  WorkflowCanvasOutputValue,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type {
  WorkflowCanvasBlueprint,
  WorkflowCanvasMediaKind,
  WorkflowRun,
} from './workflowManagerClient';

import { outputPorts, workflowErrorSummary } from './workflowNodePresentation';
import type { NodePatch } from './workflowNodeTypes';

export const TERMINAL_STATUSES = new Set(['success', 'failed', 'cancelled', 'unknown']);

export function publishExternalOutputs(node: WorkflowCanvasNodeRecord, run: WorkflowRun): void {
  if (run.status !== 'success') return;
  const outputs = receiptOutputs(node, run);
  if (outputs.length === 0) return;
  const ports =
    node.workflowRef?.verificationStatus === 'draft' ? draftOutputPorts(run) : outputPorts(node);
  window.dispatchEvent(
    new CustomEvent('nako:add-workflow-output-nodes', {
      detail: {
        sourceNodeId: node.id,
        sourceTitle: node.title,
        sourceX: node.x,
        sourceY: node.y,
        sourceWidth: node.width,
        runId: run.runId,
        outputs: outputs.map((output) => ({
          ...output,
          portIndex: Math.max(
            0,
            ports.findIndex((port) => port.id === output.portId),
          ),
        })),
      },
    }),
  );
}

export function publishRunProgress(node: WorkflowCanvasNodeRecord, run: WorkflowRun): void {
  window.dispatchEvent(
    new CustomEvent('nako:workflow-run-progress', {
      detail: {
        runId: run.runId,
        title: node.title,
        status: run.status,
        phase: run.phase,
        currentNodeId: run.currentNodeId,
        progress: run.progress,
        realtimeChannel: run.realtimeChannel,
      },
    }),
  );
}

export function receiptOutputs(
  node: WorkflowCanvasNodeRecord,
  run: WorkflowRun,
): WorkflowCanvasOutputValue[] {
  const candidates = Array.isArray(run.receipt?.outputs) ? run.receipt.outputs : [];
  const ports =
    node.workflowRef?.verificationStatus === 'draft' ? draftOutputPorts(run) : outputPorts(node);
  return ports.flatMap((port) => {
    const candidate =
      candidates.find((raw) => String(raw.portId) === port.id) ||
      candidates.find(
        (raw) =>
          String(raw.nodeId) === String(port.selector.nodeId) &&
          String(raw.outputKey) === String(port.selector.outputKey) &&
          Number(raw.outputIndex) === Number(port.selector.outputIndex) &&
          String(raw.mediaKind) === port.mediaKind,
      );
    if (!candidate) return [];
    return [
      {
        portId: port.id,
        label: port.label,
        mediaKind: port.mediaKind,
        primary: port.primary,
        ...(typeof candidate.assetId === 'string' ? { assetId: candidate.assetId } : {}),
        ...(typeof candidate.url === 'string' ? { url: candidate.url } : {}),
        ...(Object.hasOwn(candidate, 'value') ? { value: candidate.value } : {}),
        ...(typeof candidate.sha256 === 'string' ? { sha256: candidate.sha256 } : {}),
        ...(typeof candidate.bytes === 'number' ? { bytes: candidate.bytes } : {}),
      },
    ];
  });
}

export function draftOutputPorts(run: WorkflowRun): WorkflowCanvasBlueprint['outputPorts'] {
  const candidates = Array.isArray(run.receipt?.outputs) ? run.receipt.outputs : [];
  const labels: Record<WorkflowCanvasMediaKind, string> = {
    image: '图片结果',
    mask: '遮罩结果',
    video: '视频结果',
    audio: '音频结果',
    text: '文字结果',
    json: '数据结果',
  };
  return candidates
    .flatMap((candidate, index) => {
      const mediaKind = String(candidate.mediaKind || '') as WorkflowCanvasMediaKind;
      if (!['image', 'mask', 'video', 'audio', 'text', 'json'].includes(mediaKind)) return [];
      const outputKey = String(candidate.outputKey || 'output');
      return [
        {
          id: `draft_output_${index + 1}`,
          label: labels[mediaKind],
          mediaKind,
          primary: index === 0,
          portIndex: index,
          selector: {
            nodeId: String(candidate.nodeId || ''),
            outputKey,
            outputIndex: Number(candidate.outputIndex || 0),
          },
        },
      ];
    })
    .map((port, index) => ({ ...port, primary: index === 0, portIndex: index }));
}

export function runPatch(node: WorkflowCanvasNodeRecord, run: WorkflowRun): NodePatch {
  const executionState = {
    status: run.phase === 'observation-paused' ? 'observing-paused' : run.status,
    runId: run.runId,
    phase: run.phase,
    code: run.code,
    remoteMayContinue: Boolean(run.remoteMayContinue),
    currentNodeId: run.currentNodeId,
    progress: run.progress,
    realtimeChannel: run.realtimeChannel,
    cachedNodeIds: run.cachedNodeIds,
    inputCleanup: run.inputCleanup,
    resolvedSeeds: run.resolvedSeeds,
    seedAdvancements: run.seedAdvancements,
    updatedAt: Date.now(),
  };
  if (run.status === 'loading') {
    return {
      status: 'loading',
      executionState,
      errorMessage:
        run.phase === 'observation-paused'
          ? '观察窗口已结束，任务仍可能在运行。可继续查询原任务。'
          : undefined,
      errorSummary: run.phase === 'observation-paused' ? '任务查询已暂停' : undefined,
      isWorkflowErrorDetailsOpen: false,
    };
  }
  if (run.status === 'success') {
    const discoveredPorts =
      node.workflowRef?.verificationStatus === 'draft' ? draftOutputPorts(run) : undefined;
    const outputs = receiptOutputs(node, run);
    const primary = outputs.find((output) => output.primary) || outputs[0];
    const urls = outputs.flatMap((output) => (output.url ? [output.url] : []));
    const text = typeof primary?.value === 'string' ? primary.value : undefined;
    const previous = Array.isArray(node.resultHistory) ? node.resultHistory : [];
    const belongsToRun = (entry: Record<string, unknown>) =>
      entry.id === run.runId || entry.generationId === run.runId;
    const existing = previous.find(belongsToRun);
    const entry = {
      ...existing,
      id: run.runId,
      generationId: run.runId,
      mediaType: primary?.mediaKind,
      url: primary?.url,
      urls,
      text,
      completedAt: existing?.completedAt ?? Date.now(),
      outputs,
    };
    let written = false;
    const history = previous.flatMap((candidate) => {
      if (!belongsToRun(candidate)) return [candidate];
      if (written) return [];
      written = true;
      return [entry];
    });
    if (!written) history.push(entry);
    return {
      status: 'success',
      executionState,
      ...(discoveredPorts ? { outputPorts: discoveredPorts } : {}),
      workflowOutputs: outputs,
      resultUrl: primary?.url,
      resultUrls: urls,
      resultText: text,
      resultHistory: history.slice(-20),
      errorMessage: undefined,
      errorSummary: undefined,
      isWorkflowErrorDetailsOpen: false,
    };
  }
  const errorMessage =
    run.error ||
    (run.status === 'unknown'
      ? '工作流运行结果暂时无法确认，请检查远端任务状态。'
      : '工作流运行失败。');
  return {
    status: run.status === 'cancelled' ? 'cancelled' : 'error',
    executionState,
    errorMessage,
    errorSummary: workflowErrorSummary(errorMessage),
    isWorkflowErrorDetailsOpen: false,
  };
}

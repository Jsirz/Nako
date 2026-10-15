import path from 'node:path';
import { RunningHubWorkflowExecutorError } from '../../../contracts/workflowProtocols.js';
import { MediaArtifactError } from '../../../contracts/mediaDelivery.js';
import { mediaRuntime } from '../../../kernel/server.js';
const resolveMediaArtifact = (...args) => mediaRuntime().resolveArtifact(...args);
const MAX_OUTPUTS = 1_000;

function runningHubMediaArtifact(fileType, filename) {
  try {
    return resolveMediaArtifact({ filename, declaredType: fileType });
  } catch (error) {
    if (!(error instanceof MediaArtifactError)) throw error;
    throw new RunningHubWorkflowExecutorError(
      'RunningHub 返回了不支持的输出类型',
      'OUTPUT_TYPE_UNSUPPORTED',
      409,
    );
  }
}

function filenameForOutput(item, index) {
  let filename;
  try {
    filename = path.posix.basename(new URL(String(item?.fileUrl || '')).pathname);
  } catch {
    throw new RunningHubWorkflowExecutorError(
      'RunningHub 输出地址无效',
      'RUNNINGHUB_OUTPUT_URL_INVALID',
      502,
    );
  }
  if (!path.extname(filename)) {
    const artifact = runningHubMediaArtifact(item?.fileType, filename);
    filename = `runninghub-output-${index + 1}${artifact.extension}`;
  }
  if (!filename || filename.length > 240 || /[\0\r\n\\]/.test(filename)) {
    throw new RunningHubWorkflowExecutorError(
      'RunningHub 输出文件名无效',
      'OUTPUT_REFERENCE_INVALID',
      502,
    );
  }
  return filename;
}

export function normalizeRunningHubOutputs(
  outputs,
  executionPlan,
  { defaultNodeId = '', forceDefaultNodeId = false } = {},
) {
  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new RunningHubWorkflowExecutorError(
      'RunningHub 任务成功但没有可用输出',
      'OUTPUT_NOT_FOUND',
      409,
    );
  }
  if (outputs.length > MAX_OUTPUTS) {
    throw new RunningHubWorkflowExecutorError(
      'RunningHub 输出候选超过 1000 项',
      'OUTPUT_CANDIDATE_LIMIT',
      413,
    );
  }
  const counters = new Map();
  return outputs.map((item, index) => {
    const nodeId = String(
      forceDefaultNodeId ? defaultNodeId : (item?.nodeId || defaultNodeId || ''),
    ).trim();
    const node = executionPlan[nodeId];
    if (!node) {
      throw new RunningHubWorkflowExecutorError(
        'RunningHub 输出引用了执行计划外的节点',
        'OUTPUT_REFERENCE_INVALID',
        409,
      );
    }
    const filename = filenameForOutput(item, index);
    const kind = runningHubMediaArtifact(item?.fileType, filename).kind;
    const outputKey = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'audio';
    const counterKey = `${nodeId}:${outputKey}`;
    const outputIndex = counters.get(counterKey) || 0;
    counters.set(counterKey, outputIndex + 1);
    return {
      nodeId,
      classType: node.class_type,
      outputKey,
      outputIndex,
      mediaKind: kind,
      kind: 'file',
      handle: { url: String(item.fileUrl), filename },
    };
  });
}


import { declaredNodeOutput } from '../../../contracts/nodeValues.js';
import type {
  RunningHubInstanceType,
  WorkflowCanvasBlueprint,
  WorkflowCanvasMediaKind,
} from './workflowManagerClient';

import type { CanvasNode } from './workflowNodeTypes';

export const TYPE_MEDIA: Readonly<Record<string, WorkflowCanvasMediaKind>> = {
  Text: 'text',
  Image: 'image',
  Mask: 'mask',
  Video: 'video',
  Audio: 'audio',
  'Upload Image': 'image',
  'Upload Video': 'video',
  'Upload Audio': 'audio',
};

export const WORKFLOW_MEDIA_KIND_LABELS: Readonly<Record<WorkflowCanvasMediaKind, string>> = {
  image: '图像',
  mask: '遮罩',
  video: '视频',
  audio: '音频',
  text: '文字',
  json: '数据',
};

export function workflowMediaKindLabel(mediaKind: WorkflowCanvasMediaKind): string {
  return WORKFLOW_MEDIA_KIND_LABELS[mediaKind];
}

export function workflowErrorSummary(value: unknown): string {
  const message = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!message) return '工作流运行失败';
  if (/(?:显存不足|显存耗尽|out\s*of\s*memory|cuda[^。.!?]{0,40}memory|\bvram\b)/i.test(message)) {
    return '显存不足';
  }
  if (
    /(?:内容[^。.!?]{0,20}(?:审核|验证).*失败|content verification failed|nsfw|safety check)/i.test(
      message,
    )
  ) {
    return '内容未通过审核';
  }
  if (/(?:余额不足|insufficient (?:funds|balance)|not enough wallet)/i.test(message))
    return '余额不足';
  if (/(?:超时|timed? out|timeout)/i.test(message)) return '任务执行超时';
  if (
    /(?:认证失败|api[ _-]?key[^。.!?]{0,24}(?:无效|失效|unauthor)|unauthori[sz]ed)/i.test(message)
  ) {
    return 'RunningHub 认证失败';
  }
  if (/(?:上传[^。.!?]{0,20}失败|upload failed)/i.test(message)) return '素材上传失败';
  if (/(?:网络|连接失败|fetch failed|econn|transport)/i.test(message)) return '网络连接失败';
  if (
    /(?:工作流[^。.!?]{0,20}(?:校验|配置).*失败|node info error|invalid node|参数错误)/i.test(
      message,
    )
  ) {
    return '工作流配置错误';
  }
  const firstClause = message
    .split(/[：:；;。.!?]/, 1)[0]
    .replace(/^RunningHub\s*/i, '')
    .trim();
  return firstClause.length > 18 ? `${firstClause.slice(0, 18)}…` : firstClause || '工作流运行失败';
}

export function canvasRunningHubInstanceType(value: unknown): RunningHubInstanceType {
  return String(value || '').toLowerCase() === 'default' ? 'default' : 'plus';
}

export function finiteNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

export function inputPorts(node: CanvasNode): WorkflowCanvasBlueprint['inputPorts'] {
  return Array.isArray(node.inputPorts)
    ? node.inputPorts.filter(
        (port): port is WorkflowCanvasBlueprint['inputPorts'][number] =>
          Boolean(port) &&
          typeof port === 'object' &&
          typeof (port as { id?: unknown }).id === 'string',
      )
    : [];
}

export function outputPorts(node: CanvasNode): WorkflowCanvasBlueprint['outputPorts'] {
  return Array.isArray(node.outputPorts)
    ? node.outputPorts.filter(
        (port): port is WorkflowCanvasBlueprint['outputPorts'][number] =>
          Boolean(port) &&
          typeof port === 'object' &&
          typeof (port as { id?: unknown }).id === 'string',
      )
    : [];
}

export function parameterSchema(node: CanvasNode): WorkflowCanvasBlueprint['parameterSchema'] {
  return Array.isArray(node.parameterSchema)
    ? node.parameterSchema.filter(
        (parameter): parameter is WorkflowCanvasBlueprint['parameterSchema'][number] =>
          Boolean(parameter) &&
          typeof parameter === 'object' &&
          typeof (parameter as { key?: unknown }).key === 'string',
      )
    : [];
}

export function isTextParameter(
  parameter: WorkflowCanvasBlueprint['parameterSchema'][number],
): boolean {
  return ['text', 'textarea', 'string', 'prompt', 'multiline'].includes(
    String(parameter.control?.kind || '').toLowerCase(),
  );
}

export function isCloudWorkflowNode(node: CanvasNode): boolean {
  return (
    node.executionTarget === 'cloud' ||
    (!node.executionTarget && /runninghub/i.test(String(node.subtitle || '')))
  );
}

export function mediaKindForNode(
  node: CanvasNode,
  sourcePortIndex = 0,
): WorkflowCanvasMediaKind | undefined {
  const declared = declaredNodeOutput(node, sourcePortIndex);
  if (declared) return declared.kind as WorkflowCanvasMediaKind;
  if (node.kind === 'workflow') {
    const ports = outputPorts(node);
    return (
      ports[sourcePortIndex]?.mediaKind ||
      ports.find((port) => port.primary)?.mediaKind ||
      ports[0]?.mediaKind
    );
  }
  return TYPE_MEDIA[node.type];
}

export function mediaKindsCompatible(
  source: WorkflowCanvasMediaKind | undefined,
  target: WorkflowCanvasMediaKind,
): boolean {
  return source === target || (source === 'image' && target === 'mask');
}

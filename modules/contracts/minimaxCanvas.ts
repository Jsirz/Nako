import type { MiniMaxH3Mode, VideoWorkflowRequest } from './videoWorkflowUi';
export type { MiniMaxH3Mode } from './videoWorkflowUi';
export interface MiniMaxH3CanvasNode {
  id: string;
  type: string;
  parentIds?: string[];
  minimaxH3Mode?: MiniMaxH3Mode;
  inlinePrompt?: string;
  textContent?: string;
  prompt?: string;
  resultUrl?: string;
  url?: string;
  dataUrl?: string;
  aspectRatio?: string;
  megapixels?: number;
  duration?: number;
  seed?: number;
  [key: string]: unknown;
}

export interface MiniMaxH3VisualPort {
  id: 'text' | 'firstFrame' | 'lastFrame' | 'referenceImage' | 'referenceVideo' | 'referenceAudio';
  label: string;
  portIndex: number;
  y: number;
  media: 'text' | 'image' | 'video' | 'audio';
  connected: number;
  maximum: number;
}

export const MINIMAX_H3_DURATION = Object.freeze({
  minSeconds: 3,
  maxSeconds: 15,
  defaultSeconds: 5,
  fps: 24,
  // 官方节点标注的训练区间：124~362 帧。超出这个范围模型没训过，画质不保证。
  trainedMinFrames: 124,
  trainedMaxFrames: 362,
});

export interface MiniMaxH3DurationInfo {
  requestedSeconds: number;
  frames: number;
  actualSeconds: number;
  belowTrainedRange: boolean;
  aboveTrainedRange: boolean;
  summary: string;
  warning: string;
}

export const MINIMAX_H3_MODE_OPTIONS: ReadonlyArray<{
  value: MiniMaxH3Mode;
  label: string;
  description: string;
}> = Object.freeze([
  { value: 't2va', label: '文生音视频', description: '仅根据提示词生成画面与原生音频' },
  { value: 'i2va', label: '首帧生音视频', description: '以一张图片作为视频第一帧' },
  { value: 'fl2va', label: '首尾帧生音视频', description: '分别约束视频的第一帧和最后一帧' },
  { value: 'l2va', label: '尾帧生音视频', description: '以一张图片约束视频最后一帧' },
  { value: 'ref2va', label: '参考生音视频', description: '引用图片、视频或音频控制内容' },
]);

export interface MiniMaxH3CanvasAdapter {
  readonly modes: typeof MINIMAX_H3_MODE_OPTIONS;
  readonly inputCount: number;
  readonly duration: typeof MINIMAX_H3_DURATION;
  describeDuration(seconds: number): MiniMaxH3DurationInfo;
  getModeLabel(nodeOrMode: MiniMaxH3CanvasNode | MiniMaxH3Mode): string;
  getVisualPorts(node: MiniMaxH3CanvasNode): MiniMaxH3VisualPort[];
  getPortY(node: MiniMaxH3CanvasNode, portIndex?: number): number;
  isConnectionAllowed(
    node: MiniMaxH3CanvasNode,
    sourceNode?: MiniMaxH3CanvasNode | null,
    portIndex?: number,
  ): boolean;
  resolvePortIndex(
    node: MiniMaxH3CanvasNode,
    relativeY: number,
    sourceNode?: MiniMaxH3CanvasNode | null,
  ): number;
  remapParentIds(
    parentIds: readonly string[],
    fromMode: MiniMaxH3Mode,
    toMode: MiniMaxH3Mode,
  ): string[];
  buildRequest(
    nodes: readonly MiniMaxH3CanvasNode[],
    node: MiniMaxH3CanvasNode,
    projectId: string,
  ): VideoWorkflowRequest;
}

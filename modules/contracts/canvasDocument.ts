/** Persisted canvas connectivity shared by project, generation, media and agent services. */
export interface CanvasConnectionNode {
  id: string;
  type: string;
  parentIds?: string[];
  sourcePortIndices?: number[];
  inputLinks?: Array<{ sourceNodeId: string; sourcePortId: string; targetPortId: string }>;
  parameterValues?: Record<string, unknown>;
  imageMode?: string;
  imageModel?: string;
  midjourneyReferenceNodeIds?: Partial<Record<'cref' | 'sref' | 'dref', string>>;
  aspectRatio?: string;
  resultAspectRatio?: string;
  [key: string]: unknown;
}
export interface CanvasNode extends CanvasConnectionNode {
  x: number;
  y: number;
  groupId?: string;
  kind?: string;
  comfyMode?: string;
  videoModel?: string;
  videoMode?: string;
}
export interface CanvasGroup {
  id: string;
  nodeIds: string[];
  label: string;
  [key: string]: unknown;
}

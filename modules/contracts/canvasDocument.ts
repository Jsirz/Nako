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
  /** Local cached analysis run; cleared when copying or importing a graph. */
  nodeAnalysisRunId?: string;
  /** Explicit start intent, consumed on completion; never carried into copied/imported graphs. */
  nodeDirectRunRequestId?: string;
  shotAnalysisResultId?: string;
  shotAnalysisShotId?: string;
  shotAnalysisNodeId?: string;
  replicaReplacements?: Record<string, import('./videoReplica.js').ReplicaReplacement>;
  replicaAssetResultId?: string;
  replicaRequirements?: string;
  replicaAspectRatio?: string;
  replicaResolution?: string;
  replicaPlan?: import('./videoReplica.js').VideoReplicaPlan;
  replicaSourceNodeId?: string;
  replicaPlanId?: string;
  replicaShotId?: string;
}
export interface CanvasGroup {
  id: string;
  nodeIds: string[];
  label: string;
  [key: string]: unknown;
}

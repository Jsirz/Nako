export type VideoWorkflowType = 'minimax-h3-t2va';

export type MiniMaxH3Mode = 't2va' | 'i2va' | 'fl2va' | 'l2va' | 'ref2va';

export type VideoWorkflowRequest = {
  projectId: string;
  nodeId?: string;
  text: string;
  mode: MiniMaxH3Mode;
  imageUrl?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
  aspectRatio: string;
  megapixels: number;
  duration: number;
  seed?: number;
  operationId?: string;
};

export type VideoCapability = {
  workflowType: VideoWorkflowType;
  title: string;
  category: 'minimax-h3';
  outputType: 'videos';
  requiredInputs: string[];
};

export type VideoWorkflowResult =
  | { status: 'running'; operationId: string }
  | { status: 'unknown' | 'error'; operationId: string; error?: string }
  | { status: 'success'; operationId: string; success: true; url: string; asset?: Record<string, unknown> };

export interface VideoWorkflowClient {
  getCapabilities(): Promise<VideoCapability[]>;
  run(workflowType: VideoWorkflowType, request: VideoWorkflowRequest): Promise<VideoWorkflowResult>;
  getOperation(workflowType: VideoWorkflowType, projectId: string, operationId: string): Promise<VideoWorkflowResult>;
}

import type { GenerationMediaMetadata } from './generationUi';
import type { CanvasNode } from './canvasDocument';
import type { AdaptiveMediaNode } from './mediaNodeSizing';
import type { MediaDownloadFileNameAdapter } from './mediaDownloads';
import type { MiniMaxH3CanvasAdapter } from './minimaxCanvas';
import type { VideoWorkflowClient } from './videoWorkflowUi';
import type { ImageAngle } from './imageAngle';
import type { CatalogModel } from './modelCatalog';

export interface ImageDraftRuntime {
  create(type: string, point: { x: number; y: number }, projectId: string): CanvasNode;
  configure(nodes: CanvasNode[], id: string, patch: Partial<CanvasNode>): CanvasNode[];
  connect(nodes: CanvasNode[], sourceId: string, targetId: string): CanvasNode[];
  width(node: CanvasNode): number;
}
export interface CanvasImageUpscaleBinding {
  projectId: string;
  getNodes(): CanvasNode[];
  isActive(): boolean;
  setNodes(value: CanvasNode[] | ((nodes: CanvasNode[]) => CanvasNode[])): void;
  select(ids: string[]): void;
}

export interface AnnotationPoint { x: number; y: number }
export type AnnotationTool = 'brush' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'eraser';
export interface AnnotationStroke {
  tool: AnnotationTool; color: string; size: number; opacity: number; arrowHead?: number; points: AnnotationPoint[];
}
export interface CollageItem {
  naturalWidth: number; naturalHeight: number; centerX: number; centerY: number; visualHeight: number;
}
export interface MediaCanvasService {
  classify(file: Pick<File, 'name' | 'size'>): 'image' | 'video' | 'audio';
  uploadFile(file: File, projectId?: string | null, nodeId?: string | null, signal?: AbortSignal): Promise<string>;
  uploadData(data: string, kind?: 'image' | 'video' | 'audio', prompt?: string, projectId?: string | null, signal?: AbortSignal): Promise<string>;
  inspectImage(url: string, timeoutMs?: number): Promise<GenerationMediaMetadata>;
  inspectVideo(url: string, timeoutMs?: number, includeLastFrame?: boolean): Promise<GenerationMediaMetadata>;
  loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement>;
  collage(items: Array<CollageItem & { image: HTMLImageElement }>): { data: string; width: number; height: number };
  drawStroke(context: CanvasRenderingContext2D, stroke: AnnotationStroke): void;
  renderAnnotations(canvas: HTMLCanvasElement, strokes: AnnotationStroke[], source: { width: number; height: number }): void;
  nodeSize(node: AdaptiveMediaNode): { width: number; height: number } | undefined;
  isResizable(node: AdaptiveMediaNode): boolean;
  videoAspectRatio(node: AdaptiveMediaNode): number;
  extractVideoLastFrame(url: string): Promise<string | null>;
  downloads(): MediaDownloadFileNameAdapter;
  miniMax(): MiniMaxH3CanvasAdapter;
  createVideoWorkflowClient(fetcher?: typeof fetch): VideoWorkflowClient;
  imageToolModel(): CatalogModel | undefined;
  imageAngleDraft(nodes: CanvasNode[], sourceId: string, angle: ImageAngle | null, projectId: string,
    runtime: ImageDraftRuntime): { nodes: CanvasNode[]; id: string };
  createUpscale(binding: CanvasImageUpscaleBinding): { dispose(): void; start(sourceId: string): Promise<void> };
}
